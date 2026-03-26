"use client";

import { useState, useEffect } from "react";
import {
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Database,
  BarChart3,
  Loader2,
} from "lucide-react";
import { TOP_MARKETS } from "@/lib/constants";

interface MarketAccuracy {
  symbol: string;
  accuracy: number;
  win_rate: number;
  sharpe: number;
  total_signals: number;
  pnl: number;
  candles_collected: number;
  candles_needed: number;
}

interface AccuracyData {
  overall_accuracy: number;
  total_signals: number;
  total_pnl: number;
  markets_with_data: number;
  markets: Record<string, MarketAccuracy>;
  candle_stats: {
    total_collected: number;
    total_needed: number;
    markets_in_progress: string[];
  };
}

function AccuracyBadge({ accuracy }: { accuracy: number }) {
  let bgColor = "bg-yellow-400/10";
  let textColor = "text-yellow-400";

  if (accuracy > 55) {
    bgColor = "bg-success/10";
    textColor = "text-success";
  } else if (accuracy < 45) {
    bgColor = "bg-danger/10";
    textColor = "text-danger";
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${bgColor} ${textColor}`}
    >
      {accuracy.toFixed(1)}%
    </span>
  );
}

function formatPnL(pnl: number): string {
  const sign = pnl >= 0 ? "+" : "";
  return `${sign}$${pnl.toFixed(2)}`;
}

export default function AccuracyPage() {
  const [data, setData] = useState<AccuracyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccuracy = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/accuracy");
      if (!res.ok) {
        throw new Error(`Backend error: ${res.status}`);
      }
      const newData = await res.json();
      setData(newData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch accuracy data");
      console.error("Accuracy fetch failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccuracy();
    const interval = setInterval(fetchAccuracy, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          <FlaskConical className="mr-2 inline h-6 w-6 text-blue-400" />
          Live Accuracy Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted">
          Real-time performance metrics of Alpha Score across all markets
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm text-danger">Error: {error}</p>
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center gap-3 rounded-lg border border-blue-400/30 bg-blue-400/5 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
          <div>
            <p className="text-sm font-medium">Loading accuracy metrics...</p>
            <p className="text-xs text-muted">
              Computing live performance across all markets
            </p>
          </div>
        </div>
      ) : data ? (
        <>
          {/* Aggregate Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Overall Accuracy */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-xs text-muted">
                <BarChart3 className="h-4 w-4" />
                Overall Accuracy
              </div>
              <div className="mt-3">
                <p
                  className={`font-mono text-3xl font-black ${
                    data.overall_accuracy > 55
                      ? "text-success"
                      : data.overall_accuracy < 45
                        ? "text-danger"
                        : "text-warning"
                  }`}
                >
                  {data.overall_accuracy.toFixed(1)}%
                </p>
                <p className="mt-1 text-xs text-muted">
                  Across {data.markets_with_data} active markets
                </p>
              </div>
            </div>

            {/* Total Signals */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-xs text-muted">
                <TrendingUp className="h-4 w-4" />
                Total Signals
              </div>
              <div className="mt-3">
                <p className="font-mono text-3xl font-black text-accent">
                  {data.total_signals}
                </p>
                <p className="mt-1 text-xs text-muted">Since start of collection</p>
              </div>
            </div>

            {/* Total P&L */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-xs text-muted">
                {data.total_pnl >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                Total P&L
              </div>
              <div className="mt-3">
                <p
                  className={`font-mono text-3xl font-black ${
                    data.total_pnl >= 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {formatPnL(data.total_pnl)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Simulated on real candles
                </p>
              </div>
            </div>

            {/* Markets with Data */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-xs text-muted">
                <Database className="h-4 w-4" />
                Markets Ready
              </div>
              <div className="mt-3">
                <p className="font-mono text-3xl font-black text-accent">
                  {data.markets_with_data}/{TOP_MARKETS.length}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {data.markets_with_data === TOP_MARKETS.length
                    ? "All markets ready"
                    : `${TOP_MARKETS.length - data.markets_with_data} still collecting`}
                </p>
              </div>
            </div>
          </div>

          {/* Market Cards */}
          <div>
            <h2 className="mb-4 text-lg font-semibold">Market Breakdown</h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {TOP_MARKETS.map((symbol) => {
                const market = data.markets[symbol];

                if (!market) {
                  // Still collecting
                  const inProgress = data.candle_stats.markets_in_progress.includes(
                    symbol
                  );
                  const collectPercent = inProgress
                    ? (data.candle_stats.total_collected /
                        data.candle_stats.total_needed) *
                      100
                    : 0;

                  return (
                    <div
                      key={symbol}
                      className="rounded-xl border border-border bg-card p-6"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            {symbol.replace("-USDC", "")}
                          </p>
                          <p className="text-xs text-muted">Collecting data...</p>
                        </div>
                        <Loader2 className="h-5 w-5 animate-spin text-accent" />
                      </div>

                      {inProgress && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-muted">Progress</span>
                            <span className="font-mono text-foreground">
                              {data.candle_stats.total_collected}/
                              {data.candle_stats.total_needed}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-card-hover overflow-hidden">
                            <div
                              className="h-full bg-accent transition-all"
                              style={{ width: `${collectPercent}%` }}
                            />
                          </div>
                          <p className="mt-2 text-xs text-muted">
                            {Math.round(collectPercent)}% complete
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }

                // Market with data
                return (
                  <div
                    key={symbol}
                    className="rounded-xl border border-border bg-card p-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {symbol.replace("-USDC", "")}
                        </p>
                        <p className="text-xs text-muted">
                          {market.total_signals} signals
                        </p>
                      </div>
                      <AccuracyBadge accuracy={market.accuracy} />
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Win Rate</span>
                        <span className="font-mono">
                          {(market.win_rate * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Sharpe Ratio</span>
                        <span className="font-mono">{market.sharpe.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-3 text-sm">
                        <span className="text-muted">Signals</span>
                        <span className="font-mono">{market.total_signals}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">P&L</span>
                        <span
                          className={`font-mono font-semibold ${
                            market.pnl >= 0 ? "text-success" : "text-danger"
                          }`}
                        >
                          {formatPnL(market.pnl)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data Pipeline Status */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-medium">
              <Database className="h-4 w-4" />
              Data Pipeline Status
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted">Candles Collected</span>
                  <span className="font-mono">
                    {data.candle_stats.total_collected}/
                    {data.candle_stats.total_needed}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-card-hover overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all"
                    style={{
                      width: `${
                        (data.candle_stats.total_collected /
                          data.candle_stats.total_needed) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted">
                  {Math.round(
                    (data.candle_stats.total_collected /
                      data.candle_stats.total_needed) *
                      100
                  )}
                  % complete across all markets
                </p>
              </div>

              {data.candle_stats.markets_in_progress.length > 0 && (
                <div>
                  <p className="text-xs text-muted mb-2">
                    Markets currently collecting:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.candle_stats.markets_in_progress.map((symbol) => (
                      <span
                        key={symbol}
                        className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent"
                      >
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {symbol.replace("-USDC", "")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Methodology Note */}
          <div className="rounded-xl border border-blue-400/30 bg-blue-400/5 p-4">
            <p className="text-xs text-muted leading-relaxed">
              <span className="font-semibold text-blue-400">Methodology:</span>{" "}
              Live accuracy is computed by running Alpha Score on real OHLCV
              candles built from Pacifica&apos;s trade stream. No simulated data.
              Each market requires 50 candles (50 4-hour periods) before accuracy
              metrics become available. Sharpe ratio calculated over the signal
              period. P&L assumes entry/exit at signal prices.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
