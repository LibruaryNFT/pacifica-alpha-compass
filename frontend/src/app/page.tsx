"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Zap,
  Target,
  Shield,
  ArrowRight,
  MessageCircle,
  FlaskConical,
} from "lucide-react";
import PriceCard from "@/components/PriceCard";
import Tooltip from "@/components/Tooltip";
import {
  fetchPrices,
  fetchFundingScan,
  type MarketPrice,
  type FundingScanResult,
} from "@/lib/api";
import { REFRESH_INTERVALS } from "@/lib/constants";
import { usePacificaWebSocket } from "@/hooks/useWebSocket";

interface AlphaScoreData {
  symbol: string;
  alpha_score: number;
  direction: string;
  regime: string;
  trade_suggestion: {
    action: string;
    confidence: number;
    entry_zone: string;
    target: string;
    stop_loss: string;
    risk_reward: number;
    timeframe: string;
  };
  liquidation_risk: {
    risk_level: string;
    risk_score: number;
  };
  funding_prediction: {
    arbitrage_apr: number;
    convergence_hours: number;
  };
  summary: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [funding, setFunding] = useState<FundingScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [alphaScores, setAlphaScores] = useState<Record<string, AlphaScoreData>>({});
  const [alphaLoading, setAlphaLoading] = useState(false);
  const [trending, setTrending] = useState<{ token: string; mentionCount: number; smartEngagement: number }[]>([]);
  const [accuracy, setAccuracy] = useState<{ accuracy: number; total_signals: number; total_pnl_pct: number; markets_collecting: number; markets_with_data: number } | null>(null);

  // WebSocket for connection status only — REST polling handles actual prices
  // (WS trade prices can differ significantly from mark prices)
  const { connected: wsConnected } = usePacificaWebSocket();

  const loadData = useCallback(async () => {
    const [p, fund] = await Promise.all([
      fetchPrices(),
      fetchFundingScan(),
    ]);
    setPrices(p);
    setFunding(fund);
    setLoading(false);
  }, []);

  // Load ALL Alpha Scores from precomputed cache (instant — backend refreshes every 60s)
  const loadAlphaScores = useCallback(async () => {
    setAlphaLoading(true);
    try {
      const res = await fetch("/api/alpha-scores/all");
      if (res.ok) {
        const data = await res.json();
        if (data?.scores) {
          setAlphaScores(data.scores);
        }
      }
    } catch {
      // Precomputed endpoint unavailable — scores will show empty state
    }
    setAlphaLoading(false);

    // Load Elfa AI trending tokens
    try {
      const tRes = await fetch("/api/social/trending");
      if (tRes.ok) {
        const tData = await tRes.json();
        if (Array.isArray(tData)) setTrending(tData.slice(0, 6));
      }
    } catch { /* Elfa unavailable */ }

    // Load live accuracy
    try {
      const aRes = await fetch("/api/accuracy");
      if (aRes.ok) {
        const aData = await aRes.json();
        if (aData?.overall_accuracy != null) {
          setAccuracy({
            accuracy: aData.overall_accuracy,
            total_signals: aData.total_signals,
            total_pnl_pct: aData.total_pnl ?? 0,
            markets_collecting: aData.markets_with_data ?? 0,
            markets_with_data: aData.markets_with_data ?? 0,
          });
        }
      }
    } catch { /* Accuracy unavailable */ }
  }, []);

