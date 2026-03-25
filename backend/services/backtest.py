"""
Alpha Score Backtester — validates predictions against historical data.

Fetches historical candles from Pacifica, computes Alpha Score at each point,
and checks if the predicted direction matched actual price movement.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime

from services.alpha_score import compute_alpha_score

logger = logging.getLogger(__name__)


@dataclass
class BacktestTrade:
    """A single backtest trade entry."""

    timestamp: str
    alpha_score: float
    direction: str
    action: str
    entry_price: float
    exit_price: float
    pnl_pct: float
    correct: bool
    regime: str


@dataclass
class BacktestResult:
    """Complete backtest result for a symbol."""

    symbol: str
    period: str
    total_signals: int
    correct_signals: int
    accuracy: float
    total_pnl_pct: float
    avg_win_pct: float
    avg_loss_pct: float
    win_rate: float
    best_trade: float
    worst_trade: float
    sharpe_estimate: float
    trades: list[BacktestTrade] = field(default_factory=list)


def run_backtest(
    symbol: str,
    candles: list[dict],
    lookforward_periods: int = 4,
) -> BacktestResult:
    """
    Run backtest on historical candle data.

    For each point in time, compute Alpha Score using only past data,
    then check if the predicted direction matched the actual price
    movement over the next `lookforward_periods` candles.
    """
    if len(candles) < 50:
        return BacktestResult(
            symbol=symbol,
            period="insufficient",
            total_signals=0,
            correct_signals=0,
            accuracy=0,
            total_pnl_pct=0,
            avg_win_pct=0,
            avg_loss_pct=0,
            win_rate=0,
            best_trade=0,
            worst_trade=0,
            sharpe_estimate=0,
        )

    trades: list[BacktestTrade] = []
    window = 48  # Need 48 candles of history to compute signals

    for i in range(window, len(candles) - lookforward_periods):
        # Use only past data (no future leak)
        historical = candles[i - window : i]
        current_candle = candles[i]

        price = float(current_candle.get("close", current_candle.get("c", 0)))
        if price <= 0:
            continue

        # Compute funding rate from candle data if available
        funding = float(current_candle.get("fundingRate", 0))

        # Compute Alpha Score with only historical data
        alpha = compute_alpha_score(
            symbol=symbol,
            price=price,
            candles=historical,
            orderbook={"bids": [], "asks": []},
            funding_rate=funding,
            change_24h=0,
            volume_24h=float(current_candle.get("volume", current_candle.get("v", 0))),
        )

        # Only trade on strong signals (score > 60 or < 40)
        if 40 <= alpha.alpha_score <= 60:
            continue

        # Check future price
        future_candle = candles[i + lookforward_periods]
        future_price = float(future_candle.get("close", future_candle.get("c", 0)))
        if future_price <= 0:
            continue

        pnl_pct = ((future_price - price) / price) * 100
        if alpha.direction == "bearish":
            pnl_pct = -pnl_pct  # Short position

        correct = pnl_pct > 0
        action = "long" if alpha.direction == "bullish" else "short"

        timestamp = current_candle.get("timestamp", current_candle.get("t", ""))
        if isinstance(timestamp, (int, float)):
            timestamp = datetime.fromtimestamp(timestamp / 1000 if timestamp > 1e12 else timestamp).isoformat()

        trades.append(
            BacktestTrade(
                timestamp=str(timestamp),
                alpha_score=round(alpha.alpha_score, 1),
                direction=alpha.direction,
                action=action,
                entry_price=round(price, 2),
                exit_price=round(future_price, 2),
                pnl_pct=round(pnl_pct, 3),
                correct=correct,
                regime=alpha.regime,
            )
        )

    if not trades:
        return BacktestResult(
            symbol=symbol,
            period="no_signals",
            total_signals=0,
            correct_signals=0,
            accuracy=0,
            total_pnl_pct=0,
            avg_win_pct=0,
            avg_loss_pct=0,
            win_rate=0,
            best_trade=0,
            worst_trade=0,
            sharpe_estimate=0,
        )

    # Compute stats
    total = len(trades)
    correct_count = sum(1 for t in trades if t.correct)
    wins = [t.pnl_pct for t in trades if t.pnl_pct > 0]
    losses = [t.pnl_pct for t in trades if t.pnl_pct <= 0]
    all_pnl = [t.pnl_pct for t in trades]
    total_pnl = sum(all_pnl)

    avg_win = sum(wins) / len(wins) if wins else 0
    avg_loss = sum(losses) / len(losses) if losses else 0

    # Simple Sharpe estimate
    mean_pnl = total_pnl / total
    variance = sum((p - mean_pnl) ** 2 for p in all_pnl) / total
    std_pnl = variance**0.5
    sharpe = (mean_pnl / std_pnl) if std_pnl > 0 else 0

    # Determine period description
    if len(candles) > 0:
        first_ts = candles[0].get("timestamp", candles[0].get("t", 0))
        last_ts = candles[-1].get("timestamp", candles[-1].get("t", 0))
        if isinstance(first_ts, (int, float)) and isinstance(last_ts, (int, float)):
            if first_ts > 1e12:
                first_ts /= 1000
                last_ts /= 1000
            hours = (last_ts - first_ts) / 3600
            period = f"{hours:.0f}h ({hours / 24:.0f} days)"
        else:
            period = "unknown"
    else:
        period = "unknown"

    return BacktestResult(
        symbol=symbol,
        period=period,
        total_signals=total,
        correct_signals=correct_count,
        accuracy=round(correct_count / total * 100, 1),
        total_pnl_pct=round(total_pnl, 2),
        avg_win_pct=round(avg_win, 3),
        avg_loss_pct=round(avg_loss, 3),
        win_rate=round(len(wins) / total * 100, 1),
        best_trade=round(max(all_pnl), 3),
        worst_trade=round(min(all_pnl), 3),
        sharpe_estimate=round(sharpe, 2),
        trades=trades[-20:],  # Return last 20 trades only
    )
