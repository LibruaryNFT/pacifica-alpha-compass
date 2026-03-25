"""Realistic mock market data for demo/development mode.

Generates dynamic data that looks real — prices drift, volumes vary,
funding rates fluctuate, and whale trades appear sporadically.
"""

import math
import random
import time
from datetime import datetime, timedelta

# Base prices with realistic ranges
MARKETS = {
    "BTC-USDC": {"base": 67240, "vol": 0.02, "oi": 450_000_000},
    "ETH-USDC": {"base": 3412, "vol": 0.025, "oi": 180_000_000},
    "SOL-USDC": {"base": 182.45, "vol": 0.035, "oi": 95_000_000},
    "DOGE-USDC": {"base": 0.168, "vol": 0.04, "oi": 25_000_000},
    "ARB-USDC": {"base": 1.24, "vol": 0.04, "oi": 18_000_000},
    "AVAX-USDC": {"base": 38.90, "vol": 0.03, "oi": 32_000_000},
    "LINK-USDC": {"base": 14.82, "vol": 0.035, "oi": 28_000_000},
    "OP-USDC": {"base": 2.65, "vol": 0.04, "oi": 15_000_000},
    "WIF-USDC": {"base": 2.18, "vol": 0.06, "oi": 12_000_000},
    "PEPE-USDC": {"base": 0.0000125, "vol": 0.08, "oi": 8_000_000},
    "SUI-USDC": {"base": 1.35, "vol": 0.045, "oi": 20_000_000},
    "APT-USDC": {"base": 8.92, "vol": 0.035, "oi": 16_000_000},
    "INJ-USDC": {"base": 25.40, "vol": 0.04, "oi": 14_000_000},
    "TIA-USDC": {"base": 11.20, "vol": 0.045, "oi": 10_000_000},
    "JUP-USDC": {"base": 1.08, "vol": 0.05, "oi": 9_000_000},
    "RNDR-USDC": {"base": 9.45, "vol": 0.04, "oi": 11_000_000},
}

# Seed so drift is consistent within a session but varies across restarts
_seed = int(time.time()) % 10000


def _drift_price(base: float, volatility: float, symbol: str) -> float:
    """Generate a price that drifts realistically over time."""
    t = time.time() / 60  # minutes
    h = hash(symbol + str(_seed))
    # Combine slow drift + fast noise
    slow = math.sin(t / 30 + h % 100) * volatility * 0.5
    fast = math.sin(t * 3 + h % 50) * volatility * 0.3
    noise = (random.random() - 0.5) * volatility * 0.2
    return base * (1 + slow + fast + noise)


def get_all_prices() -> list[dict]:
    """Get realistic prices for all markets."""
    results = []
    for symbol, info in MARKETS.items():
        price = _drift_price(info["base"], info["vol"], symbol)
        change = ((price / info["base"]) - 1) * 100
        vol_24h = info["oi"] * (0.8 + random.random() * 0.4)
        funding = (random.random() - 0.45) * 0.06  # slight long bias

        results.append(
            {
                "symbol": symbol,
                "price": round(price, 6 if price < 0.01 else 2),
                "markPrice": round(price, 6 if price < 0.01 else 2),
                "lastPrice": round(price, 6 if price < 0.01 else 2),
                "change24h": round(change, 2),
                "priceChange24h": round(change, 2),
                "volume24h": round(vol_24h, 0),
                "volume": round(vol_24h, 0),
                "high24h": round(price * (1 + info["vol"] * 0.4), 6 if price < 0.01 else 2),
                "high": round(price * (1 + info["vol"] * 0.4), 6 if price < 0.01 else 2),
                "low24h": round(price * (1 - info["vol"] * 0.4), 6 if price < 0.01 else 2),
                "low": round(price * (1 - info["vol"] * 0.4), 6 if price < 0.01 else 2),
                "openInterest": round(info["oi"] * (0.9 + random.random() * 0.2), 0),
                "fundingRate": round(funding, 6),
            }
        )
    return results


