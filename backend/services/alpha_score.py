"""
Alpha Score — Proprietary composite trading intelligence metric.

Combines 5 signal categories into a single 0-100 score with
directional bias, regime detection, and actionable trade suggestions.

This is the differentiator — no other analytics tool produces this metric.
"""

import logging
import math
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class SignalComponent:
    """Individual signal contributing to Alpha Score."""

    name: str
    value: float  # -1 to +1 (bearish to bullish)
    weight: float  # contribution weight
    confidence: float  # 0 to 1
    description: str = ""


@dataclass
class FundingPrediction:
    """Predicted funding rate and convergence timeline."""

    current_rate: float
    predicted_rate_1h: float
    predicted_rate_4h: float
    convergence_hours: Optional[float]  # hours until rate normalizes
    arbitrage_apr: float  # annualized return from funding arb
    direction: str  # "long_pays_short" or "short_pays_long"


@dataclass
class LiquidationRisk:
    """Liquidation cascade risk assessment."""

    risk_level: str  # "low", "medium", "high", "critical"
    risk_score: float  # 0-100
    estimated_liquidation_volume: float  # USD
    nearest_cluster_distance: float  # % from current price
    cascade_direction: str  # "above" or "below"
    description: str = ""


@dataclass
class TradeSuggestion:
    """Actionable trade suggestion with reasoning."""

    action: str  # "long", "short", "close", "wait", "reduce"
    confidence: float  # 0-1
    entry_zone: str  # price range
    target: str  # target price
    stop_loss: str  # stop loss price
    timeframe: str  # "1h", "4h", "1d"
    reasoning: str
    risk_reward: float  # risk/reward ratio


@dataclass
class AlphaScoreResult:
    """Complete Alpha Score analysis."""

    symbol: str
    alpha_score: float  # 0-100
    direction: str  # "bullish", "bearish", "neutral"
    regime: str  # "trending_up", "trending_down", "ranging", "volatile", "squeeze"
    signals: list[SignalComponent] = field(default_factory=list)
    funding_prediction: Optional[FundingPrediction] = None
    liquidation_risk: Optional[LiquidationRisk] = None
    trade_suggestion: Optional[TradeSuggestion] = None
    summary: str = ""


def compute_momentum_signal(candles: list[dict]) -> SignalComponent:
    """
    Compute momentum using Rate of Change + EMA crossover.
    Uses 7-period and 25-period EMAs on close prices.
    """
    if len(candles) < 25:
        return SignalComponent("momentum", 0, 0.25, 0.3, "Insufficient data")

    closes = [float(c.get("close", c.get("c", 0))) for c in candles[-50:]]
    if not closes or all(c == 0 for c in closes):
        return SignalComponent("momentum", 0, 0.25, 0.3, "No price data")

    # EMA calculation
    def ema(data: list[float], period: int) -> list[float]:
        k = 2 / (period + 1)
        result = [data[0]]
        for price in data[1:]:
            result.append(price * k + result[-1] * (1 - k))
        return result

    ema7 = ema(closes, 7)
    ema25 = ema(closes, 25)

    # EMA crossover signal (-1 to +1)
    if ema25[-1] == 0:
        cross_signal = 0.0
    else:
        cross_signal = max(-1, min(1, (ema7[-1] - ema25[-1]) / ema25[-1] * 50))

    # Rate of change (20 periods)
    roc_period = min(20, len(closes) - 1)
    if closes[-roc_period - 1] == 0:
        roc = 0.0
    else:
        roc = (closes[-1] - closes[-roc_period - 1]) / closes[-roc_period - 1]
    roc_signal = max(-1, min(1, roc * 10))

    # Combine
    value = cross_signal * 0.6 + roc_signal * 0.4
    confidence = min(1.0, len(candles) / 50)

    direction = "bullish" if value > 0.1 else "bearish" if value < -0.1 else "flat"
    desc = f"EMA7/25 {direction}, ROC {roc * 100:.1f}%"

    return SignalComponent("momentum", value, 0.25, confidence, desc)


