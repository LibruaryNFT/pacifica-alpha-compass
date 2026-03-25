"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Brain, Loader2 } from "lucide-react";
import ConsensusPanel from "@/components/ConsensusPanel";
import { fetchConsensus, type ConsensusResult } from "@/lib/api";
import { TOP_MARKETS } from "@/lib/constants";

export default function AIConsensusPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-6"><div className="h-64 animate-pulse rounded-lg bg-card" /></div>}>
      <AIConsensusContent />
    </Suspense>
  );
}

function AIConsensusContent() {
  const searchParams = useSearchParams();
  const initialSymbol = searchParams.get("symbol") || TOP_MARKETS[0];

  const [selectedMarket, setSelectedMarket] = useState(initialSymbol);
  const [consensus, setConsensus] = useState<ConsensusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ConsensusResult[]>([]);

  const runAnalysis = async (symbol: string) => {
    setSelectedMarket(symbol);
    setLoading(true);
    setConsensus(null);
    try {
      const result = await fetchConsensus(symbol);
      setConsensus(result);
      setHistory((prev) => [result, ...prev.slice(0, 9)]);
    } catch (error) {
      console.error("AI analysis failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis(initialSymbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">
          <Brain className="mr-2 inline h-6 w-6 text-accent" />
          AI Consensus Engine
        </h1>
        <p className="mt-1 text-sm text-muted">
          3 AI models debate market conditions — Claude (Risk), GPT-4o
          (Sentiment), Llama-3 (Technical)
        </p>
      </div>

      {/* Market selector */}
      <div className="flex flex-wrap gap-2">
        {TOP_MARKETS.map((symbol) => (
          <button
            key={symbol}
            onClick={() => runAnalysis(symbol)}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              selectedMarket === symbol
                ? "bg-accent/20 text-accent"
                : "bg-card text-muted hover:bg-card-hover hover:text-foreground"
            } ${loading ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {symbol.replace("-USDC", "")}
          </button>
        ))}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <div>
            <p className="text-sm font-medium">
              Analyzing {selectedMarket}...
            </p>
            <p className="text-xs text-muted">
              Running 3 AI models in parallel (Claude + GPT-4o + Llama-3)
            </p>
          </div>
        </div>
      )}

      {/* Consensus result */}
      <ConsensusPanel consensus={consensus} loading={loading} />

      {/* Analysis history */}
      {history.length > 1 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Recent Analyses</h2>
          <div className="space-y-2">
            {history.slice(1).map((h, i) => {
              const dirColor =
                h.direction === "bullish"
                  ? "text-success"
                  : h.direction === "bearish"
                    ? "text-danger"
                    : "text-warning";
              return (
                <div
                  key={`${h.symbol}-${i}`}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-sm"
                >
                  <span className="font-medium">{h.symbol}</span>
                  <span className={`font-bold ${dirColor}`}>
                    {h.direction.toUpperCase()} (
                    {(h.confidence * 100).toFixed(0)}%)
                  </span>
                  <span className="text-xs text-muted">
                    Score: {h.overall_score.toFixed(1)}/10
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(h.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
