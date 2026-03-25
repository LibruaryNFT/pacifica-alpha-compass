"use client";

import { MessageCircle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { SocialSentiment } from "@/lib/api";

interface Props {
  sentiment: SocialSentiment | null;
  loading?: boolean;
}

const SENTIMENT_CONFIG = {
  bullish: {
    color: "text-success",
    bg: "bg-success/10",
    icon: TrendingUp,
    label: "BULLISH",
  },
  bearish: {
    color: "text-danger",
    bg: "bg-danger/10",
    icon: TrendingDown,
    label: "BEARISH",
  },
  neutral: {
    color: "text-warning",
    bg: "bg-warning/10",
    icon: Minus,
    label: "NEUTRAL",
  },
};

export default function SocialSentimentPanel({ sentiment, loading }: Props) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 animate-pulse text-accent" />
          <span className="text-sm text-muted">Loading social sentiment...</span>
        </div>
      </div>
    );
  }

  if (!sentiment || sentiment.mention_count_24h === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted" />
          <span className="text-sm text-muted">
            No social data available
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Powered by Elfa AI
        </p>
      </div>
    );
  }

  const config = SENTIMENT_CONFIG[sentiment.sentiment_label];
  const Icon = config.icon;
  const scorePercent = Math.round(sentiment.sentiment_score * 100);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium">Social Sentiment</span>
          <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] text-accent">
            Elfa AI
          </span>
        </div>
        <div
          className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${config.bg} ${config.color}`}
        >
          <Icon className="h-3 w-3" />
          {config.label}
        </div>
      </div>

      {/* Score + Stats */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-muted">Score</p>
          <p className={`font-mono text-lg font-bold ${config.color}`}>
            {scorePercent}%
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Mentions (24h)</p>
          <p className="font-mono text-lg font-bold">
            {sentiment.mention_count_24h}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">Bull / Bear</p>
          <p className="font-mono text-lg">
            <span className="text-success">{sentiment.positive_mentions}</span>
            {" / "}
            <span className="text-danger">{sentiment.negative_mentions}</span>
          </p>
        </div>
      </div>

      {/* Sentiment bar */}
      <div className="mt-3">
        <div className="h-2 rounded-full bg-card-hover">
          <div
            className={`h-full rounded-full transition-all ${
              sentiment.sentiment_score > 0.6
                ? "bg-success"
                : sentiment.sentiment_score < 0.4
                  ? "bg-danger"
                  : "bg-warning"
            }`}
            style={{ width: `${scorePercent}%` }}
          />
        </div>
      </div>

      {/* Top mentions */}
      {sentiment.top_mentions.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-medium text-muted">Top Mentions</p>
          {sentiment.top_mentions.slice(0, 3).map((m, i) => (
            <div
              key={i}
              className="rounded border border-border/50 bg-background p-2 text-xs"
            >
              <p className="text-foreground/80">{m.text}</p>
              <div className="mt-1 flex items-center gap-2 text-muted">
                <span>{m.source}</span>
                <span>engagement: {m.engagement}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
