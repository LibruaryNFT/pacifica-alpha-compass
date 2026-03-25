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
import { REFRESH_INTERVALS } from "@/lib/constants";

export default function Dashboard() {
  const router = useRouter();
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [funding, setFunding] = useState<FundingScanResult | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, REFRESH_INTERVALS.PRICES);
    return () => clearInterval(interval);
  }, [loadData]);

  const pnlPositive = (portfolio?.total_unrealized_pnl ?? 0) >= 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      {/* Hero section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <Compass className="mr-2 inline h-6 w-6 text-primary" />
            Alpha Compass
          </h1>
          <p className="mt-1 text-sm text-muted">
            AI-powered trading intelligence for Pacifica DEX
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
              Live data from Pacifica API
            </span>
            <span className="text-xs text-muted">
              {prices.length > 0 && `${prices.length} markets`}
            </span>
          </div>
        </div>
        <button
          onClick={() => router.push("/ai")}
          className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <Brain className="h-4 w-4" />
          Run AI Analysis
        </button>
      </div>

      {/* Portfolio summary bar */}
      {portfolio && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <StatCard
            label="Equity"
            value={`$${portfolio.total_equity.toLocaleString()}`}
            icon={<Wallet className="h-4 w-4 text-accent" />}
          />
          <StatCard
            label="Unrealized P&L"
            value={`${pnlPositive ? "+" : ""}$${portfolio.total_unrealized_pnl.toFixed(2)}`}
            icon={
              pnlPositive ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : (
                <TrendingDown className="h-4 w-4 text-danger" />
              )
            }
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
            icon={
              <AlertTriangle
                className={`h-4 w-4 ${
                  portfolio.portfolio_heat > 50 ? "text-danger" : "text-success"
                }`}
              />
            }
            valueColor={
              portfolio.portfolio_heat > 50 ? "text-danger" : "text-success"
            }
          />
        </div>
      )}

      {/* Market prices grid */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Markets</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-lg bg-card"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
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

      {/* Funding rate opportunities */}
      {funding && funding.opportunities.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            Funding Rate Opportunities
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card text-left text-xs text-muted">
                  <th className="px-4 py-2">Market</th>
                  <th className="px-4 py-2">Funding Rate</th>
                  <th className="px-4 py-2">Annualized</th>
                  <th className="px-4 py-2">Type</th>
                </tr>
              </thead>
              <tbody>
                {funding.opportunities.map((opp) => (
                  <tr
                    key={opp.symbol}
                    className="border-b border-border/50 hover:bg-card-hover"
                  >
                    <td className="px-4 py-2 font-medium">{opp.symbol}</td>
                    <td
                      className={`px-4 py-2 font-mono ${
                        opp.rate >= 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {(opp.rate * 100).toFixed(4)}%
                    </td>
                    <td className="px-4 py-2 font-mono">
                      {(opp.annualized * 100).toFixed(1)}%
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${
                          opp.type === "high_positive"
                            ? "bg-success/10 text-success"
                            : "bg-danger/10 text-danger"
                        }`}
                      >
                        {opp.type === "high_positive"
                          ? "Longs Paying"
                          : "Shorts Paying"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Open positions */}
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
                  <th className="px-4 py-2">Liq. Price</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.positions.map((pos) => (
                  <tr
                    key={pos.symbol}
                    className="border-b border-border/50 hover:bg-card-hover"
                  >
                    <td className="px-4 py-2 font-medium">{pos.symbol}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-bold ${
                          pos.side === "long"
                            ? "bg-success/10 text-success"
                            : "bg-danger/10 text-danger"
                        }`}
                      >
                        {pos.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono">{pos.size}</td>
                    <td className="px-4 py-2 font-mono">
                      ${pos.entry_price.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 font-mono">
                      ${pos.mark_price.toLocaleString()}
                    </td>
                    <td
                      className={`px-4 py-2 font-mono font-bold ${
                        pos.unrealized_pnl >= 0
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {pos.unrealized_pnl >= 0 ? "+" : ""}$
                      {pos.unrealized_pnl.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 font-mono">{pos.leverage}x</td>
                    <td className="px-4 py-2 font-mono text-warning">
                      ${pos.liquidation_price?.toLocaleString() ?? "N/A"}
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
