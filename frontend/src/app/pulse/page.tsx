"use client";

import { useEffect, useState, useRef } from "react";
import { Activity } from "lucide-react";

interface MarketHeat {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  fundingRate: number;
}

const SYMBOLS = ["BTC", "ETH", "SOL", "DOGE", "ARB", "AVAX", "LINK", "OP"];

function heatColor(value: number): string {
  if (value > 2) return "#22c55e";
  if (value > 0.5) return "#86efac";
  if (value > -0.5) return "#eab308";
  if (value > -2) return "#fca5a5";
  return "#ef4444";
}

export default function PulsePage() {
  const [markets, setMarkets] = useState<MarketHeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [tradeCounts, setTradeCounts] = useState<Record<string, { count: number; buys: number }>>({});
  const tradeCountsRef = useRef(tradeCounts);
  tradeCountsRef.current = tradeCounts;

  // Load prices (fast, no AI calls)
  useEffect(() => {
    async function loadPrices() {
      try {
        const res = await fetch("https://api.pacifica.fi/api/v1/market-price");
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.data || [];

        const heat: MarketHeat[] = list
          .filter((p: Record<string, unknown>) => SYMBOLS.includes(String(p.symbol).replace("-USDC", "")))
          .map((p: Record<string, unknown>) => ({
            symbol: String(p.symbol),
            price: Number(p.price || p.markPrice || 0),
            change24h: Number(p.change24h || p.priceChange24h || 0),
            volume24h: Number(p.volume24h || p.volume || 0),
            fundingRate: Number(p.fundingRate || 0),
          }));

        setMarkets(heat);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    }

    loadPrices();
    const interval = setInterval(loadPrices, 10000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket for live trade counting
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
          const sym = raw.s;
          const isBuy = raw.d?.includes("open_long") || raw.d?.includes("close_short");
          setTradeCounts((prev) => {
            const cur = prev[sym] || { count: 0, buys: 0 };
            return { ...prev, [sym]: { count: cur.count + 1, buys: cur.buys + (isBuy ? 1 : 0) } };
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
            All Pacifica markets at a glance — price, momentum, funding, and live trade flow
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className={`h-2 w-2 rounded-full ${wsConnected ? "bg-success animate-pulse" : "bg-warning"}`} />
          {wsConnected ? "Live trades" : "Connecting..."}
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
        <span>Card color = 24h change</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded" style={{ background: "#ef4444" }} /> Down
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded" style={{ background: "#eab308" }} /> Flat
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded" style={{ background: "#22c55e" }} /> Up
        </span>
        <span>|</span>
        <span>Bar = live buy/sell pressure from WebSocket</span>
      </div>

      {/* Heatmap grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {markets.map((m) => {
            const color = heatColor(m.change24h);
            const sym = m.symbol.replace("-USDC", "");
            const tc = tradeCounts[sym] || { count: 0, buys: 0 };
            const buyPct = tc.count > 0 ? (tc.buys / tc.count) * 100 : 50;

            return (
              <div
                key={m.symbol}
                className="relative overflow-hidden rounded-xl border p-4 transition-all hover:scale-[1.02] hover:shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${color}12, ${color}06)`,
                  borderColor: `${color}40`,
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">{sym}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: `${color}20`, color }}
                  >
                    {m.change24h >= 0 ? "+" : ""}{m.change24h.toFixed(2)}%
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

                {/* Funding */}
                <p className="mt-2 text-xs text-muted">
                  Funding: <span className={m.fundingRate > 0 ? "text-success" : m.fundingRate < 0 ? "text-danger" : "text-muted"}>
                    {(m.fundingRate * 100).toFixed(3)}%
                  </span>
                </p>

                {/* Live trade bar */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[10px] text-muted">
                    <span>{tc.count} trades</span>
                    <span>{buyPct.toFixed(0)}% buy</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-danger/20">
                    <div
                      className="h-full rounded-full bg-success/70 transition-all duration-500"
                      style={{ width: `${buyPct}%` }}
                    />
                  </div>
                </div>

                {/* Volume */}
                <p className="mt-2 text-[10px] text-muted">
                  Vol: ${m.volume24h >= 1e9
                    ? `${(m.volume24h / 1e9).toFixed(1)}B`
                    : m.volume24h >= 1e6
                      ? `${(m.volume24h / 1e6).toFixed(0)}M`
                      : `${(m.volume24h / 1e3).toFixed(0)}K`}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Data source */}
      <div className="flex items-center gap-2 text-[10px] text-muted">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
        Prices from Pacifica REST API (10s refresh) | Trade flow from Pacifica WebSocket (real-time)
      </div>
    </div>
  );
}
