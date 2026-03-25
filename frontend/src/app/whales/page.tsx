"use client";

import { useState } from "react";
import { Fish, Loader2 } from "lucide-react";
import { fetchWhales, type WhaleAlert } from "@/lib/api";
import { TOP_MARKETS } from "@/lib/constants";

export default function WhalesPage() {
  const [selectedMarket, setSelectedMarket] = useState<string>(TOP_MARKETS[0]);
  const [whales, setWhales] = useState<WhaleAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const scan = async (symbol: string) => {
    setSelectedMarket(symbol);
    setLoading(true);
    try {
      const result = await fetchWhales(symbol);
      setWhales(result);
    } catch (error) {
      console.error("Whale scan failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">
          <Fish className="mr-2 inline h-6 w-6 text-accent" />
          Whale Detector
        </h1>
        <p className="mt-1 text-sm text-muted">
          Detect large trades and unusual activity
        </p>
      </div>

      {/* Market selector */}
      <div className="flex flex-wrap gap-2">
        {TOP_MARKETS.map((symbol) => (
          <button
            key={symbol}
            onClick={() => scan(symbol)}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedMarket === symbol
                ? "bg-accent/20 text-accent"
                : "bg-card text-muted hover:bg-card-hover hover:text-foreground"
            }`}
          >
            {symbol.replace("-USDC", "")}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Scanning {selectedMarket} for whale activity...
        </div>
      )}

      {!loading && whales.length > 0 && (
        <div className="space-y-3">
          {whales.map((whale, i) => (
            <div
              key={i}
              className={`rounded-lg border p-4 ${
                whale.size_usd > 200000
                  ? "border-warning/50 bg-warning/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Fish
                    className={`h-5 w-5 ${
                      whale.size_usd > 200000 ? "text-warning" : "text-accent"
                    }`}
                  />
                  <span className="font-bold">{whale.symbol}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      whale.side === "buy"
                        ? "bg-success/10 text-success"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    {whale.side.toUpperCase()}
                  </span>
                </div>
                <span className="font-mono text-lg font-bold">
                  ${whale.size_usd.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 flex gap-4 text-xs text-muted">
                <span>Price: ${whale.price.toLocaleString()}</span>
                <span>
                  {new Date(whale.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && whales.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <Fish className="mx-auto h-12 w-12 text-muted" />
          <p className="mt-3 text-muted">
            No whale activity detected. Click a market above to scan.
          </p>
        </div>
      )}
    </div>
  );
}
