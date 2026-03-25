"""Pacifica API client for REST and WebSocket data."""

import logging
import os
from datetime import datetime
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

API_BASE = os.getenv("PACIFICA_API_URL", "https://test-api.pacifica.fi/api/v1")


async def get_exchange_info() -> dict:
    """Get all available markets and their specifications."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/exchange-info")
        resp.raise_for_status()
        return resp.json()


async def get_market_price(symbol: str) -> dict:
    """Get current price for a market."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/market-price", params={"symbol": symbol})
        resp.raise_for_status()
        return resp.json()


async def get_all_market_prices() -> list[dict]:
    """Get prices for all markets."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/market-price")
        resp.raise_for_status()
        return resp.json()


async def get_historical_candles(
    symbol: str,
    interval: str = "1h",
    limit: int = 168,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
) -> list[dict]:
    """Get historical OHLCV candle data.

    Args:
        symbol: Trading pair e.g. "SOL-USDC"
        interval: Candle interval (1m, 5m, 15m, 1h, 4h, 1d)
        limit: Number of candles to return
        start_time: Start timestamp
        end_time: End timestamp
    """
    params = {"symbol": symbol, "interval": interval, "limit": limit}
    if start_time:
        params["startTime"] = start_time
    if end_time:
        params["endTime"] = end_time

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/candles", params=params)
        resp.raise_for_status()
        return resp.json()


async def get_orderbook(symbol: str, limit: int = 20) -> dict:
    """Get orderbook snapshot (bids and asks)."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/orderbook",
            params={"symbol": symbol, "limit": limit},
        )
        resp.raise_for_status()
        return resp.json()


async def get_recent_trades(symbol: str, limit: int = 50) -> list[dict]:
    """Get recent trades for a market."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/trades",
            params={"symbol": symbol, "limit": limit},
        )
        resp.raise_for_status()
        return resp.json()


async def get_funding_rate(symbol: str) -> dict:
    """Get current funding rate for a perpetual market."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/funding-rate",
            params={"symbol": symbol},
        )
        resp.raise_for_status()
        return resp.json()


async def get_all_funding_rates() -> list[dict]:
    """Get funding rates for all markets."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/funding-rate")
        resp.raise_for_status()
        return resp.json()


# --- Authenticated endpoints (require signing) ---


async def get_account_info(api_key: str, api_secret: str) -> dict:
    """Get account information (requires auth)."""
    # TODO: implement signing per Pacifica docs
    logger.warning("Account endpoints require signing — using mock data for now")
    return {
        "equity": 10000.0,
        "available_balance": 7500.0,
        "margin_used": 2500.0,
        "unrealized_pnl": 350.0,
    }


async def get_positions(api_key: str, api_secret: str) -> list[dict]:
    """Get open positions (requires auth)."""
    logger.warning("Position endpoints require signing — using mock data for now")
    return [
        {
            "symbol": "SOL-USDC",
            "side": "long",
            "size": 50.0,
            "entry_price": 175.20,
            "mark_price": 182.45,
            "unrealized_pnl": 362.50,
            "leverage": 5.0,
            "liquidation_price": 148.16,
            "margin": 500.0,
        },
        {
            "symbol": "BTC-USDC",
            "side": "short",
            "size": 0.05,
            "entry_price": 68500.0,
            "mark_price": 67240.0,
            "unrealized_pnl": 63.0,
            "leverage": 3.0,
            "liquidation_price": 89200.0,
            "margin": 1141.67,
        },
    ]


async def get_trade_history(api_key: str, api_secret: str, symbol: Optional[str] = None, limit: int = 50) -> list[dict]:
    """Get trade history (requires auth)."""
    logger.warning("Trade history requires signing — using mock data for now")
    return [
        {
            "symbol": "SOL-USDC",
            "side": "buy",
            "price": 175.20,
            "size": 50.0,
            "fee": 0.87,
            "timestamp": datetime.now().isoformat(),
        },
    ]
