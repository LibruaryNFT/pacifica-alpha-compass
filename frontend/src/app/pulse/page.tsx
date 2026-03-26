"use client";

import { useEffect, useState, useCallback } from "react";
import { Activity } from "lucide-react";

interface MarketHeat {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  fundingRate: number;
  alphaScore: number | null;
  direction: string | null;
  tradeCount: number;
  buyPressure: number;
}

const SYMBOLS = ["BTC", "ETH", "SOL", "DOGE", "ARB", "AVAX", "LINK", "OP"];

function heatColor(value: number, min: number, max: number): string {
  // Maps value to red (-) through yellow (0) to green (+)
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  if (normalized < 0.5) {
    const t = normalized * 2;
    const r = 239;
    const g = Math.round(68 + t * (180 - 68));
    const b = 68;
    return `rgb(${r},${g},${b})`;
  }
  const t = (normalized - 0.5) * 2;
  const r = Math.round(239 - t * (239 - 34));
  const g = Math.round(180 + t * (197 - 180));
  const b = Math.round(68 - t * (68 - 94));
  return `rgb(${r},${g},${b})`;
}

function alphaColor(score: number | null): string {
  if (score === null) return "rgba(255,255,255,0.1)";
  if (score > 65) return "#22c55e";
  if (score > 55) return "#86efac";
  if (score < 35) return "#ef4444";
  if (score < 45) return "#fca5a5";
  return "#eab308";
}

export default function PulsePage() {
  const [markets, setMarkets] = useState<MarketHeat[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [tradeCounts, setTradeCounts] = useState<Record<string, { count: number; buys: number }>>({});

  const [alphaMap, setAlphaMap] = useState<Record<string, { score: number; direction: string }>>({});

  // Load prices first (fast), then alpha scores in background
  const loadPrices = useCallback(async () => {
    try {
      const priceRes = await fetch("https://api.pacifica.fi/api/v1/market-price");
      const prices = await priceRes.json();
      const priceList = Array.isArray(prices) ? prices : prices.data || [];

      const heat: MarketHeat[] = priceList
        .filter((p: Record<string, unknown>) => SYMBOLS.includes(String(p.symbol).replace("-USDC", "")))
        .map((p: Record<string, unknown>) => {
          const sym = String(p.symbol);
          const alpha = alphaMap[sym];
          const tc = tradeCounts[sym.replace("-USDC", "")] || { count: 0, buys: 0 };
          return {
            symbol: sym,
            price: Number(p.price || p.markPrice || 0),
            change24h: Number(p.change24h || p.priceChange24h || 0),
            volume24h: Number(p.volume24h || p.volume || 0),
            fundingRate: Number(p.fundingRate || 0),
            alphaScore: alpha?.score ?? null,
            direction: alpha?.direction ?? null,
            tradeCount: tc.count,
            buyPressure: tc.count > 0 ? (tc.buys / tc.count) * 100 : 50,
          };
        });

      setMarkets(heat);
      setLoading(false);
    } catch (e) {
      console.error("Heatmap load failed:", e);
      setLoading(false);
    }
  }, [tradeCounts, alphaMap]);

  // Load alpha scores in background (slow, cached)
  const loadAlphaScores = useCallback(async () => {
    const results = await Promise.allSettled(
      SYMBOLS.slice(0, 4).map(async (sym) => {
        const res = await fetch(`/api/alpha-score/${sym}-USDC`);
        if (!res.ok) return null;
        return res.json();
      })
    );
    const map: Record<string, { score: number; direction: string }> = {};
    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value) {
        map[r.value.symbol] = { score: r.value.alpha_score, direction: r.value.direction };
      }
    });
    setAlphaMap((prev) => ({ ...prev, ...map }));
  }, []);

  useEffect(() => {
    loadPrices();
    loadAlphaScores();
    const interval = setInterval(loadPrices, 10000);
    return () => clearInterval(interval);
  }, [loadPrices, loadAlphaScores]);

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
    ws.onclose = () => { setWsConnected(false); };
    ws.onerror = () => ws.close();
    return () => { ws.onclose = null; ws.close(); };
  }, []);

  // Find min/max for heat coloring
  const changes = markets.map((m) => m.change24h);
  const minChange = Math.min(...changes, -3);
  const maxChange = Math.max(...changes, 3);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <Activity className="mr-2 inline h-6 w-6 text-primary" />
            Market Pulse
          </h1>
          <p className="mt-1 text-sm text-muted">
            All markets at a glance — price action, Alpha Score, funding, and live trade flow
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span className={`h-2 w-2 rounded-full ${wsConnected ? "bg-success animate-pulse" : "bg-warning"}`} />
          {wsConnected ? "Live trades" : "Connecting..."}
        </span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
        <span>Cell color = 24h price change</span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded" style={{ background: "#ef4444" }} /> Bearish
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded" style={{ background: "#eab308" }} /> Flat
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded" style={{ background: "#22c55e" }} /> Bullish
        </span>
        <span>|</span>
        <span>Circle = Alpha Score (green=bullish, red=bearish, yellow=neutral)</span>
      </div>

      {/* Heatmap grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {markets.map((m) => {
            const bg = heatColor(m.change24h, minChange, maxChange);
            const alphaBg = alphaColor(m.alphaScore);

            return (
              <div
                key={m.symbol}
                className="relative overflow-hidden rounded-xl border border-border p-4 transition-all hover:scale-[1.02] hover:shadow-lg"
                style={{ background: `linear-gradient(135deg, ${bg}15, ${bg}08)`, borderColor: `${bg}40` }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold">{m.symbol.replace("-USDC", "")}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold`}
                    style={{ background: `${bg}25`, color: bg }}
                  >
                    {m.change24h >= 0 ? "+" : ""}{m.change24h.toFixed(2)}%
                  </span>
                </div>

                {/* Price */}
                <p className="mt-1 font-mono text-2xl font-bold">
                  ${m.price >= 1000 ? m.price.toLocaleString(undefined, { maximumFractionDigits: 0 }) : m.price >= 1 ? m.price.toFixed(2) : m.price.toFixed(4)}
                </p>

                {/* Alpha Score circle */}
                <div className="mt-3 flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full border-2"
                    style={{ borderColor: alphaBg, background: `${alphaBg}15` }}
                  >
                    <span className="font-mono text-sm font-black" style={{ color: alphaBg }}>
                      {m.alphaScore !== null ? m.alphaScore.toFixed(0) : "—"}
                    </span>
                  </div>
                  <div className="flex-1 text-xs">
                    {m.direction && (
                      <p className="font-bold" style={{ color: alphaBg }}>
                        {m.direction.toUpperCase()}
                      </p>
                    )}
                    <p className="text-muted">
                      FR: {(m.fundingRate * 100).toFixed(3)}%
                    </p>
                  </div>
                </div>

                {/* Live trade bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] text-muted">
                    <span>{m.tradeCount} trades</span>
                    <span>
                      {m.buyPressure.toFixed(0)}% buy
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-danger/20">
                    <div
                      className="h-full rounded-full bg-success/70 transition-all duration-500"
                      style={{ width: `${m.buyPressure}%` }}
                    />
                  </div>
                </div>

                {/* Volume */}
                <p className="mt-2 text-[10px] text-muted">
                  Vol: ${m.volume24h >= 1e9 ? `${(m.volume24h / 1e9).toFixed(1)}B` : m.volume24h >= 1e6 ? `${(m.volume24h / 1e6).toFixed(0)}M` : `${(m.volume24h / 1e3).toFixed(0)}K`}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