def compute_volatility_signal(candles: list[dict]) -> SignalComponent:
    """
    Compute volatility regime using ATR and Bollinger Band width.
    High volatility = uncertain, low volatility = squeeze (potential breakout).
    """
    if len(candles) < 14:
        return SignalComponent("volatility", 0, 0.15, 0.3, "Insufficient data")

    highs = [float(c.get("high", c.get("h", 0))) for c in candles[-30:]]
    lows = [float(c.get("low", c.get("l", 0))) for c in candles[-30:]]
    closes = [float(c.get("close", c.get("c", 0))) for c in candles[-30:]]

    if not closes or closes[-1] == 0:
        return SignalComponent("volatility", 0, 0.15, 0.3, "No data")

    # ATR (14 period)
    trs = []
    for i in range(1, len(closes)):
        tr = max(highs[i] - lows[i], abs(highs[i] - closes[i - 1]), abs(lows[i] - closes[i - 1]))
        trs.append(tr)

    atr = sum(trs[-14:]) / 14 if len(trs) >= 14 else sum(trs) / max(len(trs), 1)
    atr_pct = atr / closes[-1] * 100

    # Bollinger Band width (20-period, 2 std dev)
    period = min(20, len(closes))
    recent = closes[-period:]
    mean = sum(recent) / len(recent)
    std = (sum((x - mean) ** 2 for x in recent) / len(recent)) ** 0.5
    bb_width = (std * 4) / mean * 100 if mean > 0 else 0

    # Squeeze detection: low BB width + low ATR = potential breakout
    is_squeeze = bb_width < 3 and atr_pct < 1.5

    # Signal: negative value = high vol (risky), positive = squeeze (opportunity)
    if is_squeeze:
        value = 0.5  # Squeeze = opportunity
        desc = f"SQUEEZE detected — BB width {bb_width:.1f}%, ATR {atr_pct:.2f}%"
    elif atr_pct > 4:
        value = -0.8  # Very volatile
        desc = f"HIGH volatility — ATR {atr_pct:.2f}%, BB {bb_width:.1f}%"
    elif atr_pct > 2:
        value = -0.3  # Moderately volatile
        desc = f"Elevated volatility — ATR {atr_pct:.2f}%"
    else:
        value = 0.2  # Normal
        desc = f"Normal volatility — ATR {atr_pct:.2f}%"

    return SignalComponent("volatility", value, 0.15, 0.8, desc)


def compute_funding_signal(funding_rate: float) -> SignalComponent:
    """
    Compute funding rate signal.
    Extreme funding = contrarian opportunity.
    """
    # Funding rate is typically -0.1% to +0.1% per 8h
    rate_pct = funding_rate * 100

    if abs(rate_pct) > 0.05:
        # Extreme funding = contrarian signal
        value = -math.copysign(min(1, abs(rate_pct) / 0.1), rate_pct)
        desc = f"Extreme funding {rate_pct:.4f}% — contrarian {('short' if rate_pct > 0 else 'long')} bias"
    elif abs(rate_pct) > 0.02:
        value = -math.copysign(0.3, rate_pct)
        desc = f"Elevated funding {rate_pct:.4f}%"
    else:
        value = 0
        desc = f"Neutral funding {rate_pct:.4f}%"

    return SignalComponent("funding", value, 0.20, 0.9, desc)


