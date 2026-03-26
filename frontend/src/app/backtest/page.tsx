"use client";

import { useState } from "react";
import {
  FlaskConical,
  Loader2,
  TrendingUp,
  TrendingDown,
  Check,
  X,
  BarChart3,
} from "lucide-react";
import { TOP_MARKETS } from "@/lib/constants";

interface BacktestTrade {
  timestamp: string;
  alpha_score: number;
  direction: string;
  action: string;
  entry_price: number;
  exit_price: number;
  pnl_pct: number;
  correct: boolean;
  regime: string;
}

interface BacktestResult {
  symbol: string;
  period: string;
  total_signals: number;
  correct_signals: number;
  accuracy: number;
  total_pnl_pct: number;
  avg_win_pct: number;
  avg_loss_pct: number;
  win_rate: number;
  best_trade: number;
  worst_trade: number;
  sharpe_estimate: number;
  trades: BacktestTrade[];
  data_source?: string;
  candle_count?: number;
}

export default function BacktestPage() {
  const [selected, setSelected] = useState<string>(TOP_MARKETS[0]);
  const [data, setData] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runBacktest = async (symbol: string) => {
    setSelected(symbol);
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(`/api/backtest/${symbol}`);
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error("Backtest failed:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">
          <FlaskConical className="mr-2 inline h-6 w-6 text-purple-400" />
          Alpha Score Backtest
        </h1>
        <p className="mt-1 text-sm text-muted">
          Validate Alpha Score predictions against historical Pacifica data — no future data leakage
        </p>
      </div>

      {/* Market selector */}
      <div className="flex flex-wrap gap-2">
        {TOP_MARKETS.map((symbol) => (
          <button
            key={symbol}
            onClick={() => runBacktest(symbol)}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selected === symbol
                ? "bg-purple-400/20 text-purple-400"
                : "bg-card text-muted hover:bg-card-hover hover:text-foreground"
            } ${loading ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {symbol.replace("-USDC", "")}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-3 rounded-lg border border-purple-400/30 bg-purple-400/5 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
          <div>
            <p className="text-sm font-medium">Running backtest on {selected}...</p>
            <p className="text-xs text-muted">
              Computing Alpha Score at each historical point, checking against actual price movement
            </p>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className={`rounded-xl border-2 p-4 text-center ${data.accuracy >= 55 ? "border-success/30 bg-success/5" : "border-danger/30 bg-danger/5"}`}>
              <p className="text-xs text-muted">Accuracy</p>
              <p className={`font-mono text-4xl font-black ${data.accuracy >= 55 ? "text-success" : "text-danger"}`}>
                {data.accuracy}%
              </p>
              <p className="text-xs text-muted">{data.correct_signals}/{data.total_signals} correct</p>
            </div>
            <div className={`rounded-xl border border-border bg-card p-4 text-center`}>
              <p className="text-xs text-muted">Total P&L</p>
              <p className={`font-mono text-3xl font-bold ${data.total_pnl_pct >= 0 ? "text-success" : "text-danger"}`}>
                {data.total_pnl_pct >= 0 ? "+" : ""}{data.total_pnl_pct}%
              </p>
              <p className="text-xs text-muted">Cumulative return</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted">Win Rate</p>
              <p className="font-mono text-3xl font-bold">{data.win_rate}%</p>
              <p className="text-xs text-muted">Profitable trades</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xs text-muted">Sharpe Estimate</p>
              <p className={`font-mono text-3xl font-bold ${data.sharpe_estimate > 0.5 ? "text-success" : data.sharpe_estimate > 0 ? "text-warning" : "text-danger"}`}>
                {data.sharpe_estimate}
              </p>
              <p className="text-xs text-muted">Risk-adjusted return</p>
            </div>
          </div>

          {/* Win/Loss stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted">Avg Win</p>
              <p className="mt-1 font-mono text-lg font-bold text-success">+{data.avg_win_pct}%</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted">Avg Loss</p>
              <p className="mt-1 font-mono text-lg font-bold text-danger">{data.avg_loss_pct}%</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted">Best Trade</p>
              <p className="mt-1 font-mono text-lg font-bold text-success">+{data.best_trade}%</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted">Worst Trade</p>
              <p className="mt-1 font-mono text-lg font-bold text-danger">{data.worst_trade}%</p>
            </div>
          </div>

          {/* Period info + data source badge */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-muted" />
              <span className="text-muted">Period:</span>
              <span className="font-medium">{data.period}</span>
              <span className="text-muted">|</span>
              <span className="text-muted">Signals:</span>
              <span className="font-medium">{data.total_signals}</span>
              <span className="text-muted">|</span>
              <span className="text-muted">Candles:</span>
              <span className="font-medium">{data.candle_count ?? "—"}</span>
              <span className="text-muted">|</span>
              <span className="text-muted">Data:</span>
              {data.data_source === "pacifica_trade_stream" ? (
                <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs font-bold text-success">
                  Real Pacifica Trades
                </span>
              ) : (
                <span className="rounded-full bg-warning/20 px-2 py-0.5 text-xs font-bold text-warning">
                  Simulated
                </span>
              )}
            </div>
          </div>

          {/* Trade log */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-medium">Recent Signals (last 20)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="pb-2 pr-3">Time</th>
                    <th className="pb-2 pr-3">Score</th>
                    <th className="pb-2 pr-3">Action</th>
                    <th className="pb-2 pr-3">Entry</th>
                    <th className="pb-2 pr-3">Exit</th>
                    <th className="pb-2 pr-3">P&L</th>
                    <th className="pb-2 pr-3">Result</th>
                    <th className="pb-2">Regime</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trades.map((trade, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="py-2 pr-3 font-mono text-xs text-muted">
                        {trade.timestamp.split("T")[0] || trade.timestamp.slice(0, 10)}
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`font-mono font-bold ${trade.alpha_score > 58 ? "text-success" : trade.alpha_score < 42 ? "text-danger" : "text-warning"}`}>
                          {trade.alpha_score}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        <span className={`flex items-center gap-1 text-xs font-bold ${trade.action === "long" ? "text-success" : "text-danger"}`}>
                          {trade.action === "long" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {trade.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">${trade.entry_price.toLocaleString()}</td>
                      <td className="py-2 pr-3 font-mono text-xs">${trade.exit_price.toLocaleString()}</td>
                      <td className={`py-2 pr-3 font-mono text-xs font-bold ${trade.pnl_pct >= 0 ? "text-success" : "text-danger"}`}>
                        {trade.pnl_pct >= 0 ? "+" : ""}{trade.pnl_pct}%
                      </td>
                      <td className="py-2 pr-3">
                        {trade.correct ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <X className="h-4 w-4 text-danger" />
                        )}
                      </td>
                      <td className="py-2 text-xs text-muted">{trade.regime.replace("_", " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Methodology note */}
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-4 text-xs text-muted">
            <strong>Methodology:</strong> Alpha Score is computed at each hourly candle using only past data (no future leakage).
            Signals fire when score exceeds 60 (bullish) or drops below 40 (bearish). P&L is measured 4 hours after signal.
            {data.data_source === "pacifica_trade_stream" ? (
              <> Data source: <strong className="text-success">real Pacifica trades</strong> aggregated into OHLCV candles
              from the WebSocket trade stream. No synthetic or simulated data.</>
            ) : (
              <> Data source: simulated candles with mean-reverting trends. Real candle data is being collected
              from Pacifica&apos;s trade stream — once enough history accumulates, backtests will automatically switch to real data.</>
            )}
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <FlaskConical className="mx-auto h-16 w-16 text-purple-400/30" />
          <p className="mt-4 text-lg font-medium">Select a market to run backtest</p>
          <p className="mt-1 text-sm text-muted">
            Tests Alpha Score predictions against real historical Pacifica price data
          </p>
        </div>
      )}
    </div>
  );
}
