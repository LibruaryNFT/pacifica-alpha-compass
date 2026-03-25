"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import type { MarketPrice } from "@/lib/api";

interface Props {
  market: MarketPrice;
  onClick?: () => void;
}

export default function PriceCard({ market, onClick }: Props) {
  const isPositive = market.change24h >= 0;
  const changeColor = isPositive ? "text-success" : "text-danger";
  const bgGlow = isPositive ? "hover:glow-green" : "hover:glow-red";

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border border-border bg-card p-4 transition-all hover:bg-card-hover ${bgGlow}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">
          {market.symbol}
        </span>
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-success" />
        ) : (
          <TrendingDown className="h-4 w-4 text-danger" />
        )}
      </div>

      <div className="mt-2">
        <span className="font-mono text-xl font-bold">
          ${market.price.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: market.price < 1 ? 4 : 2,
          })}
        </span>
      </div>

      <div className="mt-1 flex items-center justify-between">
        <span className={`font-mono text-sm ${changeColor}`}>
          {isPositive ? "+" : ""}
          {market.change24h.toFixed(2)}%
        </span>
        {market.fundingRate !== undefined && (
          <span
            className={`text-xs ${
              market.fundingRate >= 0 ? "text-success" : "text-danger"
            }`}
          >
            FR: {(market.fundingRate * 100).toFixed(4)}%
          </span>
        )}
      </div>

      <div className="mt-2 text-xs text-muted">
        Vol: $
        {market.volume24h >= 1e6
          ? `${(market.volume24h / 1e6).toFixed(1)}M`
          : market.volume24h.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
      </div>
    </div>
  );
}
