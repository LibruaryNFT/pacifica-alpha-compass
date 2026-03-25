"use client";

import { Brain, AlertTriangle } from "lucide-react";
import type { ConsensusResult } from "@/lib/api";

interface Props {
  consensus: ConsensusResult | null;
  loading?: boolean;
}

const DIRECTION_CONFIG = {
  bullish: { color: "text-success", bg: "bg-success/10", label: "BULLISH" },
  bearish: { color: "text-danger", bg: "bg-danger/10", label: "BEARISH" },
  neutral: { color: "text-warning", bg: "bg-warning/10", label: "NEUTRAL" },
};

const MODEL_ICONS: Record<string, string> = {
  claude: "C",
  gpt4o: "G",
  llama3: "L",
};

export default function ConsensusPanel({ consensus, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 animate-pulse text-accent" />
          <span className="text-sm text-muted">
            3 AI models analyzing market...
          </span>
        </div>
        <div className="mt-4 space-y-2">
          {["Claude (Risk)", "GPT-4o (Sentiment)", "Llama-3 (Technical)"].map(
            (name) => (
              <div
                key={name}
                className="h-12 animate-pulse rounded bg-card-hover"
              />
            )
          )}
        </div>
      </div>
    );
  }

  if (!consensus) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-center text-muted">
        Select a market to run AI analysis
      </div>
    );
  }

  const dir = DIRECTION_CONFIG[consensus.direction];

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      {/* Header: consensus direction + confidence */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-accent" />
          <span className="text-sm font-medium">AI Consensus</span>
        </div>
        <div className={`rounded-full px-3 py-1 text-sm font-bold ${dir.bg} ${dir.color}`}>
          {dir.label} {(consensus.confidence * 100).toFixed(0)}%
        </div>
      </div>

      {/* Score bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Bearish</span>
          <span>Score: {consensus.overall_score.toFixed(1)}/10</span>
          <span>Bullish</span>
        </div>
        <div className="mt-1 h-2 rounded-full bg-card-hover">
          <div
            className="h-full rounded-full bg-gradient-to-r from-danger via-warning to-success transition-all"
            style={{ width: `${consensus.overall_score * 10}%` }}
          />
        </div>
      </div>

      {/* Regime badge */}
      <div className="mt-3">
        <span className="rounded bg-accent/10 px-2 py-0.5 text-xs text-accent">
          {consensus.regime.toUpperCase()} market
        </span>
      </div>

      {/* Summary */}
      <p className="mt-3 text-sm text-foreground/80">{consensus.summary}</p>

      {/* Alert */}
      {consensus.alert && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span className="text-sm text-warning">{consensus.alert}</span>
        </div>
      )}

      {/* Individual model analyses */}
      <div className="mt-4 space-y-3">
        {consensus.analyses.map((analysis) => {
          const aDir = DIRECTION_CONFIG[analysis.direction];
          return (
            <div
              key={analysis.model_name}
              className="rounded-md border border-border/50 bg-background p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-xs font-bold text-accent">
                    {MODEL_ICONS[analysis.model_name] || "?"}
                  </span>
                  <span className="text-sm font-medium">
                    {analysis.model_name === "claude" && "Claude (Risk)"}
                    {analysis.model_name === "gpt4o" && "GPT-4o (Sentiment)"}
                    {analysis.model_name === "llama3" && "Llama-3 (Technical)"}
                  </span>
                </div>
                <span className={`text-xs font-bold ${aDir.color}`}>
                  {aDir.label} ({(analysis.confidence * 100).toFixed(0)}%)
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">{analysis.reasoning}</p>
              {analysis.key_factors.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {analysis.key_factors.map((factor, i) => (
                    <span
                      key={i}
                      className="rounded bg-card-hover px-1.5 py-0.5 text-xs text-muted"
                    >
                      {factor}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