def get_price(symbol: str) -> dict:
    """Get price for a single market."""
    prices = get_all_prices()
    for p in prices:
        if p["symbol"] == symbol:
            return p
    return {"symbol": symbol, "price": 0, "error": "Market not found"}


def get_candles(symbol: str, interval: str = "1h", limit: int = 168) -> list[dict]:
    """Generate realistic OHLCV candle data."""
    info = MARKETS.get(symbol, {"base": 100, "vol": 0.03})
    base = info["base"]
    vol = info["vol"]

    interval_minutes = {
        "1m": 1,
        "5m": 5,
        "15m": 15,
        "1h": 60,
        "4h": 240,
        "1d": 1440,
    }.get(interval, 60)

    now = datetime.now()
    candles = []
    price = base * (0.95 + random.random() * 0.1)

    for i in range(limit):
        ts = now - timedelta(minutes=interval_minutes * (limit - i))
        # Random walk
        change = (random.random() - 0.48) * vol * 0.3  # slight upward bias
        open_price = price
        close_price = price * (1 + change)
        high = max(open_price, close_price) * (1 + random.random() * vol * 0.2)
        low = min(open_price, close_price) * (1 - random.random() * vol * 0.2)
        volume = base * random.randint(100, 10000)

        candles.append(
            {
                "timestamp": ts.isoformat(),
                "open": round(open_price, 6 if base < 0.01 else 2),
                "high": round(high, 6 if base < 0.01 else 2),
                "low": round(low, 6 if base < 0.01 else 2),
                "close": round(close_price, 6 if base < 0.01 else 2),
                "volume": round(volume, 2),
            }
        )
        price = close_price

    return candles


def get_orderbook(symbol: str, limit: int = 20) -> dict:
    """Generate a realistic orderbook."""
    info = MARKETS.get(symbol, {"base": 100, "vol": 0.03})
    mid = _drift_price(info["base"], info["vol"], symbol)
    spread = mid * 0.0002  # 2 bps spread

    bids = []
    asks = []
    for i in range(limit):
        bid_price = mid - spread * (i + 1)
        ask_price = mid + spread * (i + 1)
        # Size decreases with distance from mid
        bid_size = round(random.uniform(0.5, 50) * (1 / (i + 1)), 4)
        ask_size = round(random.uniform(0.5, 50) * (1 / (i + 1)), 4)
        bids.append([round(bid_price, 6 if mid < 0.01 else 2), bid_size])
        asks.append([round(ask_price, 6 if mid < 0.01 else 2), ask_size])

    return {"bids": bids, "asks": asks, "timestamp": datetime.now().isoformat()}


def get_recent_trades(symbol: str, limit: int = 50) -> list[dict]:
    """Generate realistic recent trades with occasional whales."""
    info = MARKETS.get(symbol, {"base": 100, "vol": 0.03})
    mid = _drift_price(info["base"], info["vol"], symbol)
    trades = []
    now = datetime.now()

    for i in range(limit):
        ts = now - timedelta(seconds=random.randint(1, 300))
        side = "buy" if random.random() > 0.48 else "sell"
        # Mostly small trades, occasional large ones
        if random.random() > 0.95:
            size = random.uniform(50, 500)  # whale
        elif random.random() > 0.8:
            size = random.uniform(10, 50)  # medium
        else:
            size = random.uniform(0.1, 10)  # retail

        price = mid * (1 + (random.random() - 0.5) * 0.001)
        trades.append(
            {
                "symbol": symbol,
                "side": side,
                "price": round(price, 6 if mid < 0.01 else 2),
                "size": round(size, 4),
                "qty": round(size, 4),
                "timestamp": ts.isoformat(),
                "time": ts.isoformat(),
            }
        )

    return sorted(trades, key=lambda t: t["timestamp"], reverse=True)


