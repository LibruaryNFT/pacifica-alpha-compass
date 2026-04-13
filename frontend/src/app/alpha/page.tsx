"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Zap,
  Loader2,
  TrendingUp,
  Minus,
  AlertTriangle,
  Target,
  Shield,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { TOP_MARKETS } from "@/lib/constants";

interface AlphaScore {
  symbol: string;
  alpha_score: number;
  direction: string;
  regime: string;
  signals: {
    name: string;
    value: number;
    weight: number;
    confidence: number;
    description: string;
  }[];
  funding_prediction: {
    current_rate: number;
    predicted_rate_1h: number;
    predicted_rate_4h: number;
    convergence_hours: number;
    arbitrage_apr: number;
    direction: string;
  };
  liquidation_risk: {
    risk_level: string;
    risk_score: number;
    estimated_liquidation_volume: number;
    nearest_cluster_distance: number;
    cascade_direction: string;
    description: string;
  };
  trade_suggestion: {
    action: string;
    confidence: number;
    entry_zone: string;
    target: string;
    stop_loss: string;
    timeframe: string;
    reasoning: string;
    risk_reward: number;
  };
  summary: string;
}

const ACTION_CONFIG: Record<
  string,
  { color: string; bg: string; icon: typeof TrendingUp }
> = {
  long: { color: "text-success", bg: "bg-success/10", icon: ArrowUpRight },
  short: { color: "text-danger", bg: "bg-danger/10", icon: ArrowDownRight },
  wait: { color: "text-warning", bg: "bg-warning/10", icon: Clock },
  reduce: { color: "text-danger", bg: "bg-danger/10", icon: Shield },
  close: { color: "text-muted", bg: "bg-card", icon: Minus },
};

const RISK_COLORS: Record<string, string> = {
  low: "text-success",
  medium: "text-warning",
  high: "text-orange-400",
  critical: "text-danger",
};

export default function AlphaScorePage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-6"><div className="h-64 animate-pulse rounded-lg bg-card" /></div>}>
      <AlphaScoreContent />
    </Suspense>
  );
}

