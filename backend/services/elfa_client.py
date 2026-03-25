"""Elfa AI client — social sentiment analysis for crypto tokens.

Elfa AI provides real-time social listening from Twitter/X and Telegram,
including trending tokens, mention tracking, and smart engagement scoring.

API docs: https://docs.elfa.ai/
Auth: x-elfa-api-key header
"""

import logging
import os
from datetime import datetime, timedelta

import httpx

logger = logging.getLogger(__name__)

ELFA_API_BASE = "https://api.elfa.ai/v2"
ELFA_API_KEY = os.getenv("ELFA_API_KEY", "")


def _headers() -> dict:
    """Get auth headers for Elfa API."""
    return {"x-elfa-api-key": ELFA_API_KEY}


async def get_trending_tokens(limit: int = 10) -> list[dict]:
    """Get trending tokens with engagement scores.

    Returns tokens ranked by social engagement across Twitter/X and Telegram.
    """
    if not ELFA_API_KEY:
        logger.warning("ELFA_API_KEY not set, returning mock trending data")
        return _mock_trending()

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{ELFA_API_BASE}/aggregations/trending-tokens",
                headers=_headers(),
                params={"limit": limit},
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("data", data) if isinstance(data, dict) else data
    except Exception as e:
        logger.error(f"Elfa trending tokens failed: {e}")
        return _mock_trending()


async def get_token_mentions(keyword: str, limit: int = 20, hours_back: int = 24) -> dict:
    """Get social mentions for a keyword/token.

    Args:
        keyword: Token symbol or name (e.g. "SOL", "Solana")
        limit: Max mentions to return
        hours_back: How far back to search
    """
    if not ELFA_API_KEY:
        logger.warning("ELFA_API_KEY not set, returning mock mentions")
        return _mock_mentions(keyword)

    try:
        start_time = datetime.utcnow() - timedelta(hours=hours_back)
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{ELFA_API_BASE}/data/keyword-mentions",
                headers=_headers(),
                params={
                    "keyword": keyword,
                    "limit": limit,
                    "from": start_time.isoformat() + "Z",
                },
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
            return data
    except Exception as e:
        logger.error(f"Elfa keyword mentions failed: {e}")
        return _mock_mentions(keyword)


async def get_top_mentions(limit: int = 10) -> list[dict]:
    """Get top mentioned tokens with smart engagement metrics."""
    if not ELFA_API_KEY:
        logger.warning("ELFA_API_KEY not set, returning mock top mentions")
        return _mock_top_mentions()

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{ELFA_API_BASE}/data/top-mentions",
                headers=_headers(),
                params={"limit": limit},
                timeout=10,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("data", data) if isinstance(data, dict) else data
    except Exception as e:
        logger.error(f"Elfa top mentions failed: {e}")
        return _mock_top_mentions()


async def get_social_sentiment(symbol: str) -> dict:
    """Get aggregated social sentiment for a trading pair.

    Combines trending data + mentions into a single sentiment score.
    This is our custom aggregation for the dashboard.
    """
    # Extract base token from pair (e.g. "SOL-USDC" -> "SOL")
    token = symbol.split("-")[0] if "-" in symbol else symbol

    mentions = await get_token_mentions(token, limit=50, hours_back=24)
    mention_list = mentions.get("data", []) if isinstance(mentions, dict) else []

    # Calculate sentiment from mentions
    total = len(mention_list)
    if total == 0:
        return {
            "symbol": symbol,
            "token": token,
            "sentiment_score": 0.5,
            "sentiment_label": "neutral",
            "mention_count_24h": 0,
            "top_mentions": [],
            "source": "elfa_ai",
        }

    # Simple sentiment heuristic based on engagement
    positive_signals = 0
    negative_signals = 0
    top_mentions = []

    for m in mention_list[:50]:
        engagement = m.get("smartEngagement", m.get("engagement", 0))
        text = m.get("text", "").lower()

        # Basic keyword sentiment (Elfa doesn't provide sentiment scores directly)
        bullish_words = ["bullish", "pump", "moon", "buy", "long", "breakout", "ath", "rocket"]
        bearish_words = ["bearish", "dump", "crash", "sell", "short", "breakdown", "rekt"]

        if any(w in text for w in bullish_words):
            positive_signals += 1
        elif any(w in text for w in bearish_words):
            negative_signals += 1

        if len(top_mentions) < 5 and engagement > 0:
            top_mentions.append(
                {
                    "text": m.get("text", "")[:200],
                    "engagement": engagement,
                    "source": m.get("source", "twitter"),
                    "timestamp": m.get("createdAt", m.get("timestamp", "")),
                }
            )

    # Calculate score (0-1, 0.5 = neutral)
    if positive_signals + negative_signals > 0:
        score = positive_signals / (positive_signals + negative_signals)
    else:
        score = 0.5

    label = "bullish" if score > 0.6 else "bearish" if score < 0.4 else "neutral"

    return {
        "symbol": symbol,
        "token": token,
        "sentiment_score": round(score, 3),
        "sentiment_label": label,
        "mention_count_24h": total,
        "positive_mentions": positive_signals,
        "negative_mentions": negative_signals,
        "top_mentions": top_mentions,
        "source": "elfa_ai",
    }


# --- Mock data (when API key not available) ---


def _mock_trending() -> list[dict]:
    """Mock trending tokens data."""
    import random

    tokens = ["SOL", "BTC", "ETH", "DOGE", "WIF", "PEPE", "JUP", "RNDR", "ARB", "SUI"]
    return [
        {
            "token": t,
            "rank": i + 1,
            "mentionCount": random.randint(500, 50000),
            "smartEngagement": random.randint(100, 10000),
            "priceChange24h": round((random.random() - 0.5) * 20, 2),
        }
        for i, t in enumerate(tokens)
    ]


def _mock_mentions(keyword: str) -> dict:
    """Mock mentions data."""
    import random

    sentiments = ["bullish", "bearish", "neutral"]
    mentions = []
    for i in range(20):
        s = random.choice(sentiments)
        mentions.append(
            {
                "text": f"${keyword} looking {s} today. {'Great momentum!' if s == 'bullish' else 'Be careful out there.' if s == 'bearish' else 'Waiting for a clear signal.'}",
                "smartEngagement": random.randint(10, 5000),
                "source": random.choice(["twitter", "telegram"]),
                "createdAt": datetime.utcnow().isoformat(),
            }
        )
    return {"data": mentions, "total": len(mentions)}


def _mock_top_mentions() -> list[dict]:
    """Mock top mentions data."""
    import random

    tokens = ["SOL", "BTC", "ETH", "WIF", "PEPE", "DOGE", "JUP", "ARB"]
    return [
        {
            "keyword": t,
            "mentionCount": random.randint(1000, 100000),
            "smartEngagement": random.randint(500, 50000),
        }
        for t in tokens
    ]
