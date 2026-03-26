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


RISK_PROMPT = """You are a risk analyst evaluating a perpetual futures market on Pacifica DEX.

MARKET DATA:
- Symbol: {symbol}
- Price: ${price}
- 24h Change: {change_24h}%
- Funding Rate: {funding_rate}% (positive = longs pay shorts)
- Orderbook Imbalance: {ob_imbalance}

ALPHA SCORE SIGNALS (our proprietary quantitative analysis):
{alpha_signals}

LIQUIDATION RISK ASSESSMENT:
{liq_risk}

Your job: evaluate the RISK side. Are traders in danger? Is leverage too high?
Consider the Alpha Score signals as quantitative evidence — agree or disagree with them.

Respond in JSON:
{{
    "direction": "bullish" | "bearish" | "neutral",
    "confidence": 0.0-1.0,
    "score": 0.0-10.0 (10 = extremely bullish),
    "reasoning": "2-3 sentences referencing specific signals",
    "key_factors": ["factor1", "factor2", "factor3"]
}}"""


SENTIMENT_PROMPT = """You are a market sentiment analyst for crypto perpetual futures on Pacifica DEX.

MARKET DATA:
- Symbol: {symbol}
- Price: ${price}
- 24h Change: {change_24h}%
- 24h Volume: ${volume_24h}
- Funding Rate: {funding_rate}%

ALPHA SCORE SIGNALS (our proprietary quantitative analysis):
{alpha_signals}

FUNDING RATE PREDICTION:
{funding_prediction}

Your job: evaluate SENTIMENT. Is the crowd positioned wrong? Is there fear or greed?
Consider the Alpha Score signals and funding prediction as evidence — agree or disagree.

Respond in JSON:
{{
    "direction": "bullish" | "bearish" | "neutral",
    "confidence": 0.0-1.0,
    "score": 0.0-10.0 (10 = extremely bullish),
    "reasoning": "2-3 sentences referencing specific signals",
    "key_factors": ["factor1", "factor2", "factor3"]
}}"""


TECHNICAL_PROMPT = """You are a technical analyst specializing in crypto perpetual futures on Pacifica DEX.

MARKET DATA:
- Symbol: {symbol}
- Price: ${price}
- 24h High: ${high_24h}
- 24h Low: ${low_24h}
- Funding Rate: {funding_rate}%

ALPHA SCORE SIGNALS (our proprietary quantitative analysis):
{alpha_signals}

TRADE SUGGESTION FROM ALPHA SCORE:
{trade_suggestion}

Your job: evaluate the TECHNICAL picture. Do support/resistance levels confirm the Alpha Score?
Consider the quantitative signals as evidence — agree or challenge them with your own TA.

Respond in JSON:
{{
    "direction": "bullish" | "bearish" | "neutral",
    "confidence": 0.0-1.0,
    "score": 0.0-10.0 (10 = extremely bullish),
    "reasoning": "2-3 sentences referencing specific signals and price levels",
    "key_factors": ["factor1", "factor2", "factor3"]
}}"""


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
    try:
        funding = float(market_data.get("funding_rate", 0))
    except (ValueError, TypeError):
        funding = 0.0

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

    # Compute Alpha Score first — feeds quantitative signals into AI prompts
    from services.alpha_score import compute_alpha_score

    alpha = compute_alpha_score(
        symbol=symbol,
        price=price,
        candles=candles,
        orderbook=orderbook or {"bids": [], "asks": []},
        funding_rate=funding_rate,
        change_24h=change_24h,
        volume_24h=volume_24h,
    )

    alpha_signals = "\n".join(
        f"- {s.name.upper()}: {s.description} (signal: {s.value:+.2f}, weight: {s.weight * 100:.0f}%)"
        for s in alpha.signals
    )
    alpha_signals += (
        f"\n- COMPOSITE: Alpha Score {alpha.alpha_score:.0f}/100 ({alpha.direction.upper()}, {alpha.regime} regime)"
    )

    liq_risk_str = "N/A"
    if alpha.liquidation_risk:
        lr = alpha.liquidation_risk
        liq_risk_str = f"Risk: {lr.risk_level.upper()} ({lr.risk_score:.0f}/100), Cluster: {lr.nearest_cluster_distance:.1f}% {lr.cascade_direction}"

    funding_pred_str = "N/A"
    if alpha.funding_prediction:
        fp = alpha.funding_prediction
        funding_pred_str = f"Now: {fp.current_rate * 100:.4f}%, 1h: {fp.predicted_rate_1h * 100:.4f}%, 4h: {fp.predicted_rate_4h * 100:.4f}%, Arb APR: {fp.arbitrage_apr:.0f}%"

    trade_sugg_str = "N/A"
    if alpha.trade_suggestion:
        ts = alpha.trade_suggestion
        trade_sugg_str = f"{ts.action.upper()} | Entry: {ts.entry_zone} | Target: {ts.target} | Stop: {ts.stop_loss} | R:R 1:{ts.risk_reward}"

    ob_imbalance = "N/A"
    if orderbook:
        bids_list = orderbook.get("bids", [])
        asks_list = orderbook.get("asks", [])
        if bids_list and asks_list:
            bids_total = sum(
                float(b[1]) if isinstance(b, (list, tuple)) else float(b.get("size", 0)) for b in bids_list[:10]
            )
            asks_total = sum(
                float(a[1]) if isinstance(a, (list, tuple)) else float(a.get("size", 0)) for a in asks_list[:10]
            )
            if bids_total + asks_total > 0:
                ob_imbalance = f"{bids_total / (bids_total + asks_total):.1%} buy / {asks_total / (bids_total + asks_total):.1%} sell"

    market_data = {
        "symbol": symbol,
        "price": f"{price:,.2f}",
        "change_24h": f"{change_24h:.2f}",
        "funding_rate": f"{funding_rate * 100:.4f}",
        "ob_imbalance": ob_imbalance,
        "volume_24h": f"{volume_24h:,.0f}",
        "high_24h": f"{high_24h:,.2f}",
        "low_24h": f"{low_24h:,.2f}",
        "alpha_signals": alpha_signals,
        "liq_risk": liq_risk_str,
        "funding_prediction": funding_pred_str,
        "trade_suggestion": trade_sugg_str,
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
