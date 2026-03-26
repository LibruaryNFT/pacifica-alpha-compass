"use client";

import { useEffect, useState, useRef } from "react";
import { Activity } from "lucide-react";

const SYMBOLS = ["BTC", "ETH", "SOL", "DOGE", "ARB", "AVAX", "LINK", "OP"];

interface MarketState {
  symbol: string;
  price: number;
  trades: number;
  buys: number;
  momentum: number; // 0-100, 50=neutral, >50=bullish, <50=bearish
  lastFlash: number; // timestamp of last trade (for flash animation)
  lastSide: string;
}

export default function PulsePage() {
  const [markets, setMarkets] = useState<Record<string, MarketState>>({});
  const [wsConnected, setWsConnected] = useState(false);
  const marketsRef = useRef(markets);
  marketsRef.current = markets;

  // Initialize with prices from trades endpoint
  useEffect(() => {
    async function init() {
      const results = await Promise.allSettled(
        SYMBOLS.map(async (sym) => {
          const res = await fetch(`https://api.pacifica.fi/api/v1/trades?symbol=${sym}&limit=20`);
          if (!res.ok) return { sym, price: 0, buys: 10, total: 20 };
          const data = await res.json();
          const trades = data?.data || [];
          const price = trades.length > 0 ? parseFloat(trades[0].price) : 0;
          const buys = trades.filter((t: Record<string, string>) =>
            t.side?.includes("open_long") || t.side?.includes("close_short")
          ).length;
          return { sym, price, buys, total: trades.length };
        })
      );

      const initial: Record<string, MarketState> = {};
      for (const r of results) {
        if (r.status !== "fulfilled" || !r.value) continue;
        const { sym, price, buys, total } = r.value;
        initial[sym] = {
          symbol: `${sym}-USDC`,
          price,
          trades: total,
          buys,
          momentum: total > 0 ? (buys / total) * 100 : 50,
          lastFlash: 0,
          lastSide: "",
        };
      }
      setMarkets(initial);
    }
    init();
  }, []);

  // WebSocket for live updates
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
          const isBuy = raw.d?.includes("open_long") || raw.d?.includes("close_short");

          setMarkets((prev) => {
            const cur = prev[sym] || {
              symbol: `${sym}-USDC`, price: 0, trades: 0, buys: 0,
              momentum: 50, lastFlash: 0, lastSide: "",
            };

            const newTrades = cur.trades + 1;
            const newBuys = cur.buys + (isBuy ? 1 : 0);
            // Exponential moving average for momentum (smooth, doesn't reset)
            const newMomentum = cur.momentum * 0.92 + (isBuy ? 100 : 0) * 0.08;

            return {
              ...prev,
              [sym]: {
                ...cur,
                price: price > 0 ? price : cur.price,
                trades: newTrades,
                buys: newBuys,
                momentum: newMomentum,
                lastFlash: Date.now(),
                lastSide: isBuy ? "buy" : "sell",
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
            Market Pulse
          </h1>
          <p className="mt-1 text-sm text-muted">
            Live momentum across all Pacifica markets — bar fills green for buying, red for selling
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
            return (
              <div key={sym} className="h-36 animate-pulse rounded-xl bg-card" />
            );
          }

          const isBullish = m.momentum > 55;
          const isBearish = m.momentum < 45;
          const flashAge = Date.now() - m.lastFlash;
          const isFlashing = flashAge < 1500;
          const flashColor = m.lastSide === "buy" ? "ring-success/50" : "ring-danger/50";

          return (
            <div
              key={sym}
              className={`rounded-xl border border-border bg-card p-4 transition-all duration-300 ${
                isFlashing ? `ring-2 ${flashColor}` : ""
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{sym}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isBullish ? "bg-success/10 text-success" : isBearish ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                }`}>
                  {isBullish ? "BULLISH" : isBearish ? "BEARISH" : "NEUTRAL"}
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

              {/* Momentum bar — the key visualization */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-muted">
                  <span className="text-danger">Sellers</span>
                  <span className="font-mono font-bold">
                    {m.momentum.toFixed(0)}%
                  </span>
                  <span className="text-success">Buyers</span>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-card-hover">
                  {/* Red base (full width) */}
                  <div className="relative h-full w-full bg-danger/20">
                    {/* Green fill from left (represents buy momentum) */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${m.momentum}%`,
                        background: m.momentum > 55
                          ? "linear-gradient(90deg, rgba(34,197,94,0.3), rgba(34,197,94,0.7))"
                          : m.momentum < 45
                            ? "linear-gradient(90deg, rgba(239,68,68,0.3), rgba(239,68,68,0.5))"
                            : "linear-gradient(90deg, rgba(234,179,8,0.3), rgba(234,179,8,0.5))",
                      }}
                    />
                    {/* Center marker */}
                    <div className="absolute inset-y-0 left-1/2 w-px bg-muted/30" />
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
                <span>{m.trades} trades tracked</span>
                <span className="flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${isFlashing ? (m.lastSide === "buy" ? "bg-success" : "bg-danger") : "bg-muted/30"}`} />
                  {isFlashing ? (m.lastSide === "buy" ? "Buy" : "Sell") : "Waiting..."}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Data source */}
      <div className="flex items-center gap-2 text-[10px] text-muted">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
        Initial prices from Pacifica /trades API | Live momentum from WebSocket trade stream | Bar uses exponential moving average (doesn&apos;t reset)
      </div>
    </div>
  );
}
