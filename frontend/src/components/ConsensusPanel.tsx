"use client";

import { useState, useEffect } from "react";
import { Brain, AlertTriangle, MessageSquare, Scale, Zap } from "lucide-react";
import type { ConsensusResult, AIAnalysis } from "@/lib/api";

interface Props {
  consensus: ConsensusResult | null;
  loading?: boolean;
}

const DIRECTION_CONFIG = {
  bullish: { color: "text-success", bg: "bg-success/10", border: "border-success/30", label: "BULLISH", emoji: "+" },
  bearish: { color: "text-danger", bg: "bg-danger/10", border: "border-danger/30", label: "BEARISH", emoji: "-" },
  neutral: { color: "text-warning", bg: "bg-warning/10", border: "border-warning/30", label: "NEUTRAL", emoji: "~" },
};

const MODEL_CONFIG: Record<string, { icon: string; name: string; role: string; color: string; bgColor: string; dataFeed: string }> = {
  claude: { icon: "L4", name: "Llama-4 Scout", role: "Risk Analyst", color: "text-orange-400", bgColor: "bg-orange-400/20", dataFeed: "Pacifica funding rates, liquidation clusters, open interest shifts" },
  gpt4o: { icon: "G", name: "GPT-4o", role: "Market Analyst", color: "text-blue-400", bgColor: "bg-blue-400/20", dataFeed: "Pacifica OHLCV candles, volume profile, orderbook support/resistance" },
  llama3: { icon: "L3", name: "Llama-3.3 70B", role: "Technical Analyst", color: "text-purple-400", bgColor: "bg-purple-400/20", dataFeed: "Multi-timeframe EMA crossovers, rate-of-change, orderbook imbalance" },
};

function TypingText({ text, speed = 15 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="animate-pulse text-accent">|</span>}
    </span>
  );
}

function ModelCard({ analysis, index }: { analysis: AIAnalysis; index: number }) {
  const [visible, setVisible] = useState(false);
  const model = MODEL_CONFIG[analysis.model_name] || MODEL_CONFIG.claude;
  const dir = DIRECTION_CONFIG[analysis.direction];

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 800);
    return () => clearTimeout(timer);
  }, [index]);

  if (!visible) {
    return (
      <div className="rounded-lg border border-border/30 bg-card p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${model.bgColor} animate-pulse`}>
            <span className={`text-lg font-bold ${model.color}`}>{model.icon}</span>
          </div>
          <div>
            <span className={`text-sm font-bold ${model.color}`}>{model.name}</span>
            <p className="text-xs text-muted">Analyzing...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${dir.border} bg-card p-4 transition-all duration-500 animate-in fade-in slide-in-from-bottom-2`}>
      {/* Model header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${model.bgColor}`}>
            <span className={`text-lg font-bold ${model.color}`}>{model.icon}</span>
          </div>
          <div>
            <span className={`text-sm font-bold ${model.color}`}>{model.name}</span>
            <p className="text-xs text-muted">{model.role}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${dir.bg} ${dir.color}`}>
            {dir.label}
          </span>
          <p className="mt-1 text-xs text-muted">
            {(analysis.confidence * 100).toFixed(0)}% confident
          </p>
        </div>
      </div>

      {/* Data feed label */}
      <div className="mt-2 rounded bg-background/30 px-2.5 py-1">
        <p className="font-mono text-[10px] text-muted/70">
          Analyzing: {model.dataFeed}
        </p>
      </div>

      {/* Reasoning with typing effect */}
      <div className="mt-3 rounded-md bg-background/50 p-3">
        <div className="flex items-start gap-2">
          <MessageSquare className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${model.color}`} />
          <p className="text-sm text-foreground/80">
            <TypingText text={analysis.reasoning} speed={8} />
          </p>
        </div>
      </div>

      {/* Score bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Score</span>
          <span className="font-mono font-bold">{analysis.score.toFixed(1)}/10</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-card-hover">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              analysis.direction === "bullish"
                ? "bg-success"
                : analysis.direction === "bearish"
                  ? "bg-danger"
                  : "bg-warning"
            }`}
            style={{ width: `${analysis.score * 10}%` }}
          />
        </div>
      </div>

      {/* Key factors */}
      {analysis.key_factors.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {analysis.key_factors.map((factor, i) => (
            <span
              key={i}
              className="rounded-full bg-card-hover px-2 py-0.5 text-xs text-muted"
            >
              {factor}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ConsensusPanel({ consensus, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-lg border border-accent/20 bg-card p-6">
        <div className="flex items-center gap-3">
          <Brain className="h-6 w-6 animate-pulse text-accent" />
          <div>
            <p className="font-medium">AI Debate in Progress</p>
            <p className="text-xs text-muted">
              3 models analyzing market conditions simultaneously...
            </p>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {Object.entries(MODEL_CONFIG).map(([key, model]) => (
            <div
              key={key}
              className="flex items-center gap-3 rounded-lg border border-border/30 bg-background/50 p-4"
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${model.bgColor} animate-pulse`}>
                <span className={`text-lg font-bold ${model.color}`}>{model.icon}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${model.color}`}>{model.name}</span>
                  <span className="text-xs text-muted">— {model.role}</span>
                </div>
                <div className="mt-1 h-2 w-3/4 animate-pulse rounded bg-card-hover" />
              </div>
              <Zap className="h-4 w-4 animate-pulse text-accent" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!consensus) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <Brain className="mx-auto h-12 w-12 text-muted" />
        <p className="mt-3 text-muted">Select a market to start the AI debate</p>
      </div>
    );
  }

  const dir = DIRECTION_CONFIG[consensus.direction];
  const votes = { bullish: 0, bearish: 0, neutral: 0 };
  for (const a of consensus.analyses) {
    votes[a.direction]++;
  }

  return (
    <div className="space-y-4">
      {/* Verdict card */}
      <div className={`rounded-lg border-2 ${dir.border} ${dir.bg} p-5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Scale className={`h-6 w-6 ${dir.color}`} />
            <div>
              <p className="text-xs text-muted">AI Consensus Verdict</p>
              <p className={`text-2xl font-bold ${dir.color}`}>
                {dir.label} — {(consensus.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Overall Score</p>
            <p className="font-mono text-3xl font-bold">{consensus.overall_score.toFixed(1)}</p>
            <p className="text-xs text-muted">/10</p>
          </div>
        </div>

        {/* Vote breakdown */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-success" />
            <span className="text-xs text-muted">Bullish: {votes.bullish}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-danger" />
            <span className="text-xs text-muted">Bearish: {votes.bearish}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-warning" />
            <span className="text-xs text-muted">Neutral: {votes.neutral}</span>
          </div>
          <span className="rounded bg-accent/10 px-2 py-0.5 text-xs text-accent">
            {consensus.regime.toUpperCase()}
          </span>
        </div>

        {/* Summary */}
        <p className="mt-3 text-sm text-foreground/80">{consensus.summary}</p>

        {/* Alert */}
        {consensus.alert && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <span className="text-sm text-warning">{consensus.alert}</span>
          </div>
        )}
      </div>

      {/* Individual model debates — appear one by one */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-muted">
          <MessageSquare className="h-4 w-4" />
          Model Arguments
        </h3>
        {consensus.analyses.map((analysis, i) => (
          <ModelCard key={analysis.model_name} analysis={analysis} index={i} />
        ))}
      </div>
    </div>
  );
}
