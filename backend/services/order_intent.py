"""Order Intent System — paper trading + execution-ready architecture.

Creates order intents from Alpha Score signals. When Pacifica SDK access
is available, these intents can be converted to real orders with one call.
Meanwhile, they serve as a paper trading record that validates signal quality.
"""

import logging
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

DB_PATH = Path(os.getenv("ORDER_DB_PATH", "data/orders.db"))
_db: Optional[sqlite3.Connection] = None


def _get_db() -> sqlite3.Connection:
    global _db
    if _db is None:
        DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        _db = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        _db.execute("PRAGMA journal_mode=WAL")
        _db.execute("""
            CREATE TABLE IF NOT EXISTS order_intents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                side TEXT NOT NULL,
                size REAL NOT NULL,
                entry_price REAL NOT NULL,
                target_price REAL NOT NULL,
                stop_price REAL NOT NULL,
                alpha_score REAL NOT NULL,
                direction TEXT NOT NULL,
                risk_reward REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'pending',
                outcome_price REAL,
                outcome_pnl_pct REAL,
                wallet_address TEXT,
                created_at TEXT NOT NULL,
                resolved_at TEXT
            )
        """)
        _db.commit()
    return _db


def create_intent(
    symbol: str,
    side: str,
    size: float,
    entry_price: float,
    target_price: float,
    stop_price: float,
    alpha_score: float,
    direction: str,
    risk_reward: float = 0,
    wallet_address: str = "",
) -> dict:
    """Create a new order intent."""
    db = _get_db()
    now = datetime.now(tz=timezone.utc).isoformat()
    cursor = db.execute(
        """INSERT INTO order_intents
           (symbol, side, size, entry_price, target_price, stop_price, alpha_score, direction, risk_reward, wallet_address, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            symbol,
            side,
            size,
            entry_price,
            target_price,
            stop_price,
            alpha_score,
            direction,
            risk_reward,
            wallet_address,
            now,
        ),
    )
    db.commit()
    return {
        "id": cursor.lastrowid,
        "symbol": symbol,
        "side": side,
        "size": size,
        "entry_price": entry_price,
        "target_price": target_price,
        "stop_price": stop_price,
        "alpha_score": alpha_score,
        "direction": direction,
        "risk_reward": risk_reward,
        "status": "pending",
        "created_at": now,
    }


def get_intents(limit: int = 50, wallet_address: str = "") -> list[dict]:
    """Get order intents, optionally filtered by wallet."""
    db = _get_db()
    if wallet_address:
        rows = db.execute(
            "SELECT * FROM order_intents WHERE wallet_address=? ORDER BY id DESC LIMIT ?",
            (wallet_address, limit),
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM order_intents ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [_row_to_dict(r) for r in rows]


def get_intent_stats() -> dict:
    """Get aggregate stats for order intents (paper trading performance)."""
    db = _get_db()
    total = db.execute("SELECT COUNT(*) FROM order_intents").fetchone()[0]
    resolved = db.execute("SELECT COUNT(*) FROM order_intents WHERE status IN ('hit_target', 'hit_stop')").fetchone()[0]
    wins = db.execute("SELECT COUNT(*) FROM order_intents WHERE status='hit_target'").fetchone()[0]
    losses = db.execute("SELECT COUNT(*) FROM order_intents WHERE status='hit_stop'").fetchone()[0]
    pending = db.execute("SELECT COUNT(*) FROM order_intents WHERE status='pending'").fetchone()[0]

    avg_pnl = db.execute("SELECT AVG(outcome_pnl_pct) FROM order_intents WHERE outcome_pnl_pct IS NOT NULL").fetchone()[
        0
    ]

    return {
        "total_intents": total,
        "resolved": resolved,
        "wins": wins,
        "losses": losses,
        "pending": pending,
        "win_rate": round(wins / resolved * 100, 1) if resolved > 0 else 0,
        "avg_pnl_pct": round(avg_pnl or 0, 3),
    }


def resolve_intents(current_prices: dict[str, float]) -> int:
    """Check pending intents against current prices and resolve them.

    Called periodically from the precompute loop.
    """
    db = _get_db()
    pending = db.execute(
        "SELECT id, symbol, side, entry_price, target_price, stop_price FROM order_intents WHERE status='pending'"
    ).fetchall()

    resolved_count = 0
    now = datetime.now(tz=timezone.utc).isoformat()

    for row in pending:
        intent_id, symbol, side, entry, target, stop = row
        price = current_prices.get(symbol)
        if not price:
            continue

        status = None
        if side == "long":
            if price >= target:
                status = "hit_target"
            elif price <= stop:
                status = "hit_stop"
        elif side == "short":
            if price <= target:
                status = "hit_target"
            elif price >= stop:
                status = "hit_stop"

        if status:
            pnl = ((price - entry) / entry) * 100
            if side == "short":
                pnl = -pnl
            db.execute(
                "UPDATE order_intents SET status=?, outcome_price=?, outcome_pnl_pct=?, resolved_at=? WHERE id=?",
                (status, price, round(pnl, 3), now, intent_id),
            )
            resolved_count += 1

    if resolved_count > 0:
        db.commit()
    return resolved_count


def _row_to_dict(row: tuple) -> dict:
    cols = [
        "id",
        "symbol",
        "side",
        "size",
        "entry_price",
        "target_price",
        "stop_price",
        "alpha_score",
        "direction",
        "risk_reward",
        "status",
        "outcome_price",
        "outcome_pnl_pct",
        "wallet_address",
        "created_at",
        "resolved_at",
    ]
    return dict(zip(cols, row))
