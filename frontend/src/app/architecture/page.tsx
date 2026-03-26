"use client";

import { Server, Shield, DollarSign, Layers } from "lucide-react";

const COST_BREAKDOWN = [
  { service: "Vercel (Frontend)", cost: "$0/mo", note: "Free tier, static + serverless" },
  { service: "Hetzner VPS (Backend)", cost: "$5/mo", note: "Shared with other services" },
  { service: "Claude API (Risk)", cost: "~$0.03/call", note: "Cached 1hr, ~$2/day max" },
  { service: "GPT-4o API (Sentiment)", cost: "~$0.03/call", note: "Cached 1hr, ~$2/day max" },
  { service: "Llama-3 via Groq (Technical)", cost: "$0/call", note: "Free tier" },
  { service: "Elfa AI (Social)", cost: "$0/call", note: "Free tier, 60 req/min" },
  { service: "Pacifica API (Market Data)", cost: "$0", note: "Public endpoints, no auth" },
];

const ARCH_LAYERS = [
  {
    name: "Data Layer",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    items: [
      "Pacifica REST API — prices, candles, orderbook, funding rates (5s polling)",
      "Pacifica WebSocket — real-time trade stream (connection indicator)",
      "Elfa AI API — social mentions, trending tokens, sentiment scores",
    ],
  },
  {
    name: "Intelligence Layer",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    items: [
      "Alpha Score Engine — 5-signal composite (momentum, volatility, funding, volume, orderbook)",
      "Funding Rate Predictor — mean-reversion model with 1h/4h forecasts",
      "Liquidation Risk Detector — OI concentration + cluster proximity analysis",
      "Trade Suggestion Generator — entry/target/stop/R:R from signal synthesis",
    ],
  },
  {
    name: "AI Debate Layer",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    items: [
      "Claude (Risk Analyst) — receives Alpha Score signals, evaluates downside",
      "GPT-4o (Sentiment Analyst) — receives funding predictions, reads crowd positioning",
      "Llama-3 (Technical Analyst) — receives trade suggestions, validates with TA",
      "Consensus Engine — weighted vote aggregation, regime detection, alert generation",
    ],
  },
  {
    name: "Presentation Layer",
    color: "text-green-400",
    bg: "bg-green-400/10",
    items: [
      "Next.js 14 + Tailwind CSS — 11 pages, server-side API proxy",
      "Privy — Solana wallet connection (Phantom, Solflare, MetaMask)",
      "Rhino.fi — cross-chain USDC bridge widget (7+ chains to Solana)",
      "Fuul — referral tracking with attribution and leaderboard",
    ],
  },
];

