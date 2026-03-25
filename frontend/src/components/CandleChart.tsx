"use client";

import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

interface Candle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Props {
  candles: Candle[];
  height?: number;
}

export default function CandleChart({ candles, height = 300 }: Props) {
  if (!candles || candles.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-card text-muted"
        style={{ height }}
      >
        No candle data available
      </div>
    );
  }

  // Transform for OHLC visualization using bar chart
  const data = candles.map((c) => {
    const isGreen = c.close >= c.open;
    return {
      time: new Date(c.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      open: c.open,
      close: c.close,
      high: c.high,
      low: c.low,
      volume: c.volume,
      // For the bar: bottom = min(open,close), height = |close-open|
      barBottom: Math.min(c.open, c.close),
      barHeight: Math.abs(c.close - c.open),
      isGreen,
    };
  });

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(220 10% 15%)"
            vertical={false}
          />
          <XAxis
            dataKey="time"
            tick={{ fill: "hsl(220 10% 40%)", fontSize: 10 }}
            tickLine={false}
            axisLine={{ stroke: "hsl(220 10% 15%)" }}
            interval={Math.floor(data.length / 8)}
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fill: "hsl(220 10% 40%)", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) =>
              v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(2)}`
            }
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(220 15% 10%)",
              border: "1px solid hsl(220 15% 15%)",
              borderRadius: "8px",
              fontSize: 12,
            }}
            formatter={(value) => [
              `$${Number(value).toFixed(2)}`,
            ]}
            labelStyle={{ color: "hsl(220 10% 40%)" }}
          />
          <Bar dataKey="barHeight" stackId="candle" fillOpacity={0.9}>
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={
                  entry.isGreen
                    ? "hsl(142 71% 45%)"
                    : "hsl(0 72% 51%)"
                }
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
