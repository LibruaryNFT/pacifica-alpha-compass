"use client";

import { useEffect, useState, useRef } from "react";
import { Activity } from "lucide-react";

const SYMBOLS = ["BTC", "ETH", "SOL", "DOGE", "ARB", "AVAX", "LINK", "OP"];

interface MarketState {
  symbol: string;
  price: number;
  trades: number;
  buyVolume: number;   // USD volume of buys
  sellVolume: number;  // USD volume of sells
  totalVolume: number; // total USD volume
  momentum: number;    // 0-100, 50=neutral, >50=bullish, <50=bearish
  lastFlash: number;
  lastSide: string;
  lastSize: number;    // USD value of last trade
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
          const res = await fetch(`https://api.pacifica.fi/api/v1/trades?symbol=${sym}&limit=50`);
          if (!res.ok) return null;
          const data = await res.json();
          const trades = data?.data || [];
          if (trades.length === 0) return null;

          const price = parseFloat(trades[0].price);
          let buyVol = 0;
          let sellVol = 0;

          for (const t of trades) {
            const usd = parseFloat(t.price) * parseFloat(t.amount);
            const isBuy = t.side?.includes("open_long") || t.side?.includes("close_short");
            if (isBuy) buyVol += usd;
            else sellVol += usd;
          }

          const total = buyVol + sellVol;
          const momentum = total > 0 ? (buyVol / total) * 100 : 50;

          return { sym, price, buyVol, sellVol, total, trades: trades.length, momentum };
        })
      );

      const initial: Record<string, MarketState> = {};
      for (const r of results) {
        if (r.status !== "fulfilled" || !r.value) continue;
        const v = r.value;
        initial[v.sym] = {
          symbol: `${v.sym}-USDC`,
          price: v.price,
          trades: v.trades,
          buyVolume: v.buyVol,
          sellVolume: v.sellVol,
          totalVolume: v.total,
          momentum: v.momentum,
          lastFlash: 0,
          lastSide: "",
          lastSize: 0,
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

          const amount = parseFloat(raw.a) || 0;
          const usdValue = price * amount;

          setMarkets((prev) => {
            const cur = prev[sym] || {
              symbol: `${sym}-USDC`, price: 0, trades: 0,
              buyVolume: 0, sellVolume: 0, totalVolume: 0,
              momentum: 50, lastFlash: 0, lastSide: "", lastSize: 0,
            };

            const newBuyVol = cur.buyVolume + (isBuy ? usdValue : 0);
            const newSellVol = cur.sellVolume + (isBuy ? 0 : usdValue);
            const newTotal = newBuyVol + newSellVol;

            // Volume-weighted EMA: bigger trades move the bar more
            const weight = Math.min(0.15, usdValue / 50000); // $50K trade = max 15% influence
            const newMomentum = cur.momentum * (1 - weight) + (isBuy ? 100 : 0) * weight;

            return {
              ...prev,
              [sym]: {
                ...cur,
                price: price > 0 ? price : cur.price,
                trades: cur.trades + 1,
                buyVolume: newBuyVol,
                sellVolume: newSellVol,
                totalVolume: newTotal,
                momentum: newMomentum,
                lastFlash: Date.now(),
                lastSide: isBuy ? "buy" : "sell",
                lastSize: usdValue,
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
            Live momentum across all Pacifica markets — volume-weighted buy/sell pressure from real trades
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

              {/* Momentum bar — volume-weighted buy/sell pressure */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-muted">
                  <span className="text-danger">Sell pressure</span>
                  <span className="font-mono font-bold">
                    {m.momentum > 55 ? "Strong Buy" : m.momentum < 45 ? "Strong Sell" : "Neutral"} ({m.momentum.toFixed(0)}%)
                  </span>
                  <span className="text-success">Buy pressure</span>
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

              <p className="mt-1 text-center text-[9px] text-muted/50">Vol-weighted EMA • updates live</p>

              {/* Volume + last trade */}
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
                <span>
                  Vol: ${m.totalVolume >= 1e6
                    ? `${(m.totalVolume / 1e6).toFixed(1)}M`
                    : m.totalVolume >= 1e3
                      ? `${(m.totalVolume / 1e3).toFixed(0)}K`
                      : m.totalVolume.toFixed(0)}
                </span>
                <span className="flex items-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${isFlashing ? (m.lastSide === "buy" ? "bg-success" : "bg-danger") : "bg-muted/30"}`} />
                  {isFlashing && m.lastSize > 0
                    ? `${m.lastSide === "buy" ? "Buy" : "Sell"} $${m.lastSize >= 1000 ? `${(m.lastSize / 1000).toFixed(1)}K` : m.lastSize.toFixed(0)}`
                    : `${m.trades} trades`}
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
