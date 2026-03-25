"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Compass,
  Brain,
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  Zap,
  Target,
  Shield,
  ArrowRight,
} from "lucide-react";
import PriceCard from "@/components/PriceCard";
import {
  fetchPrices,
  fetchPortfolio,
  fetchFundingScan,
  type MarketPrice,
  type PortfolioSummary,
  type FundingScanResult,
} from "@/lib/api";
import { REFRESH_INTERVALS, TOP_MARKETS } from "@/lib/constants";
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
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [funding, setFunding] = useState<FundingScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [alphaScores, setAlphaScores] = useState<Record<string, AlphaScoreData>>({});
  const [alphaLoading, setAlphaLoading] = useState(false);

  const { lastTrades, connected: wsConnected } = usePacificaWebSocket([...TOP_MARKETS]);

  useEffect(() => {
    if (Object.keys(lastTrades).length === 0) return;
    setPrices((prev) =>
      prev.map((p) => {
        const trade = lastTrades[p.symbol];
        if (trade && trade.price) {
          return { ...p, price: parseFloat(String(trade.price)) };
        }
        return p;
      })
    );
  }, [lastTrades]);

  const loadData = useCallback(async () => {
    const [p, port, fund] = await Promise.all([
      fetchPrices(),
      fetchPortfolio(),
      fetchFundingScan(),
    ]);
    setPrices(p);
    setPortfolio(port);
    setFunding(fund);
    setLoading(false);
  }, []);

  // Load Alpha Scores for top 4 markets
  const loadAlphaScores = useCallback(async () => {
    setAlphaLoading(true);
    const top4 = TOP_MARKETS.slice(0, 4);
    const results = await Promise.allSettled(
      top4.map(async (symbol) => {
        const res = await fetch(`/api/alpha-score/${symbol}`);
        if (!res.ok) return null;
        return res.json();
      })
    );
    const scores: Record<string, AlphaScoreData> = {};
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value) {
        scores[r.value.symbol] = r.value;
      }
    });
    setAlphaScores(scores);
    setAlphaLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    loadAlphaScores();
    const interval = setInterval(loadData, REFRESH_INTERVALS.PRICES);
    return () => clearInterval(interval);
  }, [loadData, loadAlphaScores]);

  const pnlPositive = (portfolio?.total_unrealized_pnl ?? 0) >= 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      {/* Hero */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <Compass className="mr-2 inline h-6 w-6 text-primary" />
            Alpha Compass
          </h1>
          <p className="mt-1 text-sm text-muted">
            Proprietary trading intelligence for Pacifica DEX
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
          </h2>
          <button
            onClick={() => router.push("/alpha")}
            className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
          >
            Full analysis <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {alphaLoading ? (
          <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl bg-card" />
            ))}
          </div>
        ) : Object.keys(alphaScores).length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Object.values(alphaScores).map((score) => (
              <AlphaCard
                key={score.symbol}
                data={score}
                onClick={() => router.push(`/alpha?symbol=${score.symbol}`)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted">
            Alpha Scores loading — computing signals for top markets...
          </div>
        )}
      </section>

      {/* Portfolio summary */}
      {portfolio && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatCard
            label="Equity"
            value={`$${portfolio.total_equity.toLocaleString()}`}
            icon={<Wallet className="h-4 w-4 text-accent" />}
          />
          <StatCard
            label="Unrealized P&L"
            value={`${pnlPositive ? "+" : ""}$${portfolio.total_unrealized_pnl.toFixed(2)}`}
            icon={pnlPositive ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-danger" />}
            valueColor={pnlPositive ? "text-success" : "text-danger"}
          />
          <StatCard
            label="Margin Used"
            value={`$${portfolio.total_margin_used.toFixed(2)}`}
            icon={<BarChart3 className="h-4 w-4 text-warning" />}
          />
          <StatCard
            label="Available"
            value={`$${portfolio.available_balance.toLocaleString()}`}
            icon={<Wallet className="h-4 w-4 text-muted" />}
          />
          <StatCard
            label="Portfolio Heat"
            value={`${portfolio.portfolio_heat.toFixed(1)}%`}
            icon={<AlertTriangle className={`h-4 w-4 ${portfolio.portfolio_heat > 50 ? "text-danger" : "text-success"}`} />}
            valueColor={portfolio.portfolio_heat > 50 ? "text-danger" : "text-success"}
          />
        </div>
      )}

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
          <h2 className="mb-3 text-lg font-semibold">Funding Opportunities</h2>
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

      {/* Positions */}
      {portfolio && portfolio.positions.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Open Positions</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card text-left text-xs text-muted">
                  <th className="px-4 py-2">Market</th>
                  <th className="px-4 py-2">Side</th>
                  <th className="px-4 py-2">Size</th>
                  <th className="px-4 py-2">Entry</th>
                  <th className="px-4 py-2">Mark</th>
                  <th className="px-4 py-2">P&L</th>
                  <th className="px-4 py-2">Leverage</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.positions.map((pos) => (
                  <tr key={pos.symbol} className="border-b border-border/50 hover:bg-card-hover">
                    <td className="px-4 py-2 font-medium">{pos.symbol}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-bold ${pos.side === "long" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                        {pos.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono">{pos.size}</td>
                    <td className="px-4 py-2 font-mono">${pos.entry_price.toLocaleString()}</td>
                    <td className="px-4 py-2 font-mono">${pos.mark_price.toLocaleString()}</td>
                    <td className={`px-4 py-2 font-mono font-bold ${pos.unrealized_pnl >= 0 ? "text-success" : "text-danger"}`}>
                      {pos.unrealized_pnl >= 0 ? "+" : ""}${pos.unrealized_pnl.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 font-mono">{pos.leverage}x</td>
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