function AlphaScoreContent() {
  const searchParams = useSearchParams();
  const initialSymbol = searchParams.get("symbol") ?? TOP_MARKETS[0];
  const [selected, setSelected] = useState<string>(initialSymbol);
  const [data, setData] = useState<AlphaScore | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-analyze when navigated from dashboard with ?symbol=
  useEffect(() => {
    analyze(initialSymbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const analyze = async (symbol: string) => {
    setSelected(symbol);
    setLoading(true);
    setData(null);
    try {
      const res = await fetch(`/api/alpha-score/${symbol}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error("Alpha Score failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor =
    data && data.alpha_score > 58
      ? "text-success"
      : data && data.alpha_score < 42
        ? "text-danger"
        : "text-warning";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">
          <Zap className="mr-2 inline h-6 w-6 text-yellow-400" />
          Alpha Score
        </h1>
        <p className="mt-1 text-sm text-muted">
          Composite 0&ndash;100 score from 5 Pacifica signals: momentum, volatility, funding rates, volume, and orderbook depth. Above 58 = bullish, below 42 = bearish. Each signal is weighted and derived from live Pacifica API data &mdash; updated every 60 seconds.{" "}
          <a href="/methodology" className="text-primary hover:underline">Full methodology &rarr;</a>
        </p>
      </div>

      {/* Market selector */}
      <div className="flex flex-wrap gap-2">
        {TOP_MARKETS.map((symbol) => (
          <button
            key={symbol}
            onClick={() => analyze(symbol)}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selected === symbol
                ? "bg-yellow-400/20 text-yellow-400"
                : "bg-card text-muted hover:bg-card-hover hover:text-foreground"
            } ${loading ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {symbol.replace("-USDC", "")}
          </button>
        ))}
      </div>

      {/* Signal sources */}
      <div className="flex flex-wrap gap-2 text-[10px] text-muted">
        <span className="rounded bg-card px-2 py-1">Momentum → Pacifica candle data</span>
        <span className="rounded bg-card px-2 py-1">Volatility → Pacifica price range</span>
        <span className="rounded bg-card px-2 py-1">Funding → Pacifica on-chain rates</span>
        <span className="rounded bg-card px-2 py-1">Volume → Pacifica trade flow</span>
        <span className="rounded bg-card px-2 py-1">Orderbook → Pacifica bid/ask depth</span>
      </div>

      {loading && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-400/30 bg-yellow-400/5 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
          <div>
            <p className="text-sm font-medium">Computing Alpha Score for {selected}...</p>
            <p className="text-xs text-muted">
              Analyzing momentum, volatility, funding, volume, and orderbook
            </p>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Main score card */}
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Score */}
            <div className="rounded-xl border-2 border-yellow-400/30 bg-gradient-to-br from-yellow-400/5 to-background p-6 text-center">
              <p className="text-xs text-muted">Alpha Score</p>
              <p className={`font-mono text-6xl font-black ${scoreColor}`}>
                {data.alpha_score.toFixed(0)}
              </p>
              <p className="text-xs text-muted">/100</p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    data.direction === "bullish"
                      ? "bg-success/10 text-success"
                      : data.direction === "bearish"
                        ? "bg-danger/10 text-danger"
                        : "bg-warning/10 text-warning"
                  }`}
                >
                  {data.direction.toUpperCase()}
                </span>
                <span className="rounded-full bg-accent/10 px-3 py-1 text-xs text-accent">
                  {data.regime.replace("_", " ").toUpperCase()}
                </span>
              </div>
            </div>

            {/* Trade suggestion */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-xs text-muted">
                <Target className="h-4 w-4" />
                Trade Suggestion
              </div>
              {(() => {
                const cfg =
                  ACTION_CONFIG[data.trade_suggestion.action] ||
                  ACTION_CONFIG.wait;
                const Icon = cfg.icon;
                return (
                  <>
                    <div className="mt-3 flex items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${cfg.bg}`}
                      >
                        <Icon className={`h-6 w-6 ${cfg.color}`} />
                      </div>
                      <div>
                        <p className={`text-2xl font-bold ${cfg.color}`}>
                          {data.trade_suggestion.action.toUpperCase()}
                        </p>
                        <p className="text-xs text-muted">
                          {data.trade_suggestion.timeframe} timeframe
                        </p>
                      </div>
                    </div>
                    {data.trade_suggestion.risk_reward > 0 && (
                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted">Entry</span>
                          <span className="font-mono">
                            {data.trade_suggestion.entry_zone}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Target</span>
                          <span className="font-mono text-success">
                            {data.trade_suggestion.target}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted">Stop Loss</span>
                          <span className="font-mono text-danger">
                            {data.trade_suggestion.stop_loss}
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2">
                          <span className="text-muted">Risk:Reward</span>
                          <span className="font-mono font-bold text-accent">
                            1:{data.trade_suggestion.risk_reward}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
              {/* Execute on Pacifica + Paper Trade */}
              <div className="mt-4 flex gap-2">
                <a
                  href={`https://test-app.pacifica.fi/trade/${data.symbol.replace("-USDC", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-background transition-colors hover:bg-primary/80"
                >
                  Trade on Pacifica
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/orders", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          symbol: data.symbol,
                          side: data.trade_suggestion.action === "short" ? "short" : "long",
                          size: 1,
                          entry_price: parseFloat(String(data.trade_suggestion.entry_zone).replace(/[$,\s-]/g, "")) || 0,
                          target_price: parseFloat(String(data.trade_suggestion.target).replace(/[$,\s]/g, "")) || 0,
                          stop_price: parseFloat(String(data.trade_suggestion.stop_loss).replace(/[$,\s]/g, "")) || 0,
                          alpha_score: data.alpha_score,
                          direction: data.direction,
                          risk_reward: data.trade_suggestion.risk_reward,
                        }),
                      });
                      if (res.ok) {
                        alert(`Paper trade created: ${data.trade_suggestion.action.toUpperCase()} ${data.symbol}`);
                      }
                    } catch {
                      // Failed silently
                    }
                  }}
                  disabled={data.trade_suggestion.action === "wait" || data.trade_suggestion.action === "reduce"}
                  className="flex items-center gap-1.5 rounded-lg border border-primary/30 px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Paper Trade
                </button>
              </div>
            </div>

            {/* Liquidation risk */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 text-xs text-muted">
                <AlertTriangle className="h-4 w-4" />
                Liquidation Risk
              </div>
              <div className="mt-3">
                <p
                  className={`text-2xl font-bold ${
                    RISK_COLORS[data.liquidation_risk.risk_level] ||
                    "text-muted"
                  }`}
                >
                  {data.liquidation_risk.risk_level.toUpperCase()}
                </p>
                <div className="mt-1 h-2 rounded-full bg-card-hover">
                  <div
                    className={`h-full rounded-full transition-all ${
                      data.liquidation_risk.risk_score > 75
                        ? "bg-danger"
                        : data.liquidation_risk.risk_score > 50
                          ? "bg-orange-400"
                          : data.liquidation_risk.risk_score > 25
                            ? "bg-warning"
                            : "bg-success"
                    }`}
                    style={{
                      width: `${data.liquidation_risk.risk_score}%`,
                    }}
                  />
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted">Risk Score</span>
                  <span className="font-mono">
                    {data.liquidation_risk.risk_score}/100
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Nearest Cluster</span>
                  <span className="font-mono">
                    {data.liquidation_risk.nearest_cluster_distance}%{" "}
                    {data.liquidation_risk.cascade_direction}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Est. Liq Volume</span>
                  <span className="font-mono">
                    $
                    {(
                      data.liquidation_risk.estimated_liquidation_volume / 1e6
                    ).toFixed(1)}
                    M
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted">
                {data.liquidation_risk.description}
              </p>
            </div>
          </div>

          {/* Signal breakdown */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 text-sm font-medium">Signal Breakdown</h3>
            <div className="space-y-4">
              {data.signals.map((signal) => (
                <div key={signal.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium capitalize">
                      {signal.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted">
                        Weight: {(signal.weight * 100).toFixed(0)}%
                      </span>
                      <span
                        className={`font-mono text-xs font-bold ${
                          signal.value > 0.1
                            ? "text-success"
                            : signal.value < -0.1
                              ? "text-danger"
                              : "text-warning"
                        }`}
                      >
                        {signal.value > 0 ? "+" : ""}
                        {(signal.value * 100).toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-2 flex-1 rounded-full bg-card-hover">
                      <div
                        className="h-full rounded-full bg-accent transition-all"
                        style={{
                          width: `${Math.abs(signal.value) * 50 + 50}%`,
                          marginLeft:
                            signal.value < 0
                              ? `${50 - Math.abs(signal.value) * 50}%`
                              : "50%",
                        }}
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {signal.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Funding prediction */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 text-sm font-medium">
                Funding Rate Prediction
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Current</span>
                  <span
                    className={`font-mono font-bold ${
                      data.funding_prediction.current_rate > 0
                        ? "text-success"
                        : "text-danger"
                    }`}
                  >
                    {(data.funding_prediction.current_rate * 100).toFixed(4)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Predicted (1h)</span>
                  <span className="font-mono">
                    {(data.funding_prediction.predicted_rate_1h * 100).toFixed(
                      4
                    )}
                    %
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Predicted (4h)</span>
                  <span className="font-mono">
                    {(data.funding_prediction.predicted_rate_4h * 100).toFixed(
                      4
                    )}
                    %
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-2 text-sm">
                  <span className="text-muted">Convergence</span>
                  <span className="font-mono">
                    ~{data.funding_prediction.convergence_hours}h
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Arb APR</span>
                  <span className="font-mono font-bold text-accent">
                    {data.funding_prediction.arbitrage_apr}%
                  </span>
                </div>
              </div>
            </div>

            {/* Trade reasoning */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-4 text-sm font-medium">Trade Reasoning</h3>
              <p className="text-sm text-foreground/80">
                {data.trade_suggestion.reasoning}
              </p>
              <p className="mt-4 text-sm text-muted">{data.summary}</p>
            </div>
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Zap className="mx-auto h-16 w-16 text-yellow-400/30" />
          <p className="mt-4 text-lg font-medium">
            Select a market to compute Alpha Score
          </p>
          <p className="mt-1 text-sm text-muted">
            Analyzes 5 signal dimensions: momentum, volatility, funding,
            volume, orderbook
          </p>
        </div>
      )}
    </div>
  );
}