def compute_volume_signal(candles: list[dict]) -> SignalComponent:
    """
    Compute volume signal — rising volume confirms trend, falling contradicts.
    """
    if len(candles) < 10:
        return SignalComponent("volume", 0, 0.15, 0.3, "Insufficient data")

    volumes = [float(c.get("volume", c.get("v", 0))) for c in candles[-20:]]
    closes = [float(c.get("close", c.get("c", 0))) for c in candles[-20:]]

    if not volumes or sum(volumes) == 0:
        return SignalComponent("volume", 0, 0.15, 0.3, "No volume data")

    # Volume trend (recent vs average)
    recent_vol = sum(volumes[-5:]) / 5
    avg_vol = sum(volumes) / len(volumes)
    vol_ratio = recent_vol / avg_vol if avg_vol > 0 else 1

    # Price direction in recent candles
    price_change = (closes[-1] - closes[-5]) / closes[-5] if closes[-5] > 0 else 0

    # Volume confirms price = strong signal
    if vol_ratio > 1.5 and price_change > 0.01:
        value = 0.7
        desc = f"Volume surge ({vol_ratio:.1f}x) confirms bullish move"
    elif vol_ratio > 1.5 and price_change < -0.01:
        value = -0.7
        desc = f"Volume surge ({vol_ratio:.1f}x) confirms bearish move"
    elif vol_ratio < 0.5:
        value = 0
        desc = f"Low volume ({vol_ratio:.1f}x avg) — weak conviction"
    else:
        value = price_change * 5  # Mild directional bias
        value = max(-0.3, min(0.3, value))
        desc = f"Normal volume ({vol_ratio:.1f}x avg)"

    return SignalComponent("volume", value, 0.15, 0.7, desc)


def compute_orderbook_signal(orderbook: dict) -> SignalComponent:
    """
    Compute orderbook imbalance signal.
    More bids than asks = bullish pressure, vice versa.
    """
    bids = orderbook.get("bids", [])
    asks = orderbook.get("asks", [])

    if not bids or not asks:
        return SignalComponent("orderbook", 0, 0.25, 0.3, "No orderbook data")

    bid_depth = sum(
        float(b[1]) if isinstance(b, (list, tuple)) else float(b.get("size", b.get("qty", 0))) for b in bids[:10]
    )
    ask_depth = sum(
        float(a[1]) if isinstance(a, (list, tuple)) else float(a.get("size", a.get("qty", 0))) for a in asks[:10]
    )

    total = bid_depth + ask_depth
    if total == 0:
        return SignalComponent("orderbook", 0, 0.25, 0.3, "Empty orderbook")

    imbalance = (bid_depth - ask_depth) / total  # -1 to +1

    if abs(imbalance) > 0.3:
        desc = f"Strong {'bid' if imbalance > 0 else 'ask'} wall — {abs(imbalance) * 100:.0f}% imbalance"
    else:
        desc = f"Balanced book — {imbalance * 100:.0f}% skew"

    return SignalComponent("orderbook", imbalance, 0.25, 0.7, desc)


def predict_funding_rate(current_rate: float, candles: list[dict], change_24h: float) -> FundingPrediction:
    """
    Predict funding rate trajectory using mean-reversion model.
    Funding rates tend to revert to zero over time.
    """
    # Mean reversion: funding decays toward 0
    decay_1h = 0.85  # 15% decay per hour
    decay_4h = decay_1h**4

    predicted_1h = current_rate * decay_1h
    predicted_4h = current_rate * decay_4h

    # Trend bias: strong price moves push funding further
    trend_factor = change_24h / 100 * 0.001  # Small adjustment
    predicted_1h += trend_factor
    predicted_4h += trend_factor * 2

    # Convergence time (hours to reach < 0.001%)
    if abs(current_rate) < 0.00001:
        convergence = 0
    else:
        convergence = abs(math.log(0.00001 / abs(current_rate)) / math.log(decay_1h))
        convergence = min(convergence, 48)  # Cap at 48h

    # Annualized arbitrage return
    arb_apr = abs(current_rate) * 3 * 365 * 100  # 3 funding periods/day

    direction = "long_pays_short" if current_rate > 0 else "short_pays_long"

    return FundingPrediction(
        current_rate=current_rate,
        predicted_rate_1h=predicted_1h,
        predicted_rate_4h=predicted_4h,
        convergence_hours=round(convergence, 1),
        arbitrage_apr=round(arb_apr, 1),
        direction=direction,
    )


