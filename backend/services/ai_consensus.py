"""AI Consensus Engine — 3 models debate market conditions."""

import asyncio
import json
import logging
import os
from datetime import datetime

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI
from schemas import AIAnalysis, ConsensusResult, MarketDirection, MarketRegime

logger = logging.getLogger(__name__)

# Clients (initialized lazily)
_anthropic: AsyncAnthropic | None = None
_openai: AsyncOpenAI | None = None
_groq: AsyncOpenAI | None = None


def _get_anthropic() -> AsyncAnthropic:
    global _anthropic
    if _anthropic is None:
        _anthropic = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _anthropic


def _get_openai() -> AsyncOpenAI:
    global _openai
    if _openai is None:
        _openai = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _openai


def _get_groq() -> AsyncOpenAI:
    global _groq
    if _groq is None:
        _groq = AsyncOpenAI(
            api_key=os.getenv("GROQ_API_KEY"),
            base_url="https://api.groq.com/openai/v1",
        )
    return _groq


RISK_PROMPT = """You are a risk analyst evaluating a perpetual futures market.

Analyze the following market data and provide a risk assessment.

Market: {symbol}
Current Price: {price}
24h Change: {change_24h}%
Funding Rate: {funding_rate}%
Recent Candles (last 24h OHLCV): {candles}
Orderbook Imbalance: {ob_imbalance}

Respond in JSON format:
{{
    "direction": "bullish" | "bearish" | "neutral",
    "confidence": 0.0-1.0,
    "score": 0.0-10.0 (10 = extremely bullish),
    "reasoning": "2-3 sentence explanation",
    "key_factors": ["factor1", "factor2", "factor3"]
}}

Focus on: liquidation risk, funding rate sustainability, leverage concentration,
and whether current conditions are dangerous for traders."""


SENTIMENT_PROMPT = """You are a market sentiment analyst for crypto perpetual futures.

Analyze the following market data and determine the prevailing sentiment.

Market: {symbol}
Current Price: {price}
24h Change: {change_24h}%
24h Volume: {volume_24h}
Funding Rate: {funding_rate}%
Recent Candles (last 24h OHLCV): {candles}
Recent Trades (last 20): {recent_trades}

Respond in JSON format:
{{
    "direction": "bullish" | "bearish" | "neutral",
    "confidence": 0.0-1.0,
    "score": 0.0-10.0 (10 = extremely bullish),
    "reasoning": "2-3 sentence explanation",
    "key_factors": ["factor1", "factor2", "factor3"]
}}

Focus on: volume trends, buyer/seller aggression, funding rate sentiment,
and whether the market is showing conviction or indecision."""


TECHNICAL_PROMPT = """You are a technical analyst specializing in crypto perpetual futures.

Analyze the following market data and provide a technical outlook.

Market: {symbol}
Current Price: {price}
24h High: {high_24h}
24h Low: {low_24h}
Funding Rate: {funding_rate}%
Recent Candles (last 7 days, hourly OHLCV): {candles}

Respond in JSON format:
{{
    "direction": "bullish" | "bearish" | "neutral",
    "confidence": 0.0-1.0,
    "score": 0.0-10.0 (10 = extremely bullish),
    "reasoning": "2-3 sentence explanation",
    "key_factors": ["factor1", "factor2", "factor3"]
}}

Focus on: support/resistance levels, momentum, trend structure,
volume profile, and key price levels to watch."""