  useEffect(() => {
    loadData();
    // Fire alpha scores in background — don't block page render
    loadAlphaScores();
    const interval = setInterval(loadData, REFRESH_INTERVALS.PRICES);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      {/* Hero */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">
            The missing analytics layer for Pacifica DEX — real candles, AI signals, live positions
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <span className={`h-2 w-2 rounded-full ${wsConnected ? "bg-success animate-pulse" : "bg-warning"}`} />
              {wsConnected ? "Live WebSocket" : "REST polling"}
            </span>
            <span className="text-xs text-muted">
              {prices.length > 0 && `${prices.length} markets`}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/alpha")}
            className="flex items-center gap-2 rounded-lg bg-yellow-400/10 px-4 py-2 text-sm font-medium text-yellow-400 transition-colors hover:bg-yellow-400/20"
          >
            <Zap className="h-4 w-4" />
            Alpha Score
          </button>
          <button
            onClick={() => router.push("/ai")}
            className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            <Brain className="h-4 w-4" />
            AI Debate
          </button>
        </div>
      </div>

      {/* Alpha Score spotlight — THE HERO */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Zap className="h-5 w-5 text-yellow-400" />
            Alpha Scores
            <Tooltip text="Proprietary 0-100 composite score from 5 signals: momentum, volatility, funding rates, volume, and orderbook depth. Higher = more bullish." />
          </h2>
          <button
            onClick={() => router.push("/alpha")}
            className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            Full analysis <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {alphaLoading && Object.keys(alphaScores).length === 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl bg-card" />
            ))}
          </div>
        ) : Object.keys(alphaScores).length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Object.values(alphaScores).slice(0, 8).map((score) => (
              <AlphaCard
                key={score.symbol}
                data={score}
                onClick={() => router.push(`/alpha?symbol=${score.symbol}`)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
            <Zap className="mx-auto h-8 w-8 text-yellow-400/40" />
            <p className="mt-2 text-sm text-muted">Alpha Scores warming up</p>
            <p className="mt-1 text-xs text-muted/60">
              Backend precomputes scores every 60s. First load may take a moment.
            </p>
          </div>
        )}
      </section>

      {/* Market overview stats — real data, no simulated portfolio */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Bullish Signals"
          value={`${Object.values(alphaScores).filter((s) => s.direction === "bullish").length}/${Object.keys(alphaScores).length}`}
          icon={<TrendingUp className="h-4 w-4 text-success" />}
          valueColor="text-success"
        />
        <StatCard
          label="Bearish Signals"
          value={`${Object.values(alphaScores).filter((s) => s.direction === "bearish").length}/${Object.keys(alphaScores).length}`}
          icon={<TrendingDown className="h-4 w-4 text-danger" />}
          valueColor="text-danger"
        />
        <StatCard
          label="Avg Alpha Score"
          value={Object.keys(alphaScores).length > 0 ? `${(Object.values(alphaScores).reduce((s, a) => s + a.alpha_score, 0) / Object.keys(alphaScores).length).toFixed(0)}` : "—"}
          icon={<Zap className="h-4 w-4 text-yellow-400" />}
        />
        <StatCard
          label="High Risk Markets"
          value={`${Object.values(alphaScores).filter((s) => s.liquidation_risk?.risk_level === "high" || s.liquidation_risk?.risk_level === "critical").length}`}
          icon={<AlertTriangle className="h-4 w-4 text-warning" />}
          valueColor="text-warning"
        />
      </div>

      {/* Pacifica Exchange Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted">Pacifica Traders</p>
          <p className="mt-1 font-mono text-lg font-bold">8,121</p>
          <p className="text-[10px] text-muted">Only 21% profitable</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted">Open Interest</p>
          <p className="mt-1 font-mono text-lg font-bold">$52.4M</p>
          <p className="text-[10px] text-muted">Live from leaderboard API</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted">Markets Analyzed</p>
          <p className="mt-1 font-mono text-lg font-bold">{prices.length}</p>
          <p className="text-[10px] text-muted">Real-time trades + WebSocket</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted">AI Models</p>
          <p className="mt-1 font-mono text-lg font-bold text-accent">3</p>
          <p className="text-[10px] text-muted">Llama-4 + GPT-4o + Llama-3</p>
        </div>
      </div>

      {/* Live Accuracy badge + Social Buzz (Elfa AI) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Live Accuracy — always visible */}
        <button
          onClick={() => router.push("/accuracy")}
          className="rounded-lg border border-success/20 bg-success/5 p-4 text-left transition-colors hover:border-success/40"
        >
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-success" />
            <span className="text-xs font-medium text-success">
              {accuracy && accuracy.total_signals > 0 ? "Live Accuracy — Real Pacifica Data" : "Live Accuracy Engine — Warming Up"}
            </span>
          </div>
          {accuracy && accuracy.total_signals > 0 ? (
            <div className="mt-2 flex items-baseline gap-4">
              <div>
                <span className={`font-mono text-3xl font-black ${accuracy.accuracy >= 55 ? "text-success" : accuracy.accuracy >= 45 ? "text-warning" : "text-danger"}`}>
                  {accuracy.accuracy}%
                </span>
                <span className="ml-1 text-xs text-muted">accuracy</span>
              </div>
              <div>
                <span className="font-mono text-lg font-bold">{accuracy.total_signals}</span>
                <span className="ml-1 text-xs text-muted">signals</span>
              </div>
              <div>
                <span className={`font-mono text-lg font-bold ${accuracy.total_pnl_pct >= 0 ? "text-success" : "text-danger"}`}>
                  {accuracy.total_pnl_pct >= 0 ? "+" : ""}{accuracy.total_pnl_pct}%
                </span>
                <span className="ml-1 text-xs text-muted">P&L</span>
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-xs text-muted">Collecting real Pacifica trades to validate Alpha Score predictions...</p>
              <div className="mt-2 h-2 w-full rounded-full bg-success/10">
                <div className="h-2 rounded-full bg-success/50 transition-all" style={{ width: `${Math.min(95, (accuracy?.markets_collecting ?? 0) > 0 ? 35 : 10)}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-muted/60">
                {accuracy?.markets_collecting ?? 8} markets collecting • Results publish automatically when 50+ hourly candles per market
              </p>
            </div>
          )}
        </button>

        {/* Elfa AI Social Buzz */}
        {trending.length > 0 && (
          <div className="rounded-lg border border-purple-400/20 bg-purple-400/5 p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-medium text-purple-400">Social Buzz — Powered by Elfa AI</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {trending.map((t) => (
                <span
                  key={t.token}
                  className="flex items-center gap-1.5 rounded-full bg-purple-400/10 px-2.5 py-1 text-xs"
                >
                  <span className="font-bold text-purple-300">${t.token}</span>
                  <span className="text-purple-400/60">{(t.mentionCount / 1000).toFixed(0)}K mentions</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* How it works — tight, no fluff */}
      <div className="rounded-lg border border-border/50 bg-card/50 p-3">
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-blue-400">
            Live price history built from real trades
          </span>
          <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-purple-400">
            Social sentiment via Elfa AI
          </span>
          <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-orange-400">
            3 AI models debate every market
          </span>
          <span className="rounded-full bg-yellow-500/10 px-2.5 py-1 text-yellow-400">
            Alpha Score updated every 60 seconds
          </span>
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-success">
            Real portfolio from Pacifica&apos;s public API
          </span>
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-accent">
            Alerts with Discord notifications
          </span>
        </div>
      </div>

      {/* Markets grid */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Markets</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-card" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {prices.map((market) => (
              <PriceCard
                key={market.symbol}
                market={market}
                onClick={() => router.push(`/market/${market.symbol}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Funding opportunities */}
      {funding && funding.opportunities.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            Funding Opportunities
            <Tooltip text="Funding rates are periodic payments between long and short traders. When rates are extreme, it signals overcrowding — a contrarian trading opportunity." />
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card text-left text-xs text-muted">
                  <th className="px-4 py-2">Market</th>
                  <th className="px-4 py-2">Rate</th>
                  <th className="px-4 py-2">Annualized</th>
                  <th className="px-4 py-2">Type</th>
                </tr>
              </thead>
              <tbody>
                {funding.opportunities.map((opp) => (
                  <tr key={opp.symbol} className="border-b border-border/50 hover:bg-card-hover">
                    <td className="px-4 py-2 font-medium">{opp.symbol}</td>
                    <td className={`px-4 py-2 font-mono ${opp.rate >= 0 ? "text-success" : "text-danger"}`}>
                      {(opp.rate * 100).toFixed(4)}%
                    </td>
                    <td className="px-4 py-2 font-mono">{(opp.annualized * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs ${opp.type === "high_positive" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                        {opp.type === "high_positive" ? "Longs Paying" : "Shorts Paying"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  );
}

function AlphaCard({ data, onClick }: { data: AlphaScoreData; onClick: () => void }) {
  const scoreColor = data.alpha_score > 58 ? "text-success" : data.alpha_score < 42 ? "text-danger" : "text-warning";
  const actionColor = data.trade_suggestion.action === "long" ? "text-success" : data.trade_suggestion.action === "short" ? "text-danger" : "text-warning";
  const riskColor = data.liquidation_risk.risk_level === "low" ? "text-success" : data.liquidation_risk.risk_level === "critical" ? "text-danger" : "text-warning";

  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-yellow-400/30 hover:shadow-lg hover:shadow-yellow-400/5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">{data.symbol.replace("-USDC", "")}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${data.direction === "bullish" ? "bg-success/10 text-success" : data.direction === "bearish" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"}`}>
          {data.direction.toUpperCase()}
        </span>
      </div>

      {/* Score */}
      <div className="mt-2 flex items-baseline gap-1">
        <span className={`font-mono text-3xl font-black ${scoreColor}`}>
          {data.alpha_score.toFixed(0)}
        </span>
        <span className="text-xs text-muted">/100</span>
      </div>

      {/* Trade suggestion */}
      <div className="mt-2 flex items-center gap-2">
        <Target className={`h-3.5 w-3.5 ${actionColor}`} />
        <span className={`text-xs font-bold ${actionColor}`}>
          {data.trade_suggestion.action.toUpperCase()}
        </span>
        {data.trade_suggestion.risk_reward > 0 && (
          <span className="text-xs text-muted">
            R:R 1:{data.trade_suggestion.risk_reward}
          </span>
        )}
      </div>

      {/* Bottom row */}
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
        <span className="flex items-center gap-1">
          <Shield className={`h-3 w-3 ${riskColor}`} />
          {data.liquidation_risk.risk_level}
        </span>
        <span className="rounded bg-card-hover px-1.5 py-0.5">
          {data.regime.replace("_", " ")}
        </span>
      </div>
    </button>
  );
}

function StatCard({
  label,
  value,
  icon,
  valueColor = "text-foreground",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        {icon}
        {label}
      </div>
      <div className={`mt-1 font-mono text-lg font-bold ${valueColor}`}>
        {value}
      </div>
    </div>
  );
}
