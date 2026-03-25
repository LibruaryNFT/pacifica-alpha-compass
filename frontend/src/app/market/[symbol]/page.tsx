"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Brain, Loader2 } from "lucide-react";
import CandleChart from "@/components/CandleChart";
import OrderbookViz from "@/components/OrderbookViz";
import ConsensusPanel from "@/components/ConsensusPanel";
import {
  fetchPrice,
  fetchCandles,
  fetchOrderbook,
  fetchConsensus,
  type MarketPrice,
  type ConsensusResult,
} from "@/lib/api";

interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Orderbook {
  bids: [number, number][];
  asks: [number, number][];
}

export default function MarketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = (params.symbol as string) || "BTC-USDC";

  const [price, setPrice] = useState<MarketPrice | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [orderbook, setOrderbook] = useState<Orderbook | null>(null);
  const [consensus, setConsensus] = useState<ConsensusResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [candleInterval, setCandleInterval] = useState("1h");

  const INTERVALS = ["5m", "15m", "1h", "4h", "1d"];
  const CANDLE_LIMITS: Record<string, number> = { "5m": 144, "15m": 96, "1h": 72, "4h": 48, "1d": 30 };

  useEffect(() => {
    const load = async () => {
      const [p, c, ob] = await Promise.all([
        fetchPrice(symbol),
        fetchCandles(symbol, candleInterval, CANDLE_LIMITS[candleInterval] || 72),
        fetchOrderbook(symbol),
      ]);
      setPrice(p);
      setCandles(c as Candle[]);
      setOrderbook(ob as Orderbook);
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [symbol, candleInterval]);

  const runAI = async () => {
    setAiLoading(true);
    try {
      const result = await fetchConsensus(symbol);
      setConsensus(result);
    } finally {
      setAiLoading(false);
    }
  };

  const isPositive = (price?.change24h ?? 0) >= 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="rounded-lg p-2 text-muted hover:bg-card hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{symbol}</h1>
            {price && (
              <div className="flex items-center gap-3">
                <span className="font-mono text-3xl font-bold">
                  $
                  {price.price.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </span>
                <span
                  className={`font-mono text-lg ${isPositive ? "text-success" : "text-danger"}`}
                >
                  {isPositive ? "+" : ""}
                  {price.change24h.toFixed(2)}%
                </span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={runAI}
          disabled={aiLoading}
          className="flex items-center gap-2 rounded-lg bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20 disabled:opacity-50"
        >
          {aiLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Brain className="h-4 w-4" />
          )}
          {aiLoading ? "Analyzing..." : "Run AI Analysis"}
        </button>
      </div>

      {/* Stats bar */}
      {price && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <MiniStat label="24h High" value={`$${price.high24h.toLocaleString()}`} />
          <MiniStat label="24h Low" value={`$${price.low24h.toLocaleString()}`} />
          <MiniStat
            label="24h Volume"
            value={`$${price.volume24h >= 1e6 ? `${(price.volume24h / 1e6).toFixed(1)}M` : price.volume24h.toLocaleString()}`}
          />
          <MiniStat
            label="Funding Rate"
            value={
              price.fundingRate !== undefined
                ? `${(price.fundingRate * 100).toFixed(4)}%`
                : "N/A"
            }
            valueColor={
              (price.fundingRate ?? 0) >= 0 ? "text-success" : "text-danger"
            }
          />
          <MiniStat
            label="Open Interest"
            value={
              price.openInterest
                ? `$${(price.openInterest / 1e6).toFixed(1)}M`
                : "N/A"
            }
          />
        </div>
      )}

      {/* Chart + Orderbook */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-2 flex items-center gap-1">
            {INTERVALS.map((iv) => (
              <button
                key={iv}
                onClick={() => setCandleInterval(iv)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  candleInterval === iv
                    ? "bg-primary/20 text-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {iv.toUpperCase()}
              </button>
            ))}
          </div>
          <CandleChart candles={candles} height={400} />
        </div>
        <div>
          <OrderbookViz orderbook={orderbook} maxRows={15} />
        </div>
      </div>

      {/* AI Consensus */}
      {(consensus || aiLoading) && (
        <ConsensusPanel consensus={consensus} loading={aiLoading} />
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  valueColor = "text-foreground",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-xs text-muted">{label}</p>
      <p className={`font-mono text-sm font-bold ${valueColor}`}>{value}</p>
    </div>
  );
}
