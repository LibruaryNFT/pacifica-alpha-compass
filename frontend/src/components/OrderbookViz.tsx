"use client";

interface OrderbookData {
  bids: [number, number][];
  asks: [number, number][];
}

interface Props {
  orderbook: OrderbookData | null;
  maxRows?: number;
}

export default function OrderbookViz({ orderbook, maxRows = 10 }: Props) {
  if (!orderbook) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted">
        No orderbook data
      </div>
    );
  }

  const bids = orderbook.bids.slice(0, maxRows);
  const asks = orderbook.asks.slice(0, maxRows);

  const maxBidSize = Math.max(...bids.map(([, s]) => s), 1);
  const maxAskSize = Math.max(...asks.map(([, s]) => s), 1);
  const maxSize = Math.max(maxBidSize, maxAskSize);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-medium text-muted">Orderbook</h3>

      {/* Asks (reversed so lowest ask is at bottom) */}
      <div className="space-y-0.5">
        {[...asks].reverse().map(([price, size], i) => (
          <div key={`ask-${i}`} className="relative flex items-center text-xs">
            <div
              className="absolute right-0 h-full bg-danger/10"
              style={{ width: `${(size / maxSize) * 100}%` }}
            />
            <span className="relative z-10 w-1/2 text-right font-mono text-danger">
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="relative z-10 w-1/2 text-right font-mono text-muted">
              {size.toFixed(4)}
            </span>
          </div>
        ))}
      </div>

      {/* Spread indicator */}
      {bids.length > 0 && asks.length > 0 && (
        <div className="my-1 border-y border-border py-1 text-center text-xs text-warning">
          Spread: $
          {(asks[0][0] - bids[0][0]).toFixed(2)} (
          {(((asks[0][0] - bids[0][0]) / asks[0][0]) * 100).toFixed(3)}%)
        </div>
      )}

      {/* Bids */}
      <div className="space-y-0.5">
        {bids.map(([price, size], i) => (
          <div key={`bid-${i}`} className="relative flex items-center text-xs">
            <div
              className="absolute left-0 h-full bg-success/10"
              style={{ width: `${(size / maxSize) * 100}%` }}
            />
            <span className="relative z-10 w-1/2 font-mono text-success">
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            <span className="relative z-10 w-1/2 text-right font-mono text-muted">
              {size.toFixed(4)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
