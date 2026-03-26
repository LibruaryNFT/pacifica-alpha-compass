"""Pacifica Alpha Compass — AI-powered trading intelligence API."""

import asyncio
import logging
import os
import re
import time
import uuid
from collections import defaultdict
from contextlib import asynccontextmanager
from datetime import datetime

import uvicorn
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from schemas import ConsensusResult, FundingScanResult, PortfolioSummary, WhaleAlert
from services import mock_data
from services import pacifica_client as pac
from services.ai_consensus import get_consensus
from services.alpha_score import compute_alpha_score
from services.candle_collector import get_candles as get_collected_candles  # noqa: E402
from services.candle_collector import get_stats as get_candle_stats  # noqa: E402
from services.candle_collector import start_collector as start_candle_collector  # noqa: E402

load_dotenv()

# --- Configuration ---
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")
DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "https://alpha-compass.vercel.app,http://localhost:3000",
).split(",")
TOP_SYMBOLS = ["BTC-USDC", "ETH-USDC", "SOL-USDC", "DOGE-USDC", "ARB-USDC", "AVAX-USDC", "LINK-USDC", "OP-USDC"]
PRECOMPUTE_INTERVAL = 60  # seconds

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# --- Bounded TTL Cache (max 500 entries, prevents memory exhaustion) ---
AI_CACHE_TTL = 3600  # 1 hour
PRICE_CACHE_TTL = 30  # 30 seconds
MAX_CACHE_SIZE = 500

_cache: dict[str, tuple[float, object]] = {}


def _cache_get(key: str, ttl: float) -> object | None:
    if key in _cache:
        ts, data = _cache[key]
        if time.time() - ts < ttl:
            return data
        del _cache[key]
    return None


def _cache_set(key: str, data: object) -> None:
    # Evict oldest if over limit
    if len(_cache) >= MAX_CACHE_SIZE:
        oldest = min(_cache, key=lambda k: _cache[k][0])
        del _cache[oldest]
    _cache[key] = (time.time(), data)


# --- Concurrency limiter for AI calls (max 3 simultaneous) ---
_ai_semaphore = asyncio.Semaphore(3)

# --- Rate limiter (per-IP, in-memory) ---
_rate_limits: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 30  # max requests per window for expensive endpoints


def _check_rate_limit(client_ip: str) -> None:
    now = time.time()
    # Clean old entries
    _rate_limits[client_ip] = [t for t in _rate_limits[client_ip] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_limits[client_ip]) >= RATE_LIMIT_MAX:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")
    _rate_limits[client_ip].append(now)


# --- Symbol validation ---
VALID_SYMBOL = re.compile(r"^[A-Z]{2,10}(-USDC)?$")


def validate_symbol(symbol: str) -> str:
    s = symbol.upper().strip()
    if not VALID_SYMBOL.match(s):
        raise HTTPException(status_code=400, detail=f"Invalid symbol: {symbol}")
    return s


# --- Helpers ---
async def _try_live_or_mock(live_fn, mock_fn, label: str):
    if DEMO_MODE:
        return mock_fn()
    try:
        return await live_fn()
    except Exception as e:
        logger.warning(f"{label}: live API failed ({e}), using mock data")
        return mock_fn()


# --- Precomputed Alpha Scores (background task refreshes every 60s) ---
_precomputed_alpha: dict[str, dict] = {}
_alpha_last_updated: float = 0
_consensus_history: list[dict] = []  # Last 50 AI consensus results
MAX_HISTORY = 50

# --- Persistent alert + order systems (SQLite-backed) ---


