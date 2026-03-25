# Alpha Score Methodology

## Overview

Alpha Score is a proprietary composite trading intelligence metric that condenses 5 independent signal categories into a single 0-100 score with directional bias, regime detection, and actionable trade suggestions.

**Why it exists:** Traders are overwhelmed by disconnected data — price charts, funding rates, orderbook depth, social sentiment, and volume patterns all tell different stories. Alpha Score synthesizes these into one number that answers: "Should I trade this market right now, and which direction?"

## Signal Architecture

```
                    ┌─────────────────────┐
                    │    Alpha Score       │
                    │     (0 - 100)        │
                    └─────────┬───────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
     ┌──────┴──────┐   ┌─────┴─────┐   ┌──────┴──────┐
     │  Momentum   │   │ Volatility│   │   Funding   │
     │    25%      │   │    15%    │   │     20%     │
     └─────────────┘   └───────────┘   └─────────────┘
            │                 │                 │
     ┌──────┴──────┐   ┌─────┴─────┐   ┌──────┴──────┐
     │   Volume    │   │ Orderbook │   │             │
     │    15%      │   │    25%    │   │             │
     └─────────────┘   └───────────┘   └─────────────┘
```

### 1. Momentum (25% weight)

**Inputs:** Hourly candle close prices (up to 50 periods)

**Calculations:**
- **EMA Crossover:** 7-period vs 25-period Exponential Moving Average. When EMA7 > EMA25, momentum is bullish. The signal strength scales with the percentage gap between the two EMAs.
- **Rate of Change (ROC):** 20-period price change as a percentage. Captures medium-term trend strength.
- **Combination:** 60% EMA crossover + 40% ROC, normalized to [-1, +1]

**Why these parameters:** EMA7/25 is the standard "fast/slow" crossover used by institutional quant systems. ROC at 20 periods captures weekly momentum on hourly charts. This pair detects both trend initiation (EMA cross) and trend continuation (ROC).

### 2. Volatility (15% weight)

**Inputs:** Hourly candle high/low/close prices (up to 30 periods)

**Calculations:**
- **ATR (Average True Range):** 14-period ATR as a percentage of current price. Measures realized volatility.
- **Bollinger Band Width:** 20-period standard deviation * 4, as percentage of the 20-period mean. Measures expected volatility range.
- **Squeeze Detection:** When BB width < 3% AND ATR < 1.5%, a volatility squeeze is detected — historically preceding significant breakouts.

**Signal mapping:**
- Squeeze detected → +0.5 (opportunity)
- ATR > 4% → -0.8 (danger — high volatility)
- ATR 2-4% → -0.3 (elevated risk)
- ATR < 2% → +0.2 (normal conditions)

**Why this matters:** Volatility squeezes are among the most reliable predictive patterns in derivative markets. Low volatility compresses, then explodes. Catching the squeeze before the breakout is alpha.

### 3. Funding Rate (20% weight)

**Inputs:** Current funding rate from Pacifica API

**Logic:** Funding rates represent the cost of holding a perpetual position. When funding is extremely positive (longs pay shorts), the market is overcrowded long — contrarian signal to short, and vice versa.

**Thresholds:**
- |rate| > 0.05% → Strong contrarian signal (opposite direction)
- |rate| > 0.02% → Moderate contrarian bias
- |rate| < 0.02% → Neutral

**Prediction model:** Mean-reversion with 15% hourly decay. Predicts 1h and 4h future funding rates, convergence timeline, and annualized arbitrage APR.

### 4. Volume (15% weight)

**Inputs:** Hourly candle volume data (up to 20 periods)

**Calculations:**
- **Volume Ratio:** Recent 5-period average / 20-period average. Detects unusual volume spikes.
- **Volume-Price Confirmation:** If volume surges (>1.5x) AND price moves in the same direction, the signal is strong. If volume surges but price doesn't move, it's absorption (potential reversal).

**Signal mapping:**
- Volume surge + bullish price → +0.7
- Volume surge + bearish price → -0.7
- Low volume (<0.5x avg) → 0 (no conviction)
- Normal volume → mild directional bias from price change

### 5. Orderbook Imbalance (25% weight)

**Inputs:** Top 10 bid/ask levels from Pacifica orderbook API

**Calculation:** `imbalance = (total_bid_depth - total_ask_depth) / (total_bid_depth + total_ask_depth)`

This produces a value from -1 (all asks, no bids) to +1 (all bids, no asks).

**Why 25% weight:** Orderbook data is the most immediate predictor of short-term price movement. Unlike lagging indicators (EMA, volume), the orderbook shows current intent. A 30%+ bid imbalance strongly predicts upward price pressure in the next 1-4 hours.

## Composite Scoring

Each signal produces a value in [-1, +1] with a confidence score (0-1). The composite is:

```
composite = Σ(signal_value × weight × confidence) / Σ(weight)
alpha_score = 50 + composite × 50
```

This maps to 0-100 where:
- **0-42:** Bearish
- **42-58:** Neutral
- **58-100:** Bullish

## Regime Detection

Based on the signal values, we classify the market into 5 regimes:

| Regime | Condition | Meaning |
|--------|-----------|---------|
| **Squeeze** | Volatility signal > 0.3 | Low vol compression, breakout imminent |
| **Volatile** | Volatility signal < -0.5 | High uncertainty, reduce exposure |
| **Trending Up** | Momentum > 0.5 | Strong bullish trend in progress |
| **Trending Down** | Momentum < -0.5 | Strong bearish trend in progress |
| **Ranging** | All else | No clear direction, mean-revert |

## Liquidation Cascade Risk

Combines three risk factors:

1. **Proximity risk:** How close is price to recent swing high/low (potential liquidation clusters)?
2. **OI risk:** How much open interest exists (more OI = more potential liquidations)?
3. **Funding risk:** Extreme funding means one side is overleveraged.

```
risk_score = proximity_risk + oi_risk + funding_risk  (capped at 100)
```

## Trade Suggestions

Based on the Alpha Score, regime, and risk assessment:

| Alpha Score | Liquidation Risk | Suggestion |
|-------------|-----------------|------------|
| > 65, bullish | Low/Medium | **LONG** with calculated entry/target/stop |
| < 35, bearish | Low/Medium | **SHORT** with calculated entry/target/stop |
| Any | Critical/High | **REDUCE** exposure |
| 45-55 | Any | **WAIT** — no clear edge |

Risk:reward is calculated using a 1.5% stop loss and variable target based on score strength.

## Limitations

1. **Not financial advice.** Alpha Score is a research tool, not a trading signal service.
2. **Relies on API data quality.** If Pacifica's API returns stale data, the score will be stale.
3. **No machine learning.** The current model uses rule-based heuristics, not trained models. Future versions could incorporate ML for parameter optimization.
4. **Hourly resolution.** The model works best on 1h-4h timeframes. Not suitable for scalping (<5min) or long-term (>1w) decisions.

## Future Development

- Backtest engine to validate score accuracy against historical data
- ML-optimized signal weights using gradient descent on Pacifica historical trades
- Multi-timeframe analysis (combine 15m, 1h, 4h signals)
- Cross-market correlation detection (when BTC squeezes, what happens to alts?)