def get_funding_rate(symbol: str) -> dict:
    """Get funding rate for a market."""
    rate = (random.random() - 0.45) * 0.06
    return {
        "symbol": symbol,
        "fundingRate": round(rate, 6),
        "rate": round(rate, 6),
        "nextFundingTime": (datetime.now() + timedelta(hours=random.randint(1, 8))).isoformat(),
    }


def get_all_funding_rates() -> list[dict]:
    """Get funding rates for all markets."""
    return [get_funding_rate(symbol) for symbol in MARKETS]


def get_exchange_info() -> dict:
    """Get exchange info with all available markets."""
    markets = []
    for symbol, info in MARKETS.items():
        base, quote = symbol.split("-")
        markets.append(
            {
                "symbol": symbol,
                "baseAsset": base,
                "quoteAsset": quote,
                "status": "TRADING",
                "maxLeverage": 50 if base in ("BTC", "ETH") else 20,
                "tickSize": 0.000001 if info["base"] < 0.01 else 0.01,
                "minOrderSize": 0.001 if info["base"] > 100 else 1.0,
            }
        )
    return {"markets": markets, "serverTime": datetime.now().isoformat()}


def get_positions() -> list[dict]:
    """Mock open positions."""
    return [
        {
            "symbol": "SOL-USDC",
            "side": "long",
            "size": 50.0,
            "entry_price": 175.20,
            "mark_price": _drift_price(182.45, 0.035, "SOL-USDC"),
            "unrealized_pnl": round(50 * (_drift_price(182.45, 0.035, "SOL-USDC") - 175.20), 2),
            "realized_pnl": 0.0,
            "leverage": 5.0,
            "liquidation_price": 148.16,
            "margin": 500.0,
        },
        {
            "symbol": "BTC-USDC",
            "side": "short",
            "size": 0.05,
            "entry_price": 68500.0,
            "mark_price": _drift_price(67240, 0.02, "BTC-USDC"),
            "unrealized_pnl": round(0.05 * (68500 - _drift_price(67240, 0.02, "BTC-USDC")), 2),
            "realized_pnl": 0.0,
            "leverage": 3.0,
            "liquidation_price": 89200.0,
            "margin": 1141.67,
        },
        {
            "symbol": "ETH-USDC",
            "side": "long",
            "size": 2.0,
            "entry_price": 3350.0,
            "mark_price": _drift_price(3412, 0.025, "ETH-USDC"),
            "unrealized_pnl": round(2.0 * (_drift_price(3412, 0.025, "ETH-USDC") - 3350.0), 2),
            "realized_pnl": 45.20,
            "leverage": 4.0,
            "liquidation_price": 2680.0,
            "margin": 837.50,
        },
    ]


def get_account_info() -> dict:
    """Mock account info."""
    positions = get_positions()
    total_margin = sum(p["margin"] for p in positions)
    total_unrealized = sum(p["unrealized_pnl"] for p in positions)
    equity = 10000 + total_unrealized

    return {
        "equity": round(equity, 2),
        "available_balance": round(equity - total_margin, 2),
        "margin_used": round(total_margin, 2),
        "unrealized_pnl": round(total_unrealized, 2),
    }


def get_trade_history() -> list[dict]:
    """Mock trade history."""
    now = datetime.now()
    trades = []
    symbols = ["SOL-USDC", "BTC-USDC", "ETH-USDC", "DOGE-USDC"]

    for i in range(20):
        sym = random.choice(symbols)
        info = MARKETS[sym]
        price = info["base"] * (0.95 + random.random() * 0.1)
        size = random.uniform(0.01, 10) if info["base"] > 100 else random.uniform(1, 100)
        side = random.choice(["buy", "sell"])

        trades.append(
            {
                "symbol": sym,
                "side": side,
                "price": round(price, 2),
                "size": round(size, 4),
                "fee": round(price * size * 0.0004, 4),
                "realized_pnl": round((random.random() - 0.4) * 50, 2),
                "timestamp": (now - timedelta(hours=random.randint(1, 72))).isoformat(),
            }
        )

    return sorted(trades, key=lambda t: t["timestamp"], reverse=True)