async def _precompute_alpha_scores() -> None:
    """Background task: precompute Alpha Scores for all markets every 60s."""
    global _alpha_last_updated
    import dataclasses as dc

    while True:
        try:
            for symbol in TOP_SYMBOLS:
                try:
                    price_data = await _try_live_or_mock(
                        lambda s=symbol: pac.get_market_price(s),
                        lambda s=symbol: mock_data.get_price(s),
                        f"precompute-price/{symbol}",
                    )
                    # Prefer real collected candles
                    real_candles = get_collected_candles(symbol, 3600, 168)
                    if len(real_candles) >= 20:
                        candles = real_candles
                    else:
                        candles = await _try_live_or_mock(
                            lambda s=symbol: pac.get_historical_candles(s, "1h", 168),
                            lambda s=symbol: mock_data.get_candles(s, "1h", 168),
                            f"precompute-candles/{symbol}",
                        )
                    orderbook_data = await _try_live_or_mock(
                        lambda s=symbol: pac.get_orderbook(s, 20),
                        lambda s=symbol: mock_data.get_orderbook(s, 20),
                        f"precompute-ob/{symbol}",
                    )

                    price = float(price_data.get("price", price_data.get("markPrice", price_data.get("lastPrice", 0))))
                    funding = float(price_data.get("fundingRate", 0))
                    change = float(price_data.get("change24h", price_data.get("priceChange24h", 0)))
                    volume = float(price_data.get("volume24h", price_data.get("volume", 0)))
                    oi = float(price_data.get("openInterest", 0))
                    candle_list = candles if isinstance(candles, list) else candles.get("data", [])

                    result = compute_alpha_score(
                        symbol=symbol,
                        price=price,
                        candles=candle_list,
                        orderbook=orderbook_data if isinstance(orderbook_data, dict) else {"bids": [], "asks": []},
                        funding_rate=funding,
                        change_24h=change,
                        volume_24h=volume,
                        open_interest=oi,
                    )
                    result_dict = dc.asdict(result)
                    _precomputed_alpha[symbol] = result_dict
                    _cache_set(f"alpha_score:{symbol}", result_dict)
                except Exception as e:
                    logger.warning(f"Precompute failed for {symbol}: {e}")

            _alpha_last_updated = time.time()
            # Check persistent alerts (SQLite + Discord webhooks)
            for symbol, score_data in _precomputed_alpha.items():
                alpha = score_data.get("alpha_score", 50)
                direction = score_data.get("direction", "neutral")
                from services.alert_store import check_and_trigger

                triggered = check_and_trigger(symbol, alpha, direction)
                for t in triggered:
                    logger.info(
                        f"Alert triggered: {t['symbol']} alpha={t['actual_score']:.0f} {t['condition']} {t['threshold']}"
                    )

            # Resolve order intents against current prices
            current_prices = {}
            for sym, sd in _precomputed_alpha.items():
                if sd.get("trade_suggestion", {}).get("entry_zone"):
                    try:
                        current_prices[sym] = float(
                            str(sd["trade_suggestion"]["entry_zone"]).replace("$", "").replace(",", "")
                        )
                    except (ValueError, TypeError):
                        pass
            from services.order_intent import resolve_intents

            resolved = resolve_intents(current_prices)
            if resolved > 0:
                logger.info(f"Resolved {resolved} order intents")

            logger.info(f"Precomputed Alpha Scores for {len(_precomputed_alpha)} markets")
        except Exception as e:
            logger.error(f"Alpha precompute loop error: {e}")

        await asyncio.sleep(PRECOMPUTE_INTERVAL)


# --- App setup ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Pacifica Alpha Compass starting up...")
    logger.info(f"Demo mode: {DEMO_MODE}")
    if not DEMO_MODE:
        logger.info(f"API base: {pac.API_BASE}")
    # Start background tasks
    alpha_task = asyncio.create_task(_precompute_alpha_scores())
    candle_task = asyncio.create_task(start_candle_collector())
    yield
    alpha_task.cancel()
    candle_task.cancel()
    logger.info("Shutting down...")