def assess_liquidation_risk(
    price: float, candles: list[dict], open_interest: float, funding_rate: float
) -> LiquidationRisk:
    """
    Assess liquidation cascade risk based on OI concentration,
    price proximity to key levels, and market stress indicators.
    """
    if not candles or price == 0:
        return LiquidationRisk("low", 10, 0, 100, "none", "Insufficient data")

    closes = [float(c.get("close", c.get("c", 0))) for c in candles[-48:]]

    # Find recent swing high/low (potential liquidation clusters)
    recent_high = max(closes[-24:]) if len(closes) >= 24 else max(closes)
    recent_low = min(closes[-24:]) if len(closes) >= 24 else min(closes)

    dist_to_high = (recent_high - price) / price * 100
    dist_to_low = (price - recent_low) / price * 100

    # Determine which side has more risk
    if abs(funding_rate) > 0.0005:
        # High funding = one side is overleveraged
        if funding_rate > 0:
            # Longs are paying → shorts could get squeezed above
            cascade_dir = "above"
            nearest_dist = dist_to_high
        else:
            cascade_dir = "below"
            nearest_dist = dist_to_low
    else:
        # Both sides roughly equal, pick closer level
        if dist_to_high < dist_to_low:
            cascade_dir = "above"
            nearest_dist = dist_to_high
        else:
            cascade_dir = "below"
            nearest_dist = dist_to_low

    # Risk score based on proximity and OI
    proximity_risk = max(0, 50 - nearest_dist * 10)  # Closer = riskier
    oi_risk = min(50, open_interest / 1e8 * 10) if open_interest > 0 else 0
    funding_risk = min(30, abs(funding_rate) * 100 * 300)

    risk_score = min(100, proximity_risk + oi_risk + funding_risk)

    if risk_score > 75:
        level = "critical"
        desc = f"High liquidation risk {cascade_dir} — OI concentrated near swing {'high' if cascade_dir == 'above' else 'low'}"
    elif risk_score > 50:
        level = "high"
        desc = f"Elevated risk — price {nearest_dist:.1f}% from liquidation cluster {cascade_dir}"
    elif risk_score > 25:
        level = "medium"
        desc = f"Moderate risk — some OI vulnerability {cascade_dir}"
    else:
        level = "low"
        desc = "Low liquidation cascade risk"

    est_volume = open_interest * (risk_score / 100) * 0.1 if open_interest > 0 else 0

    return LiquidationRisk(
        risk_level=level,
        risk_score=round(risk_score, 1),
        estimated_liquidation_volume=round(est_volume, 2),
        nearest_cluster_distance=round(nearest_dist, 2),
        cascade_direction=cascade_dir,
        description=desc,
    )


def generate_trade_suggestion(
    symbol: str,
    price: float,
    alpha_score: float,
    direction: str,
    signals: list[SignalComponent],
    funding_pred: FundingPrediction,
    liq_risk: LiquidationRisk,
) -> TradeSuggestion:
    """
    Generate specific, actionable trade suggestion based on all signals.
    """
    confidence = alpha_score / 100

    # Determine action
    if alpha_score > 65 and direction == "bullish":
        action = "long"
        target_pct = 3 + (alpha_score - 65) * 0.1
        stop_pct = 1.5
    elif alpha_score < 35 and direction == "bearish":
        action = "short"
        target_pct = 3 + (35 - alpha_score) * 0.1
        stop_pct = 1.5
    elif liq_risk.risk_level in ("critical", "high"):
        action = "reduce"
        target_pct = 0
        stop_pct = 0
    elif 45 <= alpha_score <= 55:
        action = "wait"
        target_pct = 0
        stop_pct = 0
    else:
        action = "wait"
        target_pct = 0
        stop_pct = 0

    # Calculate levels
    if action == "long":
        entry = f"${price * 0.998:.2f} - ${price * 1.002:.2f}"
        target = f"${price * (1 + target_pct / 100):.2f}"
        stop = f"${price * (1 - stop_pct / 100):.2f}"
        rr = target_pct / stop_pct
    elif action == "short":
        entry = f"${price * 0.998:.2f} - ${price * 1.002:.2f}"
        target = f"${price * (1 - target_pct / 100):.2f}"
        stop = f"${price * (1 + stop_pct / 100):.2f}"
        rr = target_pct / stop_pct
    else:
        entry = f"${price:.2f}"
        target = "N/A"
        stop = "N/A"
        rr = 0

    # Build reasoning from signals
    top_signals = sorted(signals, key=lambda s: abs(s.value * s.weight), reverse=True)[:3]
    reasons = [s.description for s in top_signals if s.description]
    if funding_pred.arbitrage_apr > 20:
        reasons.append(f"Funding arb opportunity: {funding_pred.arbitrage_apr:.0f}% APR")
    if liq_risk.risk_level in ("high", "critical"):
        reasons.append(f"Liquidation risk: {liq_risk.description}")

    reasoning = ". ".join(reasons) if reasons else "Mixed signals — no clear edge"

    timeframe = "4h" if alpha_score > 60 or alpha_score < 40 else "1h"

    return TradeSuggestion(
        action=action,
        confidence=round(confidence, 2),
        entry_zone=entry,
        target=target,
        stop_loss=stop,
        timeframe=timeframe,
        reasoning=reasoning,
        risk_reward=round(rr, 1),
    )


