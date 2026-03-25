"""Pacifica Alpha Compass — AI-powered trading intelligence API."""

import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from schemas import ConsensusResult, FundingScanResult, PortfolioSummary, WhaleAlert
from services import mock_data
from services import pacifica_client as pac
from services.ai_consensus import get_consensus

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Demo mode: use mock data when Pacifica API is unreachable
DEMO_MODE = os.getenv("DEMO_MODE", "true").lower() == "true"


async def _try_live_or_mock(live_fn, mock_fn, label: str):
    """Try live Pacifica API first, fall back to mock data."""
    if DEMO_MODE:
        return mock_fn()
    try:
        return await live_fn()
    except Exception as e:
        logger.warning(f"{label}: live API failed ({e}), using mock data")
        return mock_fn()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Pacifica Alpha Compass starting up...")
    logger.info(f"Demo mode: {DEMO_MODE}")
    if not DEMO_MODE:
        logger.info(f"API base: {pac.API_BASE}")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Pacifica Alpha Compass",
    description="AI-powered perp trading intelligence for Pacifica DEX",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.get("/api/ai/consensus/{symbol}")
async def ai_consensus(symbol: str) -> ConsensusResult:
    """Run 3 AI models and return consensus analysis for a market."""
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


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