app = FastAPI(
    title="Pacifica Alpha Compass",
    description="AI-powered perp trading intelligence for Pacifica DEX",
    version="1.0.0",
    lifespan=lifespan,
    docs_url=None,  # Disable docs in production
    redoc_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


# --- Security headers middleware ---
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


# --- Global error handler (no stack trace leakage) ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = str(uuid.uuid4())[:8]
    logger.error(f"[{request_id}] Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "request_id": request_id},
    )


# --- Health ---


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {
        "status": "ok",
        "demo_mode": DEMO_MODE,
        "timestamp": datetime.now().isoformat(),
    }


# --- Market Data ---


@app.get("/api/markets")
async def get_markets():
    """Get all available markets and their specs."""
    return await _try_live_or_mock(pac.get_exchange_info, mock_data.get_exchange_info, "markets")


@app.get("/api/prices")
async def get_all_prices():
    """Get current prices for all markets."""
    data = await _try_live_or_mock(pac.get_all_market_prices, mock_data.get_all_prices, "prices")
    if isinstance(data, list):
        return data
    return data.get("data", data.get("prices", []))


@app.get("/api/price/{symbol}")
async def get_price(symbol: str):
    """Get price for a specific market."""
    return await _try_live_or_mock(
        lambda: pac.get_market_price(symbol),
        lambda: mock_data.get_price(symbol),
        f"price/{symbol}",
    )


@app.get("/api/candles/{symbol}")
async def get_candles(symbol: str, interval: str = "1h", limit: int = 168):
    """Get historical candle data."""
    return await _try_live_or_mock(
        lambda: pac.get_historical_candles(symbol, interval, limit),
        lambda: mock_data.get_candles(symbol, interval, limit),
        f"candles/{symbol}",
    )


@app.get("/api/orderbook/{symbol}")
async def get_orderbook(symbol: str, limit: int = 20):
    """Get orderbook snapshot."""
    return await _try_live_or_mock(
        lambda: pac.get_orderbook(symbol, limit),
        lambda: mock_data.get_orderbook(symbol, limit),
        f"orderbook/{symbol}",
    )


@app.get("/api/trades/{symbol}")
async def get_trades(symbol: str, limit: int = 50):
    """Get recent trades."""
    return await _try_live_or_mock(
        lambda: pac.get_recent_trades(symbol, limit),
        lambda: mock_data.get_recent_trades(symbol, limit),
        f"trades/{symbol}",
    )


# --- Real Candles (from collector) ---


@app.get("/api/collected-candles/{symbol}")
async def collected_candles(symbol: str, interval: str = "1h", limit: int = 500):
    """Get real OHLCV candles built from Pacifica trade stream.

    Unlike Pacifica's missing /candles endpoint, these are aggregated
    from actual trades via WebSocket + REST polling.
    """
    interval_map = {"1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400}
    interval_s = interval_map.get(interval, 3600)
    candles = get_collected_candles(symbol, interval_s, limit)
    return {
        "symbol": symbol,
        "interval": interval,
        "count": len(candles),
        "source": "pacifica_trade_stream",
        "candles": candles,
    }


@app.get("/api/candle-stats")
async def candle_stats():
    """Get candle collection statistics."""
    return get_candle_stats()


# --- Funding Rates ---


@app.get("/api/funding/{symbol}")
async def get_funding(symbol: str):
    """Get funding rate for a market."""
    return await _try_live_or_mock(
        lambda: pac.get_funding_rate(symbol),
        lambda: mock_data.get_funding_rate(symbol),
        f"funding/{symbol}",
    )


@app.get("/api/funding-scan")
async def funding_scan() -> FundingScanResult:
    """Scan all markets for funding rate opportunities."""
    rates = await _try_live_or_mock(pac.get_all_funding_rates, mock_data.get_all_funding_rates, "funding-scan")
    if not rates:
        return FundingScanResult()

    parsed = []
    for r in rates if isinstance(rates, list) else rates.get("data", []):
        rate_val = float(r.get("fundingRate", r.get("rate", 0)))
        parsed.append({"symbol": r.get("symbol", "?"), "rate": rate_val})

    if not parsed:
        return FundingScanResult()

    sorted_rates = sorted(parsed, key=lambda x: x["rate"])
    avg = sum(r["rate"] for r in parsed) / len(parsed)

    opportunities = []
    for r in parsed:
        if abs(r["rate"]) > 0.01:
            opportunities.append(
                {
                    "symbol": r["symbol"],
                    "rate": r["rate"],
                    "type": "high_positive" if r["rate"] > 0 else "high_negative",
                    "annualized": r["rate"] * 3 * 365,
                }
            )

    return FundingScanResult(
        opportunities=opportunities,
        highest_positive={"symbol": sorted_rates[-1]["symbol"], "rate": sorted_rates[-1]["rate"]}
        if sorted_rates
        else None,
        most_negative={"symbol": sorted_rates[0]["symbol"], "rate": sorted_rates[0]["rate"]} if sorted_rates else None,
        average_rate=avg,
    )


# --- Portfolio ---


@app.get("/api/portfolio")
async def get_portfolio() -> PortfolioSummary:
    """Get portfolio summary with positions and risk metrics."""
    account = mock_data.get_account_info()
    positions = mock_data.get_positions()

    total_unrealized = sum(p["unrealized_pnl"] for p in positions)
    total_margin = sum(p.get("margin", 0) for p in positions)
    total_realized = sum(p.get("realized_pnl", 0) for p in positions)

    equity = account.get("equity", 10000)
    heat = (total_margin / equity * 100) if equity > 0 else 0

    return PortfolioSummary(
        total_equity=equity,
        total_unrealized_pnl=total_unrealized,
        total_realized_pnl=total_realized,
        total_margin_used=total_margin,
        available_balance=account.get("available_balance", 0),
        positions=[
            {
                "symbol": p["symbol"],
                "side": p["side"],
                "size": p["size"],
                "entry_price": p["entry_price"],
                "mark_price": p["mark_price"],
                "unrealized_pnl": p["unrealized_pnl"],
                "realized_pnl": p.get("realized_pnl", 0),
                "leverage": p.get("leverage", 1),
                "liquidation_price": p.get("liquidation_price"),
                "margin": p.get("margin"),
            }
            for p in positions
        ],
        portfolio_heat=round(heat, 1),
    )


@app.get("/api/trade-history")
async def get_trade_history():
    """Get trade history."""
    return mock_data.get_trade_history()


# --- AI Consensus ---


from fastapi import Header


def verify_api_key(request: Request, x_internal_key: str = Header(default="")):
    """Verify internal API key + rate limit for expensive endpoints."""
    if not INTERNAL_API_KEY:
        raise HTTPException(status_code=503, detail="API key not configured")
    if x_internal_key != INTERNAL_API_KEY:
        raise HTTPException(status_code=403, detail="Forbidden")
    # Rate limit by client IP
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)


@app.get("/api/ai/consensus/{symbol}")
async def ai_consensus(symbol: str, _: None = Depends(verify_api_key)) -> ConsensusResult:
    """Run 3 AI models and return consensus analysis for a market."""
    symbol = validate_symbol(symbol)
    # Check cache first (AI calls are expensive)
    cache_key = f"ai_consensus:{symbol}"
    cached = _cache_get(cache_key, AI_CACHE_TTL)
    if cached is not None:
        logger.info(f"AI consensus cache hit for {symbol}")
        return cached

    try:
        # Get market data (live or mock)
        price_data = await _try_live_or_mock(
            lambda: pac.get_market_price(symbol),
            lambda: mock_data.get_price(symbol),
            f"ai-data/{symbol}",
        )
        candles = await _try_live_or_mock(
            lambda: pac.get_historical_candles(symbol, "1h", 168),
            lambda: mock_data.get_candles(symbol, "1h", 168),
            f"ai-candles/{symbol}",
        )
        funding = await _try_live_or_mock(
            lambda: pac.get_funding_rate(symbol),
            lambda: mock_data.get_funding_rate(symbol),
            f"ai-funding/{symbol}",
        )

        orderbook = mock_data.get_orderbook(symbol, 20)
        recent_trades = mock_data.get_recent_trades(symbol, 20)

        price = float(price_data.get("price", price_data.get("markPrice", price_data.get("lastPrice", 0))))

        async with _ai_semaphore:  # Max 3 concurrent AI calls
            result = await get_consensus(
                symbol=symbol,
                price=price,
                candles=candles if isinstance(candles, list) else candles.get("data", []),
                orderbook=orderbook,
                recent_trades=recent_trades if isinstance(recent_trades, list) else None,
                funding_rate=float(funding.get("fundingRate", funding.get("rate", 0))),
                change_24h=float(price_data.get("change24h", price_data.get("priceChange24h", 0))),
                volume_24h=float(price_data.get("volume24h", price_data.get("volume", 0))),
                high_24h=float(price_data.get("high24h", price_data.get("high", 0))),
                low_24h=float(price_data.get("low24h", price_data.get("low", 0))),
            )
        _cache_set(cache_key, result)
        # Store in history
        history_entry = result.model_dump() if hasattr(result, "model_dump") else result.__dict__
        _consensus_history.insert(0, history_entry)
        if len(_consensus_history) > MAX_HISTORY:
            _consensus_history.pop()
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI consensus failed for {symbol}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {e}")


# --- Whale Detection ---


@app.get("/api/whales/{symbol}")
async def detect_whales(symbol: str, threshold_usd: float = 50000) -> list[WhaleAlert]:
    """Detect large trades in a market."""
    trades = await _try_live_or_mock(
        lambda: pac.get_recent_trades(symbol, 100),
        lambda: mock_data.get_recent_trades(symbol, 100),
        f"whales/{symbol}",
    )
    if not isinstance(trades, list):
        trades = trades.get("data", [])

    whales = []
    for t in trades:
        size = float(t.get("size", t.get("qty", 0)))
        price = float(t.get("price", 0))
        usd_value = size * price

        if usd_value >= threshold_usd:
            whales.append(
                WhaleAlert(
                    symbol=symbol,
                    side=t.get("side", "unknown"),
                    size_usd=round(usd_value, 2),
                    price=price,
                    timestamp=t.get("timestamp", t.get("time", datetime.now().isoformat())),
                    alert_type="large_trade",
                )
            )

    return sorted(whales, key=lambda w: w.size_usd, reverse=True)


# --- Alpha Score (Proprietary) ---


@app.get("/api/alpha-score/{symbol}")
async def alpha_score(symbol: str, _: None = Depends(verify_api_key)):
    """Compute proprietary Alpha Score for a market."""
    symbol = validate_symbol(symbol)
    cache_key = f"alpha_score:{symbol}"
    cached = _cache_get(cache_key, AI_CACHE_TTL)
    if cached is not None:
        return cached

    try:
        price_data = await _try_live_or_mock(
            lambda: pac.get_market_price(symbol),
            lambda: mock_data.get_price(symbol),
            f"alpha-price/{symbol}",
        )
        candles = await _try_live_or_mock(
            lambda: pac.get_historical_candles(symbol, "1h", 168),
            lambda: mock_data.get_candles(symbol, "1h", 168),
            f"alpha-candles/{symbol}",
        )
        orderbook_data = await _try_live_or_mock(
            lambda: pac.get_orderbook(symbol, 20),
            lambda: mock_data.get_orderbook(symbol, 20),
            f"alpha-ob/{symbol}",
        )

        price = float(price_data.get("price", price_data.get("markPrice", price_data.get("lastPrice", 0))))
        funding = float(price_data.get("fundingRate", 0))
        change = float(price_data.get("change24h", price_data.get("priceChange24h", 0)))
        volume = float(price_data.get("volume24h", price_data.get("volume", 0)))
        oi = float(price_data.get("openInterest", 0))

        candle_list = candles if isinstance(candles, list) else candles.get("data", [])

        result = compute_alpha_score(
            symbol=symbol,
            price=price,
            candles=candle_list,
            orderbook=orderbook_data if isinstance(orderbook_data, dict) else {"bids": [], "asks": []},
            funding_rate=funding,
            change_24h=change,
            volume_24h=volume,
            open_interest=oi,
        )

        # Convert dataclass to dict for JSON serialization

        import dataclasses as dc

        result_dict = dc.asdict(result)
        _cache_set(cache_key, result_dict)
        return result_dict

    except Exception as e:
        logger.error(f"Alpha Score failed for {symbol}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Alpha Score failed: {e}")


@app.get("/api/alpha-scores/all")
async def all_alpha_scores(_: None = Depends(verify_api_key)):
    """Return all precomputed Alpha Scores instantly (updated every 60s)."""
    return {
        "scores": _precomputed_alpha,
        "last_updated": datetime.fromtimestamp(_alpha_last_updated).isoformat() if _alpha_last_updated else None,
        "count": len(_precomputed_alpha),
    }


# --- AI Consensus History ---


@app.get("/api/ai/history")
async def ai_history(_: None = Depends(verify_api_key)):
    """Return recent AI consensus results (last 50)."""
    return {"history": _consensus_history, "count": len(_consensus_history)}


# --- Alerts (persistent SQLite + Discord webhooks) ---


@app.get("/api/alerts")
async def get_alerts(_: None = Depends(verify_api_key)):
    """Get alert configs and triggered alerts (persistent across restarts)."""
    from services.alert_store import get_configs, get_triggered

    configs = get_configs()
    triggered = get_triggered(100)
    return {
        "configs": configs,
        "triggered": triggered,
        "triggered_count": len(triggered),
    }


@app.post("/api/alerts")
async def create_alert(request: Request, _: None = Depends(verify_api_key)):
    """Create a new alert config with optional Discord webhook."""
    body = await request.json()
    symbol = validate_symbol(body.get("symbol", ""))
    condition = body.get("condition", "above")
    threshold = float(body.get("threshold", 70))
    discord_webhook = body.get("discord_webhook", "")

    if condition not in ("above", "below"):
        raise HTTPException(status_code=400, detail="Condition must be 'above' or 'below'")
    if not (0 <= threshold <= 100):
        raise HTTPException(status_code=400, detail="Threshold must be 0-100")

    from services.alert_store import create_config

    return create_config(symbol, condition, threshold, discord_webhook)


@app.delete("/api/alerts/{alert_id}")
async def delete_alert(alert_id: str, _: None = Depends(verify_api_key)):
    """Delete an alert config."""
    from services.alert_store import delete_config

    delete_config(alert_id)
    return {"deleted": alert_id}


# --- Live Accuracy (rolling backtest on real collected candles) ---


@app.get("/api/accuracy/live")
async def live_accuracy(_: None = Depends(verify_api_key)):
    """Run backtest on real collected candles and return live accuracy metrics."""
    import dataclasses as dc

    from services.backtest import run_backtest as _run_backtest

    results = {}
    for symbol in TOP_SYMBOLS:
        real_candles = get_collected_candles(symbol, 3600, 500)
        if len(real_candles) < 50:
            results[symbol] = {"status": "collecting", "candle_count": len(real_candles), "needed": 50}
            continue
        bt = _run_backtest(symbol=symbol, candles=real_candles)
        bt_dict = dc.asdict(bt)
        bt_dict["data_source"] = "pacifica_trade_stream"
        bt_dict["candle_count"] = len(real_candles)
        results[symbol] = bt_dict

    # Aggregate stats
    active = [r for r in results.values() if r.get("total_signals", 0) > 0]
    total_signals = sum(r["total_signals"] for r in active)
    correct_signals = sum(r["correct_signals"] for r in active)
    total_pnl = sum(r["total_pnl_pct"] for r in active)

    return {
        "markets": results,
        "aggregate": {
            "markets_with_data": len(active),
            "markets_collecting": len(results) - len(active),
            "total_signals": total_signals,
            "correct_signals": correct_signals,
            "accuracy": round(correct_signals / total_signals * 100, 1) if total_signals > 0 else 0,
            "total_pnl_pct": round(total_pnl, 2),
        },
        "last_updated": datetime.now().isoformat(),
    }


# --- Order Intents (paper trading) ---


@app.post("/api/orders/intent")
async def create_order_intent(request: Request, _: None = Depends(verify_api_key)):
    """Create an order intent from Alpha Score signal."""
    body = await request.json()
    symbol = validate_symbol(body.get("symbol", ""))
    from services.order_intent import create_intent

    return create_intent(
        symbol=symbol,
        side=body.get("side", "long"),
        size=float(body.get("size", 1)),
        entry_price=float(body.get("entry_price", 0)),
        target_price=float(body.get("target_price", 0)),
        stop_price=float(body.get("stop_price", 0)),
        alpha_score=float(body.get("alpha_score", 50)),
        direction=body.get("direction", "neutral"),
        risk_reward=float(body.get("risk_reward", 0)),
        wallet_address=body.get("wallet_address", ""),
    )


@app.get("/api/orders/intents")
async def list_order_intents(_: None = Depends(verify_api_key)):
    """List order intents with paper trading stats."""
    from services.order_intent import get_intent_stats, get_intents

    return {
        "intents": get_intents(50),
        "stats": get_intent_stats(),
    }


# --- Backtesting ---


@app.get("/api/backtest/{symbol}")
async def backtest(symbol: str, _: None = Depends(verify_api_key)):
    """Run Alpha Score backtest against historical data."""
    symbol = validate_symbol(symbol)
    cache_key = f"backtest:{symbol}"
    cached = _cache_get(cache_key, AI_CACHE_TTL)
    if cached is not None:
        return cached

    try:
        # Prefer real collected candles over mock data
        real_candles = get_collected_candles(symbol, 3600, 500)
        if len(real_candles) >= 50:
            candle_list = real_candles
            data_source = "pacifica_trade_stream"
            logger.info(f"Backtest using {len(real_candles)} real candles for {symbol}")
        else:
            candles = await _try_live_or_mock(
                lambda: pac.get_historical_candles(symbol, "1h", 500),
                lambda: mock_data.get_candles(symbol, "1h", 500),
                f"backtest-candles/{symbol}",
            )
            candle_list = candles if isinstance(candles, list) else candles.get("data", [])
            data_source = "simulated"
            logger.info(f"Backtest using simulated candles for {symbol} (only {len(real_candles)} real)")

        import dataclasses as dc

        from services.backtest import run_backtest as _run_backtest

        result = _run_backtest(symbol=symbol, candles=candle_list)
        result_dict = dc.asdict(result)
        result_dict["data_source"] = data_source
        result_dict["candle_count"] = len(candle_list)
        _cache_set(cache_key, result_dict)
        return result_dict

    except Exception as e:
        logger.error(f"Backtest failed for {symbol}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Backtest failed: {e}")


# --- Social Sentiment (Elfa AI) ---


from services import elfa_client as elfa


@app.get("/api/social/trending")
async def social_trending(_: None = Depends(verify_api_key)):
    """Get trending tokens by social engagement (powered by Elfa AI)."""
    return await elfa.get_trending_tokens(limit=10)


@app.get("/api/social/sentiment/{symbol}")
async def social_sentiment(symbol: str, _: None = Depends(verify_api_key)):
    """Get social sentiment for a market (powered by Elfa AI)."""
    cache_key = f"social_sentiment:{symbol}"
    cached = _cache_get(cache_key, AI_CACHE_TTL)
    if cached is not None:
        return cached

    result = await elfa.get_social_sentiment(symbol)
    _cache_set(cache_key, result)
    return result


@app.get("/api/social/mentions/{keyword}")
async def social_mentions(keyword: str, limit: int = 20):
    """Get social mentions for a keyword (powered by Elfa AI)."""
    return await elfa.get_token_mentions(keyword, limit=limit)


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
