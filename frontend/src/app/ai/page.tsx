"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Brain, Loader2 } from "lucide-react";
import ConsensusPanel from "@/components/ConsensusPanel";
import SocialSentimentPanel from "@/components/SocialSentiment";
import {
  fetchConsensus,
  fetchSocialSentiment,
  type ConsensusResult,
  type SocialSentiment,
} from "@/lib/api";
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
  const [sentiment, setSentiment] = useState<SocialSentiment | null>(null);
  const [loading, setLoading] = useState(false);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [history, setHistory] = useState<ConsensusResult[]>([]);

  const loadHistory = async () => {
    try {
      const res = await fetch("/api/ai/history");
      if (res.ok) {
        const data = await res.json();
        if (data?.history?.length) {
          setHistory(data.history);
        }
      }
    } catch {
      // History unavailable — not critical
    }
  };

  const runAnalysis = async (symbol: string) => {
    setSelectedMarket(symbol);
    setLoading(true);
    setSentimentLoading(true);
    setConsensus(null);
    setSentiment(null);
    try {
      // Run AI consensus and social sentiment in parallel
      const [aiResult, socialResult] = await Promise.all([
        fetchConsensus(symbol),
        fetchSocialSentiment(symbol),
      ]);
      setConsensus(aiResult);
      setSentiment(socialResult);
      // Refresh history from backend (includes this new result)
      loadHistory();
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setLoading(false);
      setSentimentLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
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
      {/* AI Consensus + Social Sentiment side by side */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ConsensusPanel consensus={consensus} loading={loading} />
        </div>
        <div>
          <SocialSentimentPanel sentiment={sentiment} loading={sentimentLoading} />
        </div>
      </div>

      {/* Persistent analysis history (from backend — survives page reloads) */}
      {history.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">
            Analysis Timeline
            <span className="ml-2 text-xs font-normal text-muted">
              {history.length} analyses stored
            </span>
          </h2>
          <div className="space-y-2">
            {history.slice(0, 20).map((h, i) => {
              const dirColor =
                h.direction === "bullish"
                  ? "text-success"
                  : h.direction === "bearish"
                    ? "text-danger"
                    : "text-warning";
              const bgColor =
                h.direction === "bullish"
                  ? "border-success/20"
                  : h.direction === "bearish"
                    ? "border-danger/20"
                    : "border-warning/20";
              return (
                <div
                  key={`${h.symbol}-${h.timestamp}-${i}`}
                  className={`flex items-center justify-between rounded-lg border ${bgColor} bg-card p-3 text-sm`}
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
                    {h.timestamp ? new Date(h.timestamp).toLocaleString() : "—"}
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