def compute_alpha_score(
    symbol: str,
    price: float,
    candles: list[dict],
    orderbook: dict,
    funding_rate: float,
    change_24h: float,
    volume_24h: float,
    open_interest: float = 0,
) -> AlphaScoreResult:
    """
    Compute the full Alpha Score — our proprietary composite metric.

    Combines 5 signal categories:
    1. Momentum (EMA crossover + ROC) — 25%
    2. Volatility (ATR + BB width + squeeze) — 15%
    3. Funding (contrarian + prediction) — 20%
    4. Volume (confirmation + divergence) — 15%
    5. Orderbook (imbalance + depth) — 25%
    """
    # Compute all signals
    momentum = compute_momentum_signal(candles)
    volatility = compute_volatility_signal(candles)
    funding = compute_funding_signal(funding_rate)
    volume = compute_volume_signal(candles)
    orderbook_sig = compute_orderbook_signal(orderbook)

    signals = [momentum, volatility, funding, volume, orderbook_sig]

    # Weighted composite: -1 to +1
    total_weight = sum(s.weight for s in signals)
    composite = sum(s.value * s.weight * s.confidence for s in signals) / total_weight if total_weight > 0 else 0

    # Map to 0-100 scale (50 = neutral)
    alpha_score = max(0, min(100, 50 + composite * 50))

    # Direction
    if alpha_score > 58:
        direction = "bullish"
    elif alpha_score < 42:
        direction = "bearish"
    else:
        direction = "neutral"

    # Regime detection
    vol_val = volatility.value
    mom_val = momentum.value
    if vol_val > 0.3:
        regime = "squeeze"
    elif vol_val < -0.5:
        regime = "volatile"
    elif abs(mom_val) > 0.5:
        regime = "trending_up" if mom_val > 0 else "trending_down"
    else:
        regime = "ranging"

    # Predictions
    funding_pred = predict_funding_rate(funding_rate, candles, change_24h)
    liq_risk = assess_liquidation_risk(price, candles, open_interest, funding_rate)

    # Trade suggestion
    trade = generate_trade_suggestion(symbol, price, alpha_score, direction, signals, funding_pred, liq_risk)

    # Summary
    signal_strs = [f"{s.name}: {s.description}" for s in signals]
    summary = (
        f"Alpha Score {alpha_score:.0f}/100 ({direction.upper()}) — "
        f"{regime.replace('_', ' ')} market. "
        f"Suggestion: {trade.action.upper()} "
        f"({'R:R ' + str(trade.risk_reward) if trade.risk_reward > 0 else 'no trade'}). "
        f"Key: {signals[0].description}"
    )

    return AlphaScoreResult(
        symbol=symbol,
        alpha_score=round(alpha_score, 1),
        direction=direction,
        regime=regime,
        signals=signals,
        funding_prediction=funding_pred,
        liquidation_risk=liq_risk,
        trade_suggestion=trade,
        summary=summary,
    )