def _parse_ai_response(text: str) -> dict:
    """Extract JSON from AI response, handling markdown code blocks."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:])
        if text.endswith("```"):
            text = text[:-3]
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
        raise


async def _analyze_risk(market_data: dict) -> AIAnalysis:
    """Claude analyzes risk."""
    try:
        client = _get_anthropic()
        prompt = RISK_PROMPT.format(**market_data)
        resp = await client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )
        parsed = _parse_ai_response(resp.content[0].text)
        return AIAnalysis(
            model_name="claude",
            role="risk",
            direction=MarketDirection(parsed["direction"]),
            confidence=parsed["confidence"],
            score=parsed["score"],
            reasoning=parsed["reasoning"],
            key_factors=parsed.get("key_factors", []),
        )
    except Exception as e:
        logger.error(f"Claude risk analysis failed: {e}")
        return AIAnalysis(
            model_name="claude",
            role="risk",
            direction=MarketDirection.NEUTRAL,
            confidence=0.3,
            score=5.0,
            reasoning=f"Analysis unavailable: {e}",
            key_factors=["error"],
        )


async def _analyze_sentiment(market_data: dict) -> AIAnalysis:
    """GPT-4o analyzes sentiment."""
    try:
        client = _get_openai()
        prompt = SENTIMENT_PROMPT.format(**market_data)
        resp = await client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
        )
        parsed = _parse_ai_response(resp.choices[0].message.content)
        return AIAnalysis(
            model_name="gpt4o",
            role="sentiment",
            direction=MarketDirection(parsed["direction"]),
            confidence=parsed["confidence"],
            score=parsed["score"],
            reasoning=parsed["reasoning"],
            key_factors=parsed.get("key_factors", []),
        )
    except Exception as e:
        logger.error(f"GPT-4o sentiment analysis failed: {e}")
        return AIAnalysis(
            model_name="gpt4o",
            role="sentiment",
            direction=MarketDirection.NEUTRAL,
            confidence=0.3,
            score=5.0,
            reasoning=f"Analysis unavailable: {e}",
            key_factors=["error"],
        )


async def _analyze_technical(market_data: dict) -> AIAnalysis:
    """Llama-3 (via Groq) analyzes technicals."""
    try:
        client = _get_groq()
        prompt = TECHNICAL_PROMPT.format(**market_data)
        resp = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=500,
        )
        parsed = _parse_ai_response(resp.choices[0].message.content)
        return AIAnalysis(
            model_name="llama3",
            role="technical",
            direction=MarketDirection(parsed["direction"]),
            confidence=parsed["confidence"],
            score=parsed["score"],
            reasoning=parsed["reasoning"],
            key_factors=parsed.get("key_factors", []),
        )
    except Exception as e:
        logger.error(f"Llama technical analysis failed: {e}")
        return AIAnalysis(
            model_name="llama3",
            role="technical",
            direction=MarketDirection.NEUTRAL,
            confidence=0.3,
            score=5.0,
            reasoning=f"Analysis unavailable: {e}",
            key_factors=["error"],
        )


def _determine_regime(analyses: list[AIAnalysis]) -> MarketRegime:
    """Determine market regime from combined analysis."""
    factors = []
    for a in analyses:
        factors.extend(a.key_factors)

    factor_text = " ".join(factors).lower()
    if any(w in factor_text for w in ["volatile", "spike", "liquidation", "squeeze"]):
        return MarketRegime.VOLATILE
    if any(w in factor_text for w in ["trend", "momentum", "breakout", "continuation"]):
        return MarketRegime.TRENDING
    return MarketRegime.RANGING


def _generate_summary(
    symbol: str,
    direction: MarketDirection,
    confidence: float,
    analyses: list[AIAnalysis],
) -> str:
    """Generate a natural language summary from consensus."""
    agreement = sum(1 for a in analyses if a.direction == direction)
    strength = "strongly" if confidence > 0.7 else "moderately" if confidence > 0.5 else "weakly"

    summary = f"{symbol}: {agreement}/3 models agree — {strength} {direction.value}"
    summary += f" ({confidence:.0%} confidence)."

    # Add the most interesting factor from each model
    for a in analyses:
        if a.key_factors:
            summary += f" {a.model_name.upper()}: {a.key_factors[0]}."

    return summary


def _generate_alert(analyses: list[AIAnalysis], market_data: dict) -> str | None:
    """Generate an urgent alert if conditions are unusual."""
    funding = market_data.get("funding_rate", 0)

    # High funding rate alert
    if abs(funding) > 0.05:
        side = "longs" if funding > 0 else "shorts"
        return f"Extreme funding rate ({funding:.3f}%) — {side} paying heavy premium. Reversal risk elevated."

    # Strong disagreement alert
    directions = [a.direction for a in analyses]
    if len(set(directions)) == 3:
        return "All 3 AI models disagree — high uncertainty. Consider reducing exposure."

    return None


async def get_consensus(
    symbol: str,
    price: float,
    candles: list[dict],
    orderbook: dict | None = None,
    recent_trades: list[dict] | None = None,
    funding_rate: float = 0.0,
    change_24h: float = 0.0,
    volume_24h: float = 0.0,
    high_24h: float = 0.0,
    low_24h: float = 0.0,
) -> ConsensusResult:
    """Run 3 AI models in parallel and return weighted consensus."""

    # Prepare market data for prompts
    candle_summary = json.dumps(candles[-24:] if len(candles) > 24 else candles)
    ob_imbalance = "N/A"
    if orderbook:
        bids = sum(float(b[1]) for b in orderbook.get("bids", [])[:10])
        asks = sum(float(a[1]) for a in orderbook.get("asks", [])[:10])
        if bids + asks > 0:
            ob_imbalance = f"{bids / (bids + asks):.1%} buy / {asks / (bids + asks):.1%} sell"

    trade_summary = json.dumps((recent_trades or [])[:20])

    market_data = {
        "symbol": symbol,
        "price": price,
        "change_24h": change_24h,
        "funding_rate": funding_rate,
        "candles": candle_summary,
        "ob_imbalance": ob_imbalance,
        "volume_24h": volume_24h,
        "high_24h": high_24h,
        "low_24h": low_24h,
        "recent_trades": trade_summary,
    }

    # Run 3 models in parallel
    risk, sentiment, technical = await asyncio.gather(
        _analyze_risk(market_data),
        _analyze_sentiment(market_data),
        _analyze_technical(market_data),
    )

    analyses = [risk, sentiment, technical]

    # Weighted consensus
    weights = {"risk": 0.35, "sentiment": 0.35, "technical": 0.30}
    weighted_score = sum(a.score * weights[a.role] for a in analyses)

    # Direction by majority vote, weighted by confidence
    direction_scores: dict[MarketDirection, float] = {}
    for a in analyses:
        w = weights[a.role] * a.confidence
        direction_scores[a.direction] = direction_scores.get(a.direction, 0) + w

    consensus_direction = max(direction_scores, key=direction_scores.get)
    total_weight = sum(direction_scores.values())
    consensus_confidence = direction_scores[consensus_direction] / total_weight if total_weight > 0 else 0.5

    regime = _determine_regime(analyses)
    summary = _generate_summary(symbol, consensus_direction, consensus_confidence, analyses)
    alert = _generate_alert(analyses, market_data)

    return ConsensusResult(
        symbol=symbol,
        direction=consensus_direction,
        confidence=round(consensus_confidence, 3),
        overall_score=round(weighted_score, 2),
        regime=regime,
        summary=summary,
        analyses=analyses,
        alert=alert,
        timestamp=datetime.now().isoformat(),
    )
