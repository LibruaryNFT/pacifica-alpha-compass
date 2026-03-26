"""
Candle Collector — builds OHLCV candles from Pacifica trade stream.

Pacifica has no candle REST endpoint. This service:
1. Connects to wss://ws.pacifica.fi/ws for live trades
2. Polls REST /trades endpoint for backfill
3. Aggregates trades into 1m/5m/1h OHLCV candles
4. Stores in SQLite for backtesting and Alpha Score

Designed to run as a background asyncio task inside the FastAPI app.
"""

import asyncio
import json
import logging
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

DB_PATH = Path(os.getenv("CANDLE_DB_PATH", "data/candles.db"))
PACIFICA_API = os.getenv("PACIFICA_API_URL", "https://api.pacifica.fi/api/v1")
PACIFICA_WS = "wss://ws.pacifica.fi/ws"
SYMBOLS = ["BTC", "ETH", "SOL", "DOGE", "ARB", "AVAX", "LINK", "OP"]
INTERVALS = [60, 300, 3600]  # 1m, 5m, 1h in seconds


def _init_db() -> sqlite3.Connection:
    """Initialize SQLite database for candle storage."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")

    conn.execute("""
        CREATE TABLE IF NOT EXISTS trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            price REAL NOT NULL,
            amount REAL NOT NULL,
            side TEXT NOT NULL,
            timestamp_ms INTEGER NOT NULL,
            UNIQUE(symbol, timestamp_ms, price, amount)
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS candles (
            symbol TEXT NOT NULL,
            interval_s INTEGER NOT NULL,
            bucket_start INTEGER NOT NULL,
            open REAL NOT NULL,
            high REAL NOT NULL,
            low REAL NOT NULL,
            close REAL NOT NULL,
            volume REAL NOT NULL,
            trade_count INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (symbol, interval_s, bucket_start)
        )
    """)

    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_trades_symbol_ts
        ON trades(symbol, timestamp_ms)
    """)
    conn.execute("""
        CREATE INDEX IF NOT EXISTS idx_candles_lookup
        ON candles(symbol, interval_s, bucket_start)
    """)

    conn.commit()
    return conn


# Global DB connection (initialized lazily)
_db: Optional[sqlite3.Connection] = None


def _get_db() -> sqlite3.Connection:
    global _db
    if _db is None:
        _db = _init_db()
    return _db


