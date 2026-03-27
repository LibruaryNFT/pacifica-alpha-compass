"""Pacifica-specific intelligence — whale tracking, smart money, leaderboard analytics.

These features ONLY work on Pacifica because their /positions, /orders,
and /leaderboard endpoints are public (no auth needed). Most DEXs don't
expose this data — it's Pacifica's unique advantage.
"""

import logging
import time
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

PACIFICA_API = "https://api.pacifica.fi/api/v1"
_cache: dict[str, tuple[float, object]] = {}
CACHE_TTL = 300  # 5 minutes


def _cached(key: str, ttl: float = CACHE_TTL) -> Optional[object]:
    if key in _cache:
        ts, data = _cache[key]
        if time.time() - ts < ttl:
            return data
    return None


async def get_leaderboard_stats() -> dict:
    """Aggregate Pacifica leaderboard into exchange-level intelligence."""
    cached = _cached("leaderboard_stats")
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{PACIFICA_API}/leaderboard")
            if resp.status_code != 200:
                return {"error": "Leaderboard unavailable"}
            data = resp.json().get("data", [])

        total_traders = len(data)
        profitable = [t for t in data if float(t.get("pnl_all_time", 0)) > 0]
        total_equity = sum(float(t.get("equity_current", 0)) for t in data if float(t.get("equity_current", 0)) > 0)
        total_oi = sum(float(t.get("oi_current", 0)) for t in data if float(t.get("oi_current", 0)) > 0)
        total_vol_24h = sum(float(t.get("volume_1d", 0)) for t in data)
        total_vol_all = sum(float(t.get("volume_all_time", 0)) for t in data)

        # Top 10 by equity (whales)
        by_equity = sorted(data, key=lambda t: float(t.get("equity_current", 0)), reverse=True)[:10]
        whales = [
            {
                "address": t["address"][:8] + "..." + t["address"][-4:],
                "full_address": t["address"],
                "equity": round(float(t.get("equity_current", 0)), 2),
                "oi": round(float(t.get("oi_current", 0)), 2),
                "pnl_1d": round(float(t.get("pnl_1d", 0)), 2),
                "pnl_7d": round(float(t.get("pnl_7d", 0)), 2),
                "pnl_all": round(float(t.get("pnl_all_time", 0)), 2),
                "volume_1d": round(float(t.get("volume_1d", 0)), 2),
            }
            for t in by_equity
        ]

        # Top 10 by 24h P&L (hot traders)
        by_pnl = sorted(data, key=lambda t: float(t.get("pnl_1d", 0)), reverse=True)[:10]
        hot_traders = [
            {
                "address": t["address"][:8] + "..." + t["address"][-4:],
                "full_address": t["address"],
                "pnl_1d": round(float(t.get("pnl_1d", 0)), 2),
                "pnl_7d": round(float(t.get("pnl_7d", 0)), 2),
                "equity": round(float(t.get("equity_current", 0)), 2),
                "volume_1d": round(float(t.get("volume_1d", 0)), 2),
            }
            for t in by_pnl
        ]

        result = {
            "exchange": {
                "total_traders": total_traders,
                "profitable_traders": len(profitable),
                "profit_rate": round(len(profitable) / total_traders * 100, 1) if total_traders > 0 else 0,
                "total_equity_usd": round(total_equity, 0),
                "total_open_interest_usd": round(total_oi, 0),
                "volume_24h_usd": round(total_vol_24h, 0),
                "volume_all_time_usd": round(total_vol_all, 0),
            },
            "whales": whales,
            "hot_traders": hot_traders,
        }

        _cache["leaderboard_stats"] = (time.time(), result)
        return result

    except Exception as e:
        logger.error(f"Leaderboard stats failed: {e}")
        return {"error": str(e)}


