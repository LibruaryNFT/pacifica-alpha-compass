# Alpha Compass

AI-powered trading intelligence for [Pacifica DEX](https://pacifica.fi) — 3 AI models debate market conditions so you don't have to.

**Live demo:** [alphacompass.xyz](https://alphacompass.xyz)

**Track:** Analytics & Data | **Hackathon:** [Pacifica Hackathon 2026](https://dorahacks.io/hackathon/pacifica)

---

## What It Does

Alpha Compass gives Pacifica traders an AI-driven analytics layer on top of live market data:

1. **Alpha Score** — Proprietary 0–100 composite score computed from 5 signals: momentum, volatility, funding rates, volume, and orderbook depth. Updated every 60 seconds per market. Gives a single actionable number with a trade recommendation.

2. **Live Accuracy Engine** — Every Alpha Score prediction is logged against real Pacifica price data. The accuracy rate (currently 55.6% across 342+ signals, 1.1x better than random) is verified live and transparent.

3. **AI Consensus** — Llama-4 Scout (Risk Analyst), GPT-4o (Sentiment Analyst), and Llama-3.3 70B (Technical Analyst) independently analyze each market. Their verdicts are aggregated into a consensus score with confidence level and regime classification.

4. **Smart Money Tracker** — Detects large trades and unusual activity on Pacifica's public trade stream. Surfaces potential whale accumulation and distribution.

5. **Live Market Dashboard** — Real-time prices via Pacifica REST + WebSocket APIs across all perpetual markets. 24h change, volume, funding rates.

6. **Signal Backtesting** — 563K+ historical Pacifica trades used to validate signal quality before deployment.

## Sponsor Tool Integration

| Tool | Usage | Status |
|------|-------|--------|
| **Pacifica API** | REST + WebSocket — live prices, candles, orderbook, funding, trades | Live |
| **Pacifica Leaderboard API** | Trader count, open interest, top performers | Live |
| **Groq (Llama-4 Scout + Llama-3.3 70B)** | Two of three AI analysts in consensus engine | Live |
| **OpenAI GPT-4o** | Third AI analyst (sentiment-focused) | Live |

## Architecture

```
Browser (Next.js on Vercel)
  ├── Pacifica REST API ─── prices, candles, orderbook, funding
  ├── Pacifica WebSocket ── real-time trade stream
  └── API proxy routes ──── Backend (FastAPI on Hetzner VPS)
                              ├── Alpha Score engine (5 signals → 0-100)
                              ├── Accuracy tracker (log + validate predictions)
                              ├── Groq API (Llama-4 Scout + Llama-3.3 70B)
                              ├── OpenAI API (GPT-4o)
                              └── Smart Money detector
```

- **Frontend:** Next.js 15, TypeScript, Tailwind CSS, Recharts
- **Backend:** FastAPI, Python 3.12, async I/O
- **AI:** GPT-4o (OpenAI), Llama-4 Scout + Llama-3.3 70B (Groq)
- **Deploy:** Vercel (frontend) + Hetzner VPS2 (backend)

## Pages

| Page | Description | Status |
|------|-------------|--------|
| **Dashboard** | Live prices, Alpha Score grid, accuracy badge, WebSocket status | Live |
| **Alpha Score** | Per-market deep dive — 5 signal breakdown, trade suggestion, liquidation risk | Live |
| **AI Consensus** | 3-model debate with vote visualization and confidence scores | Live |
| **Live Accuracy** | Real-time signal validation — every prediction tracked against actual price moves | Live |
| **Smart Money** | Whale trade detection, large position tracking | Live |
| **Live Trades** | Real-time trade stream from Pacifica WebSocket | Live |
| **Market Detail** | Candle chart, orderbook visualization, recent trades | Live |
| **Portfolio** | Position viewer (mock data — requires wallet API auth) | Demo |
| **Backtest** | Historical signal backtesting UI | Live |
| **Referrals** | Referral link generator (wallet connection optional) | Live |

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Fill in API keys
python app.py
```

Required env vars: `OPENAI_API_KEY`, `GROQ_API_KEY`, `INTERNAL_API_KEY`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Required env vars: `BACKEND_URL`, `INTERNAL_API_KEY`

## Security

- All LLM API keys are server-side only (never exposed to browser)
- Backend endpoints protected with internal API key header (`x-internal-key`)
- AI results cached (60 seconds) to minimize API costs and latency
- No secrets in source code — all via environment variables

## Team

Built by [LibruaryNFT](https://github.com/LibruaryNFT) for the Pacifica Hackathon 2026.
