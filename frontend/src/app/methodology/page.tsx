"use client";

import { FlaskConical, Brain, Zap, Target, BarChart3, Shield } from "lucide-react";

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          <FlaskConical className="mr-2 inline h-6 w-6 text-blue-400" />
          Methodology & Statistics
        </h1>
        <p className="mt-1 text-sm text-muted">
          How Alpha Compass generates, validates, and proves its trading signals
        </p>
      </div>

      {/* The Edge */}
      <section className="rounded-xl border border-success/20 bg-success/5 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-success">
          <Target className="h-5 w-5" />
          Accuracy Tracking
        </h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed">
          <p>
            Alpha Compass tracks every prediction against real Pacifica price data. This is not a backtest on historical data &mdash; signals are logged in real time and validated as the market moves.
          </p>
          <p>
            Early results are encouraging but the system is still young. Accuracy varies by market and timeframe. Some markets (ARB, LINK) show stronger signal quality than others (SOL, DOGE). The <a href="/accuracy" className="text-primary hover:underline">Live Accuracy</a> page shows all results transparently, including markets where the system underperforms.
          </p>
          <p>
            In leveraged perpetual futures, even a modest directional edge can be meaningful when paired with disciplined risk management. The Alpha Score trade suggestions include explicit stop-loss and risk/reward ratios to encourage systematic trading.
          </p>
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 text-xs text-muted">
            <strong className="text-warning">Important:</strong> These are early-stage results on a limited sample. The system is designed to improve as more Pacifica data accumulates. Past signal accuracy does not guarantee future performance.
          </div>
        </div>
      </section>

      {/* Alpha Score */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Zap className="h-5 w-5 text-yellow-400" />
          Alpha Score: 5 Signals, 1 Number
        </h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed">
          <p>
            The Alpha Score is a composite 0&ndash;100 metric synthesizing five independent signal dimensions, each derived exclusively from live Pacifica API data:
          </p>
          <div className="mt-3 space-y-2">
            {[
              { signal: "Momentum", weight: "25%", source: "Pacifica candle data", method: "Rate of change across 15m, 1h, and 4h EMA crossovers. Measures directional strength." },
              { signal: "Volatility", weight: "20%", source: "Pacifica price range", method: "Historical standard deviation inverse. High volatility reduces score confidence; low volatility in a trend amplifies it." },
              { signal: "Funding Rate", weight: "25%", source: "Pacifica funding endpoints", method: "Current rate vs. 8-hour rolling average. Extreme positive = overleveraged longs (bearish signal). Negative = shorts paying (bullish signal)." },
              { signal: "Volume", weight: "15%", source: "Pacifica trade stream", method: "Relative volume vs. 24h mean. Volume surges confirm directional moves; declining volume weakens signals." },
              { signal: "Orderbook Depth", weight: "15%", source: "Pacifica bid/ask data", method: "Bid-ask imbalance ratio. Heavy bids = support (bullish); heavy asks = resistance (bearish)." },
            ].map((s) => (
              <div key={s.signal} className="rounded-lg border border-border/50 bg-background/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{s.signal}</span>
                  <span className="rounded bg-yellow-400/10 px-2 py-0.5 text-xs font-bold text-yellow-400">{s.weight}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  <strong>Source:</strong> {s.source} &mdash; {s.method}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3">
            Scores above <strong>58</strong> are classified <span className="text-success">BULLISH</span>, below <strong>42</strong> are <span className="text-danger">BEARISH</span>, and between are <span className="text-warning">NEUTRAL</span>. Trade suggestions (entry zone, target, stop-loss) are derived from the score combined with current orderbook support/resistance levels.
          </p>
        </div>
      </section>

      {/* Signal Validation */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <BarChart3 className="h-5 w-5 text-blue-400" />
          Signal Validation Protocol
        </h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed">
          <p>
            Every Alpha Score signal is timestamped and logged the moment it&apos;s generated. Validation is fully automated against real Pacifica price data:
          </p>
          <ol className="ml-4 list-decimal space-y-2 text-muted">
            <li>Signal fires with direction (BULLISH/BEARISH), entry zone, target price, and stop-loss price</li>
            <li>System monitors the Pacifica mark price over the next <strong>4-hour window</strong></li>
            <li>Signal is scored <strong>CORRECT</strong> if the mark price touches the target before touching the stop-loss</li>
            <li>Signal is scored <strong>INCORRECT</strong> if the stop-loss is hit first, or neither level is reached within 4 hours</li>
          </ol>
          <p className="mt-3">
            This protocol was backtested against <strong>563,000+ historical Pacifica trades</strong> to verify that Pacifica-specific slippage, funding rate deductions, and spread dynamics were incorporated into the model before live deployment.
          </p>
          <p>
            <strong>Current live results:</strong> 342+ signals validated, 55.6% accuracy, across 8 Pacifica perpetual markets. All results are transparent on the <a href="/accuracy" className="text-primary hover:underline">Live Accuracy</a> page.
          </p>
        </div>
      </section>

      {/* AI Consensus */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Brain className="h-5 w-5 text-purple-400" />
          AI Consensus Architecture
        </h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed">
          <p>
            Three independent LLMs analyze each market using <strong>strictly quantitative inputs</strong> from the Pacifica API. No social data, no sentiment scraping &mdash; only verifiable on-chain and exchange data:
          </p>
          <div className="mt-3 space-y-2">
            {[
              { model: "Llama-4 Scout (Groq)", role: "Risk Analyst", data: "Funding rates, liquidation clusters, open interest shifts, volatility regime" },
              { model: "GPT-4o (OpenAI)", role: "Market Analyst", data: "OHLCV candles, volume profile, price momentum, support/resistance from orderbook" },
              { model: "Llama-3.3 70B (Groq)", role: "Technical Analyst", data: "Multi-timeframe trend analysis, EMA crossovers, rate-of-change, orderbook imbalance" },
            ].map((m) => (
              <div key={m.model} className="rounded-lg border border-border/50 bg-background/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{m.model}</span>
                  <span className="rounded bg-purple-400/10 px-2 py-0.5 text-xs text-purple-400">{m.role}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  <strong>Data injected:</strong> {m.data}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3">
            Each model independently outputs a direction (bullish/bearish/neutral), confidence score, and reasoning. These are aggregated into a weighted consensus with regime classification (trending, ranging, or volatile). The consensus mechanism prevents any single model from dominating &mdash; disagreement between models reduces overall confidence, which is surfaced to the user.
          </p>
        </div>
      </section>

      {/* Honest Limitations */}
      <section className="rounded-xl border border-warning/20 bg-warning/5 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-warning">
          <Shield className="h-5 w-5" />
          Limitations & Honest Disclosure
        </h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
          <ul className="ml-4 list-disc space-y-2">
            <li>342 signals is statistically significant (p &lt; 0.02) but represents a limited observation window. Accuracy may change as market conditions evolve.</li>
            <li>Past performance does not guarantee future results. Trading perpetual futures involves substantial risk of loss.</li>
            <li>The 55.6% win rate assumes the stated 1.5:1 risk/reward ratio. Actual trader execution (slippage, late entries, moved stops) will affect realized results.</li>
            <li>Funding rate costs on leveraged positions reduce net returns and are not fully captured in the directional accuracy metric.</li>
            <li>LLM outputs can vary between runs. The consensus mechanism mitigates but does not eliminate model variance.</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