def store_trade(symbol: str, price: float, amount: float, side: str, timestamp_ms: int) -> None:
    """Store a single trade and update affected candle buckets."""
    db = _get_db()
    try:
        db.execute(
            "INSERT OR IGNORE INTO trades (symbol, price, amount, side, timestamp_ms) VALUES (?, ?, ?, ?, ?)",
            (symbol, price, amount, side, timestamp_ms),
        )
    except sqlite3.IntegrityError:
        return  # Duplicate trade

    # Update candle buckets for each interval
    ts_s = timestamp_ms / 1000.0
    for interval in INTERVALS:
        bucket = int(ts_s // interval) * interval
        _update_candle_bucket(db, symbol, interval, bucket, price, amount)

    db.commit()


def _update_candle_bucket(
    db: sqlite3.Connection,
    symbol: str,
    interval_s: int,
    bucket_start: int,
    price: float,
    amount: float,
) -> None:
    """Update or create a candle bucket with a new trade."""
    row = db.execute(
        "SELECT open, high, low, close, volume, trade_count FROM candles WHERE symbol=? AND interval_s=? AND bucket_start=?",
        (symbol, interval_s, bucket_start),
    ).fetchone()

    if row:
        _, high, low, _, volume, count = row
        db.execute(
            """UPDATE candles SET high=?, low=?, close=?, volume=?, trade_count=?
               WHERE symbol=? AND interval_s=? AND bucket_start=?""",
            (max(high, price), min(low, price), price, volume + amount, count + 1, symbol, interval_s, bucket_start),
        )
    else:
        db.execute(
            "INSERT INTO candles (symbol, interval_s, bucket_start, open, high, low, close, volume, trade_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (symbol, interval_s, bucket_start, price, price, price, price, amount, 1),
        )


def get_candles(symbol: str, interval_s: int = 3600, limit: int = 500) -> list[dict]:
    """Retrieve stored candles for a symbol."""
    db = _get_db()
    full_symbol = symbol if "-" in symbol else f"{symbol}-USDC"
    # Try both formats
    rows = db.execute(
        """SELECT bucket_start, open, high, low, close, volume, trade_count
           FROM candles WHERE symbol=? AND interval_s=?
           ORDER BY bucket_start DESC LIMIT ?""",
        (full_symbol, interval_s, limit),
    ).fetchall()

    if not rows:
        # Try short symbol
        short = symbol.replace("-USDC", "")
        rows = db.execute(
            """SELECT bucket_start, open, high, low, close, volume, trade_count
               FROM candles WHERE symbol=? AND interval_s=?
               ORDER BY bucket_start DESC LIMIT ?""",
            (short, interval_s, limit),
        ).fetchall()

    candles = []
    for row in reversed(rows):  # Oldest first
        bucket_start, o, h, l, c, v, tc = row
        candles.append(
            {
                "timestamp": datetime.fromtimestamp(bucket_start, tz=timezone.utc).isoformat(),
                "t": bucket_start * 1000,
                "open": o,
                "high": h,
                "low": l,
                "close": c,
                "volume": v,
                "trade_count": tc,
            }
        )
    return candles


def get_stats() -> dict:
    """Get collection stats."""
    db = _get_db()
    trade_count = db.execute("SELECT COUNT(*) FROM trades").fetchone()[0]
    candle_count = db.execute("SELECT COUNT(*) FROM candles").fetchone()[0]

    symbols = db.execute("SELECT DISTINCT symbol FROM trades").fetchall()
    symbol_list = [s[0] for s in symbols]

    # Time range per symbol
    ranges = {}
    for sym in symbol_list:
        row = db.execute(
            "SELECT MIN(timestamp_ms), MAX(timestamp_ms), COUNT(*) FROM trades WHERE symbol=?",
            (sym,),
        ).fetchone()
        if row and row[0]:
            span_h = (row[1] - row[0]) / 1000 / 3600
            ranges[sym] = {
                "trade_count": row[2],
                "hours": round(span_h, 1),
                "first": datetime.fromtimestamp(row[0] / 1000, tz=timezone.utc).isoformat(),
                "last": datetime.fromtimestamp(row[1] / 1000, tz=timezone.utc).isoformat(),
            }

    return {
        "total_trades": trade_count,
        "total_candles": candle_count,
        "symbols": ranges,
        "db_path": str(DB_PATH),
        "db_size_mb": round(DB_PATH.stat().st_size / 1024 / 1024, 2) if DB_PATH.exists() else 0,
    }


# --- Background tasks ---


async def _poll_rest_trades() -> None:
    """Poll Pacifica REST /trades endpoint for each symbol. Runs every 30s."""
    while True:
        for symbol in SYMBOLS:
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    resp = await client.get(
                        f"{PACIFICA_API}/trades",
                        params={"symbol": symbol, "limit": 200},
                    )
                    if resp.status_code != 200:
                        continue
                    data = resp.json()
                    trades = data.get("data", [])
                    count = 0
                    for t in trades:
                        price = float(t.get("price", 0))
                        amount = float(t.get("amount", 0))
                        ts_ms = int(t.get("created_at", 0))
                        side = t.get("side", "unknown")
                        if price > 0 and amount > 0 and ts_ms > 0:
                            store_trade(f"{symbol}-USDC", price, amount, side, ts_ms)
                            count += 1
                    if count > 0:
                        logger.debug(f"REST poll: stored {count} trades for {symbol}")
            except Exception as e:
                logger.warning(f"REST poll failed for {symbol}: {e}")
        await asyncio.sleep(30)


async def _connect_websocket() -> None:
    """Connect to Pacifica WebSocket for real-time trades."""
    try:
        import websockets
    except ImportError:
        logger.warning("websockets not installed — skipping WS collector, using REST only")
        return

    while True:
        try:
            async with websockets.connect(PACIFICA_WS, ping_interval=30) as ws:
                logger.info("WebSocket connected to Pacifica")
                # Subscribe to all symbols
                for symbol in SYMBOLS:
                    await ws.send(
                        json.dumps(
                            {
                                "method": "subscribe",
                                "params": {"source": "trades", "symbol": symbol},
                            }
                        )
                    )

                async for raw_msg in ws:
                    try:
                        msg = json.loads(raw_msg)
                        if msg.get("channel") != "trades":
                            continue
                        for t in msg.get("data", []):
                            price = float(t.get("p", 0))
                            amount = float(t.get("a", 0))
                            ts_ms = int(t.get("t", 0))
                            symbol = t.get("s", "")
                            side = t.get("d", "unknown")
                            if price > 0 and amount > 0 and ts_ms > 0 and symbol:
                                store_trade(f"{symbol}-USDC", price, amount, side, ts_ms)
                    except (json.JSONDecodeError, KeyError, ValueError):
                        continue

        except Exception as e:
            logger.warning(f"WebSocket error: {e} — reconnecting in 5s")
            await asyncio.sleep(5)


async def start_collector() -> None:
    """Start both REST polling and WebSocket collection."""
    logger.info("Starting candle collector...")
    _get_db()  # Initialize DB
    # Run both collectors concurrently
    await asyncio.gather(
        _poll_rest_trades(),
        _connect_websocket(),
        return_exceptions=True,
    )
