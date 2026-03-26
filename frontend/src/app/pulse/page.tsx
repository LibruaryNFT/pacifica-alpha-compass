"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";

const SYMBOLS = ["BTC", "ETH", "SOL", "DOGE", "ARB", "AVAX", "LINK", "OP"];

interface RecentTrade {
  isBuy: boolean;
  usd: number;
  price: number;
  timestamp: number;
}

interface MarketState {
  symbol: string;
  price: number;
  recentTrades: RecentTrade[];
  buyCount: number;
  sellCount: number;
  totalVolume: number;
}

export default function PulsePage() {
  const [markets, setMarkets] = useState<Record<string, MarketState>>({});
  const [wsConnected, setWsConnected] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick every second to update "X seconds ago"
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Initialize with REST trades
  useEffect(() => {
    async function init() {
      const results = await Promise.allSettled(
        SYMBOLS.map(async (sym) => {
          const res = await fetch(`https://api.pacifica.fi/api/v1/trades?symbol=${sym}&limit=50`);
          if (!res.ok) return null;
          const data = await res.json();
          const trades = data?.data || [];
          if (trades.length === 0) return null;

          const recent: RecentTrade[] = [];
          let buyCount = 0;
          let sellCount = 0;
          let totalVol = 0;

          for (const t of trades.slice(0, 10)) {
            const price = parseFloat(t.price);
            const amount = parseFloat(t.amount);
            const usd = price * amount;
            const isBuy = t.side?.includes("open_long") || t.side?.includes("close_short");
            if (isBuy) buyCount++;
            else sellCount++;
            totalVol += usd;
            recent.push({ isBuy, usd, price, timestamp: t.created_at || Date.now() });
          }

          return {
            sym,
            price: parseFloat(trades[0].price),
            recentTrades: recent.slice(0, 5),
            buyCount,
            sellCount,
            totalVolume: totalVol,
          };
        })
      );

      const initial: Record<string, MarketState> = {};
      for (const r of results) {
        if (r.status !== "fulfilled" || !r.value) continue;
        const v = r.value;
        initial[v.sym] = {
          symbol: `${v.sym}-USDC`,
          price: v.price,
          recentTrades: v.recentTrades,
          buyCount: v.buyCount,
          sellCount: v.sellCount,
          totalVolume: v.totalVolume,
        };
      }
      setMarkets(initial);
    }
    init();
  }, []);

  // WebSocket for live trades
  useEffect(() => {
    const ws = new WebSocket("wss://ws.pacifica.fi/ws");
    ws.onopen = () => {
      setWsConnected(true);
      for (const sym of SYMBOLS) {
        ws.send(JSON.stringify({ method: "subscribe", params: { source: "trades", symbol: sym } }));
      }
      const ping = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ method: "ping" }));
      }, 30000);
      ws.addEventListener("close", () => clearInterval(ping));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.channel !== "trades" || !msg.data?.length) return;

        for (const raw of msg.data) {
          const sym = raw.s as string;
          const price = parseFloat(raw.p);
          const amount = parseFloat(raw.a) || 0;
          const usd = price * amount;
          const isBuy = raw.d?.includes("open_long") || raw.d?.includes("close_short");

          setMarkets((prev) => {
            const cur = prev[sym] || {
              symbol: `${sym}-USDC`, price: 0, recentTrades: [],
              buyCount: 0, sellCount: 0, totalVolume: 0,
            };

            const newTrade: RecentTrade = { isBuy, usd, price, timestamp: Date.now() };
            const trades = [newTrade, ...cur.recentTrades].slice(0, 5);

            return {
              ...prev,
              [sym]: {
                ...cur,
                price: price > 0 ? price : cur.price,
                recentTrades: trades,
                buyCount: cur.buyCount + (isBuy ? 1 : 0),
                sellCount: cur.sellCount + (isBuy ? 0 : 1),
                totalVolume: cur.totalVolume + usd,
              },
            };
          });
        }
      } catch { /* ignore */ }
    };

    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => ws.close();
    return () => { ws.onclose = null; ws.close(); };
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <Activity className="mr-2 inline h-6 w-6 text-primary" />
            Live Trades
          </h1>
          <p className="mt-1 text-sm text-muted">
            Real-time trade feed from Pacifica DEX — every trade, every market
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className={`h-2 w-2 rounded-full ${wsConnected ? "bg-success animate-pulse" : "bg-warning"}`} />
          {wsConnected ? "Live" : "Connecting..."}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SYMBOLS.map((sym) => {
          const m = markets[sym];
          if (!m) {
            return <div key={sym} className="h-48 animate-pulse rounded-xl bg-card" />;
          }

          const total = m.buyCount + m.sellCount;
          const buyPct = total > 0 ? Math.round((m.buyCount / total) * 100) : 50;
          const bias = buyPct > 60 ? "bullish" : buyPct < 40 ? "bearish" : "neutral";

          return (
            <div key={sym} className="rounded-xl border border-border bg-card p-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{sym}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  bias === "bullish" ? "bg-success/10 text-success" : bias === "bearish" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                }`}>
                  {buyPct}% buy
                </span>
              </div>

              {/* Price */}
              <p className="mt-1 font-mono text-2xl font-bold">
                ${m.price >= 1000
                  ? m.price.toLocaleString(undefined, { maximumFractionDigits: 0 })
                  : m.price >= 1
                    ? m.price.toFixed(2)
                    : m.price.toFixed(4)}
              </p>

              {/* Recent trades feed */}
              <div className="mt-3 space-y-1">
                {m.recentTrades.length === 0 ? (
                  <p className="text-[10px] text-muted">Waiting for trades...</p>
                ) : (
                  m.recentTrades.map((t, i) => {
                    const age = Math.round((now - t.timestamp) / 1000);
                    const isNew = age < 3;
                    return (
                      <div
                        key={`${t.timestamp}-${i}`}
                        className={`flex items-center justify-between text-[11px] transition-all duration-500 ${
                          isNew ? (t.isBuy ? "text-success font-bold" : "text-danger font-bold") : "text-muted"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${t.isBuy ? "bg-success" : "bg-danger"}`} />
                          <span>{t.isBuy ? "BUY" : "SELL"}</span>
                          <span className="font-mono">
                            ${t.usd >= 1e6
                              ? `${(t.usd / 1e6).toFixed(1)}M`
                              : t.usd >= 1000
                                ? `${(t.usd / 1000).toFixed(1)}K`
                                : t.usd.toFixed(0)}
                          </span>
                        </span>
                        <span className="text-[9px] text-muted/50">
                          {age < 60 ? `${age}s` : `${Math.round(age / 60)}m`}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Volume summary */}
              <div className="mt-2 flex items-center justify-between border-t border-border/30 pt-2 text-[10px] text-muted">
                <span>
                  Vol: ${m.totalVolume >= 1e6
                    ? `${(m.totalVolume / 1e6).toFixed(1)}M`
                    : m.totalVolume >= 1e3
                      ? `${(m.totalVolume / 1e3).toFixed(0)}K`
                      : m.totalVolume.toFixed(0)}
                </span>
                <span>{total} trades</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] text-muted">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400 inline-block mr-1.5" />
        Trades from Pacifica WebSocket (wss://ws.pacifica.fi/ws) + REST API initial load
      </div>
    </div>
  );
}
