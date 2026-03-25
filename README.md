# Alpha Compass

AI-powered trading intelligence for [Pacifica DEX](https://pacifica.fi) — 3 AI models debate market conditions so you don't have to.

**Live demo:** [alpha-compass.vercel.app](https://alpha-compass.vercel.app)

**Track:** Analytics & Data | **Hackathon:** [Pacifica Hackathon 2026](https://dorahacks.io/hackathon/pacifica)

---

## What It Does

Alpha Compass gives Pacifica traders an AI-driven analytics layer on top of live market data:

1. **AI Consensus Engine** — Claude (Risk Analyst), GPT-4o (Sentiment Analyst), and Llama-3 (Technical Analyst) independently analyze market conditions. Each makes its case, then their verdicts are aggregated into a consensus score with confidence level.

2. **Live Market Dashboard** — Real-time prices via Pacifica REST + WebSocket APIs across all perpetual markets. Funding rate scanner identifies arbitrage opportunities.

3. **Social Intelligence** — Elfa AI integration tracks trending tokens, sentiment shifts, and social volume across Twitter/Telegram. Feeds into the AI analysis for context.

4. **Portfolio Tracking** — Connect your Solana wallet via Privy to view positions, P&L, and risk metrics.

5. **Cross-Chain Funding** — Bridge USDC from Ethereum, Arbitrum, or any chain to Solana via Rhino.fi — without leaving the app.

6. **Referral Program** — Invite friends and earn trading fee rebates via Fuul's incentive infrastructure.

## Sponsor Tool Integration

| Tool | Usage | Integration Depth |
|------|-------|-------------------|
| **Pacifica API** | REST + WebSocket for live market data, candles, orderbook, funding rates | Core data layer |
| **Elfa AI** | Social sentiment analysis, trending tokens, mention tracking | AI context enrichment |
| **Privy** | Solana wallet connection, user auth | Wallet onboarding |
| **Rhino.fi** | Cross-chain USDC bridge (ETH/ARB/Base → Solana) | Funding flow |
| **Fuul** | Referral tracking, leaderboard, fee sharing | Growth mechanics |

## Architecture

```
Browser
  ├── Pacifica API (HTTPS) ── live prices, candles, orderbook, funding
  ├── Pacifica WebSocket ──── real-time trade stream
  └── Vercel (Next.js)
        ├── Static pages (Dashboard, Bridge, Referrals, etc.)
        └── API proxy routes ──── Backend (FastAPI on VPS)
                                    ├── Claude API (risk analysis)
                                    ├── GPT-4o API (sentiment analysis)
                                    ├── Llama-3 via Groq (technical analysis)
                                    └── Elfa AI API (social data)
```

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Recharts
- **Backend:** FastAPI, Python, async
- **AI:** Claude (Anthropic), GPT-4o (OpenAI), Llama-3 (Groq)
- **Deploy:** Vercel (frontend) + Hetzner VPS (backend)

## Pages

| Page | Description |
|------|-------------|
| **Dashboard** | Live prices, funding opportunities, portfolio summary, WebSocket status |
| **AI Consensus** | 3-model debate with typing animation, vote visualization, confidence scores |
| **Portfolio** | Positions, P&L, margin usage, liquidation levels |
| **Scanner** | Funding rate scanner across all markets |
| **Whales** | Large trade detection and alerts |
| **Bridge** | Rhino.fi cross-chain bridge widget |
| **Referrals** | Fuul-powered referral program with leaderboard |
| **Testnet** | Setup guide for Pacifica testnet |
| **Market Detail** | Per-market deep dive with candle chart, orderbook viz |

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

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # Fill in values
npm run dev
```

## Security

- All LLM API keys are server-side only (never exposed to browser)
- Backend endpoints protected with internal API key header
- AI results cached (1 hour) to minimize API costs
- No secrets in source code — all via environment variables

## Team

Built by [LibruaryNFT](https://github.com/LibruaryNFT) for the Pacifica Hackathon 2026.
