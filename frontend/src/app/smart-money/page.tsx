"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Eye,
  Loader2,
} from "lucide-react";

interface ExchangeStats {
  total_traders: number;
  profitable_traders: number;
  profit_rate: number;
  total_equity_usd: number;
  total_open_interest_usd: number;
  volume_24h_usd: number;
  volume_all_time_usd: number;
}

interface Whale {
  address: string;
  full_address: string;
  equity: number;
  oi: number;
  pnl_1d: number;
  pnl_7d: number;
  pnl_all: number;
  volume_1d: number;
}

interface SmartSignal {
  symbol: string;
  smart_money_bias: "bullish" | "bearish" | "split";
  long_whales: number;
  short_whales: number;
  total_exposure_usd: number;
}

interface SmartMoneyData {
  whales_analyzed: number;
  whale_details: { address: string; pnl_all: number; positions: number }[];
  signals: SmartSignal[];
}

export default function SmartMoneyPage() {
  const router = useRouter();
  const [exchange, setExchange] = useState<ExchangeStats | null>(null);
  const [whales, setWhales] = useState<Whale[]>([]);
  const [hotTraders, setHotTraders] = useState<Whale[]>([]);
  const [smartMoney, setSmartMoney] = useState<SmartMoneyData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [lbRes, smRes] = await Promise.all([
        fetch("/api/pacifica/leaderboard"),
        fetch("/api/pacifica/smart-money"),
      ]);

      if (lbRes.ok) {
        const lb = await lbRes.json();
        if (lb.exchange) setExchange(lb.exchange);
        if (lb.whales) setWhales(lb.whales);
        if (lb.hot_traders) setHotTraders(lb.hot_traders);
      }

      if (smRes.ok) {
        const sm = await smRes.json();
        if (sm.signals) setSmartMoney(sm);
      }
    } catch {
      // Data unavailable
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 300000); // Refresh every 5 min
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">
          <Crown className="mr-2 inline h-6 w-6 text-yellow-400" />
          Smart Money
        </h1>
        <p className="mt-1 text-sm text-muted">
          Track what Pacifica&apos;s most profitable traders are doing right now — only possible because Pacifica&apos;s position data is public
        </p>
      </div>

      {loading && !exchange ? (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-400/30 bg-yellow-400/5 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
          <span className="text-sm">Analyzing 8,000+ Pacifica traders...</span>
        </div>
      ) : null}

      {/* Exchange overview */}
      {exchange && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted"><Users className="h-3.5 w-3.5" /> Traders</div>
            <p className="mt-1 font-mono text-2xl font-bold">{exchange.total_traders.toLocaleString()}</p>
            <p className="text-[10px] text-muted">{exchange.profit_rate}% profitable</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted"><DollarSign className="h-3.5 w-3.5" /> Open Interest</div>
            <p className="mt-1 font-mono text-2xl font-bold">${(exchange.total_open_interest_usd / 1e6).toFixed(1)}M</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted"><DollarSign className="h-3.5 w-3.5" /> 24h Volume</div>
            <p className="mt-1 font-mono text-2xl font-bold">${(exchange.volume_24h_usd / 1e6).toFixed(1)}M</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted"><DollarSign className="h-3.5 w-3.5" /> Total Volume</div>
            <p className="mt-1 font-mono text-2xl font-bold">${(exchange.volume_all_time_usd / 1e9).toFixed(1)}B</p>
          </div>
        </div>
      )}

      {/* Smart Money Signals */}
      {smartMoney && smartMoney.signals.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Eye className="h-5 w-5 text-yellow-400" />
            Smart Money Flow
            <span className="text-xs font-normal text-muted">What the top {smartMoney.whales_analyzed} most profitable traders are positioned</span>
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {smartMoney.signals.map((sig) => {
              const biasColor = sig.smart_money_bias === "bullish" ? "border-success/30 bg-success/5" : sig.smart_money_bias === "bearish" ? "border-danger/30 bg-danger/5" : "border-warning/30 bg-warning/5";
              const textColor = sig.smart_money_bias === "bullish" ? "text-success" : sig.smart_money_bias === "bearish" ? "text-danger" : "text-warning";
              return (
                <div key={sig.symbol} className={`rounded-lg border p-3 ${biasColor}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{sig.symbol}</span>
                    <span className={`flex items-center gap-1 text-xs font-bold ${textColor}`}>
                      {sig.smart_money_bias === "bullish" ? <TrendingUp className="h-3 w-3" /> : sig.smart_money_bias === "bearish" ? <TrendingDown className="h-3 w-3" /> : null}
                      {sig.smart_money_bias.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-muted">
                    <span className="text-success">{sig.long_whales} long</span>
                    <span className="text-danger">{sig.short_whales} short</span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted">
                    ${sig.total_exposure_usd >= 1e6 ? `${(sig.total_exposure_usd / 1e6).toFixed(1)}M` : `${(sig.total_exposure_usd / 1e3).toFixed(0)}K`} exposure
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Top Whales by Equity */}
      {whales.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Crown className="h-5 w-5 text-yellow-400" />
            Top Whales by Equity
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card text-left text-xs text-muted">
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Address</th>
                  <th className="px-4 py-2">Equity</th>
                  <th className="px-4 py-2">Open Interest</th>
                  <th className="px-4 py-2">24h P&L</th>
                  <th className="px-4 py-2">All-Time P&L</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {whales.map((w, i) => (
                  <tr key={w.address} className="border-b border-border/30 hover:bg-card-hover">
                    <td className="px-4 py-2 text-xs text-muted">{i + 1}</td>
                    <td className="px-4 py-2 font-mono text-xs">{w.address}</td>
                    <td className="px-4 py-2 font-mono">${(w.equity / 1e3).toFixed(0)}K</td>
                    <td className="px-4 py-2 font-mono">${(w.oi / 1e3).toFixed(0)}K</td>
                    <td className={`px-4 py-2 font-mono ${w.pnl_1d >= 0 ? "text-success" : "text-danger"}`}>
                      {w.pnl_1d >= 0 ? "+" : ""}${(w.pnl_1d / 1e3).toFixed(1)}K
                    </td>
                    <td className={`px-4 py-2 font-mono ${w.pnl_all >= 0 ? "text-success" : "text-danger"}`}>
                      {w.pnl_all >= 0 ? "+" : ""}${(w.pnl_all / 1e3).toFixed(0)}K
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => router.push(`/portfolio?address=${w.full_address}`)}
                        className="rounded px-2 py-1 text-[10px] text-primary hover:bg-primary/10"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Hot Traders (best 24h P&L) */}
      {hotTraders.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="h-5 w-5 text-success" />
            Hot Traders (Best 24h P&L)
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {hotTraders.slice(0, 5).map((t) => (
              <button
                key={t.address}
                onClick={() => router.push(`/portfolio?address=${t.full_address}`)}
                className="rounded-lg border border-success/20 bg-success/5 p-3 text-left transition-colors hover:border-success/40"
              >
                <p className="font-mono text-xs">{t.address}</p>
                <p className="mt-1 font-mono text-lg font-bold text-success">
                  +${(t.pnl_1d / 1e3).toFixed(1)}K
                </p>
                <p className="text-[10px] text-muted">today</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Why this is Pacifica-specific */}
      <div className="rounded-lg border border-dashed border-yellow-400/30 bg-yellow-400/5 p-4 text-xs text-muted">
        <strong className="text-yellow-400">Pacifica Exclusive:</strong> This page is only possible because
        Pacifica exposes position and order data publicly via their REST API. Most DEXs (Hyperliquid, dYdX, GMX)
        don&apos;t offer this level of transparency. Alpha Compass leverages this to give traders a unique edge:
        see what the smart money is doing before you trade.
      </div>
    </div>
  );
}
