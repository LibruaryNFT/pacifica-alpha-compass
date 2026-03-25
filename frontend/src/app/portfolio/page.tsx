"use client";

import { useEffect, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { fetchPortfolio, type PortfolioSummary } from "@/lib/api";
import { REFRESH_INTERVALS } from "@/lib/constants";

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);

  useEffect(() => {
    const load = async () => setPortfolio(await fetchPortfolio());
    load();
    const interval = setInterval(load, REFRESH_INTERVALS.PORTFOLIO);
    return () => clearInterval(interval);
  }, []);

  if (!portfolio) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="h-64 animate-pulse rounded-lg bg-card" />
      </div>
    );
  }

  const heatColor =
    portfolio.portfolio_heat > 70
      ? "text-danger"
      : portfolio.portfolio_heat > 40
        ? "text-warning"
        : "text-success";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold">
        <Wallet className="mr-2 inline h-6 w-6 text-accent" />
        Portfolio
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted">Total Equity</p>
          <p className="mt-1 font-mono text-2xl font-bold">
            ${portfolio.total_equity.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted">Unrealized P&L</p>
          <p
            className={`mt-1 font-mono text-2xl font-bold ${
              portfolio.total_unrealized_pnl >= 0
                ? "text-success"
                : "text-danger"
            }`}
          >
            {portfolio.total_unrealized_pnl >= 0 ? "+" : ""}$
            {portfolio.total_unrealized_pnl.toFixed(2)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted">Available Balance</p>
          <p className="mt-1 font-mono text-2xl font-bold">
            ${portfolio.available_balance.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted">Portfolio Heat</p>
          <div className="mt-1 flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${heatColor}`} />
            <span className={`font-mono text-2xl font-bold ${heatColor}`}>
              {portfolio.portfolio_heat.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-card-hover">
            <div
              className={`h-full rounded-full transition-all ${
                portfolio.portfolio_heat > 70
                  ? "bg-danger"
                  : portfolio.portfolio_heat > 40
                    ? "bg-warning"
                    : "bg-success"
              }`}
              style={{ width: `${Math.min(portfolio.portfolio_heat, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Positions */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Open Positions</h2>
        {portfolio.positions.length === 0 ? (
          <p className="text-sm text-muted">No open positions</p>
        ) : (
          <div className="space-y-3">
            {portfolio.positions.map((pos) => (
              <div
                key={pos.symbol}
                className="rounded-lg border border-border bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">{pos.symbol}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold ${
                        pos.side === "long"
                          ? "bg-success/10 text-success"
                          : "bg-danger/10 text-danger"
                      }`}
                    >
                      {pos.side.toUpperCase()} {pos.leverage}x
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {pos.unrealized_pnl >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-danger" />
                    )}
                    <span
                      className={`font-mono text-lg font-bold ${
                        pos.unrealized_pnl >= 0
                          ? "text-success"
                          : "text-danger"
                      }`}
                    >
                      {pos.unrealized_pnl >= 0 ? "+" : ""}$
                      {pos.unrealized_pnl.toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-xs text-muted">Size</span>
                    <p className="font-mono">{pos.size}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Entry</span>
                    <p className="font-mono">
                      ${pos.entry_price.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Mark</span>
                    <p className="font-mono">
                      ${pos.mark_price.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Liquidation</span>
                    <p className="font-mono text-warning">
                      ${pos.liquidation_price?.toLocaleString() ?? "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
