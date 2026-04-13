import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8002";
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || "";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/accuracy/live`, {
      headers: { "x-internal-key": INTERNAL_API_KEY },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend ${response.status}` },
        { status: response.status }
      );
    }

    const raw = await response.json();

    // Transform backend shape → frontend AccuracyData shape
    const agg = raw.aggregate ?? {};
    const rawMarkets: Record<string, Record<string, unknown>> = raw.markets ?? {};

    const markets: Record<string, unknown> = {};
    const inProgress: string[] = [];
    let totalCollected = 0;
    const totalNeeded = Object.keys(rawMarkets).length * 500;

    for (const [sym, m] of Object.entries(rawMarkets)) {
      const candles = (m.candle_count as number) ?? 0;
      totalCollected += candles;

      if (m.status === "collecting") {
        inProgress.push(sym);
        markets[sym] = {
          symbol: sym,
          accuracy: 0,
          win_rate: 0,
          sharpe: 0,
          total_signals: 0,
          pnl: 0,
          candle_count: candles,
          status: "collecting",
        };
      } else {
        markets[sym] = {
          symbol: sym,
          accuracy: (m.accuracy as number) ?? 0,
          // backend win_rate is 0-100, frontend multiplies by 100 so pass as 0-1
          win_rate: ((m.win_rate as number) ?? 0) / 100,
          sharpe: (m.sharpe_estimate as number) ?? 0,
          total_signals: (m.total_signals as number) ?? 0,
          pnl: (m.total_pnl_pct as number) ?? 0,
          candle_count: candles,
          status: "active",
        };
      }
    }

    const transformed = {
      overall_accuracy: agg.accuracy ?? 0,
      total_signals: agg.total_signals ?? 0,
      total_pnl: agg.total_pnl_pct ?? 0,
      markets_with_data: agg.markets_with_data ?? 0,
      markets,
      candle_stats: {
        total_collected: totalCollected,
        total_needed: totalNeeded,
        markets_in_progress: inProgress,
      },
      last_updated: raw.last_updated,
    };

    return NextResponse.json(transformed);
  } catch (error) {
    return NextResponse.json(
      { error: "Accuracy backend unreachable", detail: String(error) },
      { status: 502 }
    );
  }
}