export default function ArchitecturePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">
          <Layers className="mr-2 inline h-6 w-6 text-accent" />
          Architecture
        </h1>
        <p className="mt-1 text-sm text-muted">
          How Alpha Compass processes data, generates intelligence, and serves it to traders
        </p>
      </div>

      {/* Why Blockchain */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
        <h2 className="mb-4 text-lg font-semibold">Why Solana / Pacifica?</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium">The Data Source</h3>
            <p className="mt-1 text-xs text-muted">
              Pacifica is a perpetual futures DEX on Solana processing $440M+ daily volume.
              Unlike centralized exchanges, all trade data is verifiable on-chain. Our analytics
              layer reads directly from Pacifica&apos;s public API — same data that settles on Solana.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium">What the Blockchain Enables</h3>
            <p className="mt-1 text-xs text-muted">
              <strong>Transparent funding rates</strong> — calculated on-chain every 5 seconds, not by a company.
              <strong> Non-custodial trading</strong> — users keep their keys, we just read public data.
              <strong> Verifiable execution</strong> — every trade our Alpha Score references is settled on Solana.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium">Data Flow</h3>
            <p className="mt-1 text-xs text-muted">
              Solana blockchain → Pacifica matching engine → REST/WebSocket API → Alpha Compass
              reads prices, orderbook, trades, funding rates → processes through 5 signal algorithms
              + 3 AI models → outputs actionable intelligence.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium">Wallet Integration</h3>
            <p className="mt-1 text-xs text-muted">
              Users connect their Solana wallet (Phantom, Solflare) via Privy. In production,
              this links to their actual Pacifica positions for real P&L tracking. The bridge
              (Rhino.fi) lets them fund from any chain into Solana USDC.
            </p>
          </div>
        </div>
      </div>

      {/* Data flow diagram */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Data Flow</h2>
        <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-muted">
{`Browser (Next.js on Vercel)
  |
  |-- Direct --> Pacifica API (HTTPS)     [prices, candles, orderbook, funding]
  |-- Direct --> Pacifica WebSocket       [real-time trade stream]
  |
  |-- Proxy --> Vercel API Routes (HTTPS)
                  |
                  |-- Internal Key --> Backend (FastAPI on Hetzner VPS)
                                        |
                                        |-- Alpha Score Engine   [5 signals → composite score]
                                        |-- AI Consensus Engine  [3 LLMs fed with Alpha Score data]
                                        |   |-- Claude API       [risk analysis]
                                        |   |-- OpenAI API       [sentiment analysis]
                                        |   |-- Groq API         [technical analysis, free]
                                        |
                                        |-- Elfa AI API         [social sentiment]
                                        |
                                        |-- 1hr cache           [minimize API costs]`}
        </pre>
      </div>

      {/* Layered architecture */}
      <div className="space-y-4">
        {ARCH_LAYERS.map((layer) => (
          <div key={layer.name} className="rounded-xl border border-border bg-card p-5">
            <h3 className={`font-semibold ${layer.color}`}>{layer.name}</h3>
            <ul className="mt-3 space-y-2">
              {layer.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted">
                  <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${layer.bg} ring-2 ring-current ${layer.color}`} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Security */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Shield className="h-5 w-5 text-primary" />
          Security Model
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg bg-background/50 p-4">
            <h3 className="text-sm font-medium">API Key Protection</h3>
            <p className="mt-1 text-xs text-muted">
              All LLM API keys (OpenAI, Anthropic, Groq) and the Elfa AI key are stored
              server-side only. Never exposed to the browser. The Vercel→Backend proxy
              uses an internal API key header for authentication.
            </p>
          </div>
          <div className="rounded-lg bg-background/50 p-4">
            <h3 className="text-sm font-medium">Cost Protection</h3>
            <p className="mt-1 text-xs text-muted">
              All AI results are cached for 1 hour. Even under heavy load, maximum daily
              API cost is ~$4. Unauthenticated requests to expensive endpoints return 403.
            </p>
          </div>
          <div className="rounded-lg bg-background/50 p-4">
            <h3 className="text-sm font-medium">No Secrets in Code</h3>
            <p className="mt-1 text-xs text-muted">
              Zero API keys, passwords, or server IPs in the git repository. All configuration
              via environment variables. .env files are gitignored.
            </p>
          </div>
          <div className="rounded-lg bg-background/50 p-4">
            <h3 className="text-sm font-medium">Data Privacy</h3>
            <p className="mt-1 text-xs text-muted">
              Wallet connections via Privy stay client-side. We never store private keys
              or wallet data on our servers. Portfolio data flows directly from Pacifica API.
            </p>
          </div>
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <DollarSign className="h-5 w-5 text-success" />
          Cost to Operate
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="pb-2 pr-4">Service</th>
                <th className="pb-2 pr-4">Cost</th>
                <th className="pb-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {COST_BREAKDOWN.map((row) => (
                <tr key={row.service} className="border-b border-border/30">
                  <td className="py-2 pr-4 font-medium">{row.service}</td>
                  <td className="py-2 pr-4 font-mono text-success">{row.cost}</td>
                  <td className="py-2 text-muted">{row.note}</td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="py-2 pr-4">Total (estimated)</td>
                <td className="py-2 pr-4 font-mono text-success">~$9/mo</td>
                <td className="py-2 text-muted">At moderate usage (100 analyses/day)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Scalability */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Server className="h-5 w-5 text-accent" />
          Scalability Path
        </h2>
        <div className="space-y-3 text-sm text-muted">
          <p>
            <strong className="text-foreground">Current:</strong> Single VPS backend handles
            ~100 concurrent users with 1hr caching. Vercel frontend scales automatically.
          </p>
          <p>
            <strong className="text-foreground">1,000 users:</strong> Add Redis for shared cache
            across multiple backend instances. Move to container orchestration (Docker + fly.io).
            Estimated cost: ~$50/mo.
          </p>
          <p>
            <strong className="text-foreground">10,000+ users:</strong> Replace LLM API calls with
            fine-tuned local models (Llama-3 on dedicated GPU). Pre-compute Alpha Scores for all
            markets on a cron schedule. Add WebSocket push for real-time score updates.
            Estimated cost: ~$200/mo with dedicated GPU.
          </p>
          <p>
            <strong className="text-foreground">Revenue model:</strong> Freemium — basic Alpha Scores free,
            AI Consensus + trade suggestions + real-time alerts at $19/mo. Builder Code revenue sharing
            from trades executed through the platform.
          </p>
        </div>
      </div>
    </div>
  );
}