async def get_whale_positions(address: str) -> dict:
    """Get a whale's current positions + orders (Pacifica public API)."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            pos_resp = await client.get(f"{PACIFICA_API}/positions", params={"account": address})
            ord_resp = await client.get(f"{PACIFICA_API}/orders", params={"account": address})

        positions = []
        if pos_resp.status_code == 200:
            for p in pos_resp.json().get("data", []):
                side = "long" if p.get("side") == "bid" else "short"
                positions.append(
                    {
                        "symbol": p.get("symbol", ""),
                        "side": side,
                        "size": abs(float(p.get("amount", 0))),
                        "entry_price": float(p.get("entry_price", 0)),
                        "funding": float(p.get("funding", 0)),
                        "liquidation_price": float(p.get("liquidation_price", 0)),
                        "margin_type": "isolated" if p.get("isolated") else "cross",
                    }
                )

        orders = []
        if ord_resp.status_code == 200:
            for o in ord_resp.json().get("data", []):
                orders.append(
                    {
                        "symbol": o.get("symbol", ""),
                        "side": "buy" if o.get("side") == "bid" else "sell",
                        "price": float(o.get("price", 0)),
                        "size": float(o.get("initial_amount", 0)),
                        "type": o.get("order_type", "limit"),
                    }
                )

        return {
            "address": address,
            "positions": positions,
            "orders": orders,
            "position_count": len(positions),
            "order_count": len(orders),
        }

    except Exception as e:
        logger.error(f"Whale positions failed for {address}: {e}")
        return {"error": str(e)}


async def get_smart_money_flow() -> dict:
    """Analyze what the top profitable traders are doing right now.

    Fetches positions from the top 5 most profitable traders (by all-time P&L)
    and aggregates their current market bias.
    """
    cached = _cached("smart_money", 600)  # 10 min cache
    if cached:
        return cached

    try:
        # Get leaderboard
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{PACIFICA_API}/leaderboard")
            if resp.status_code != 200:
                return {"error": "Leaderboard unavailable"}
            traders = resp.json().get("data", [])

        # Sort by all-time P&L (most profitable first)
        profitable = sorted(traders, key=lambda t: float(t.get("pnl_all_time", 0)), reverse=True)[:5]

        # Fetch each whale's positions
        symbol_bias: dict[str, dict] = {}  # symbol -> {long_count, short_count, long_size, short_size}
        whale_details = []

        for trader in profitable:
            addr = trader["address"]
            wp = await get_whale_positions(addr)
            whale_details.append(
                {
                    "address": addr[:8] + "..." + addr[-4:],
                    "pnl_all": round(float(trader.get("pnl_all_time", 0)), 0),
                    "positions": len(wp.get("positions", [])),
                }
            )

            for pos in wp.get("positions", []):
                sym = pos["symbol"]
                if sym not in symbol_bias:
                    symbol_bias[sym] = {"long_count": 0, "short_count": 0, "long_size_usd": 0, "short_size_usd": 0}
                if pos["side"] == "long":
                    symbol_bias[sym]["long_count"] += 1
                    symbol_bias[sym]["long_size_usd"] += pos["size"] * pos["entry_price"]
                else:
                    symbol_bias[sym]["short_count"] += 1
                    symbol_bias[sym]["short_size_usd"] += pos["size"] * pos["entry_price"]

        # Compute net bias per symbol
        signals = []
        for sym, bias in sorted(
            symbol_bias.items(), key=lambda x: x[1]["long_size_usd"] + x[1]["short_size_usd"], reverse=True
        ):
            net = bias["long_count"] - bias["short_count"]
            total_usd = bias["long_size_usd"] + bias["short_size_usd"]
            signals.append(
                {
                    "symbol": sym,
                    "smart_money_bias": "bullish" if net > 0 else "bearish" if net < 0 else "split",
                    "long_whales": bias["long_count"],
                    "short_whales": bias["short_count"],
                    "total_exposure_usd": round(total_usd, 0),
                }
            )

        result = {
            "whales_analyzed": len(whale_details),
            "whale_details": whale_details,
            "signals": signals[:15],  # Top 15 by exposure
        }

        _cache["smart_money"] = (time.time(), result)
        return result

    except Exception as e:
        logger.error(f"Smart money flow failed: {e}")
        return {"error": str(e)}
