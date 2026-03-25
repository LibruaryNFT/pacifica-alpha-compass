# Alpha Compass — Demo Video Script (3 minutes)

## Format
- Screen recording of the live app
- Voiceover narration (record separately, sync in editing)
- Background: lo-fi or subtle electronic music

---

## Scene 1: Hook (0:00 - 0:20)

**Show:** Dashboard loading with live prices streaming in

**Narration:**
"Every perp trader faces the same problem — too much data, not enough signal. Alpha Compass solves this by having three AI models debate every market in real-time, so you get a consensus view instead of guessing."

---

## Scene 2: Dashboard Tour (0:20 - 0:45)

**Show:** Scroll through dashboard — live prices, funding rates, portfolio summary, WebSocket indicator

**Narration:**
"The dashboard pulls live data directly from Pacifica's API and WebSocket feed. You see real-time prices across all markets, funding rate opportunities, and your portfolio at a glance."

**Action:** Click on a market card to show the detail page with candle chart, orderbook visualization

---

## Scene 3: AI Consensus Engine — The Star Feature (0:45 - 1:30)

**Show:** Navigate to AI Consensus page. Select BTC-USDC. Watch the three models appear one by one.

**Narration:**
"This is the core innovation — the AI Consensus Engine. Three models with different specialties analyze the same market simultaneously:
- Claude acts as the Risk Analyst, evaluating downside scenarios
- GPT-4o focuses on Sentiment, reading social signals and news flow
- Llama-3 handles Technical Analysis, reading chart patterns and indicators

Each model makes its case. Then we aggregate their votes into a consensus verdict with a confidence score."

**Action:** Show the verdict card, vote breakdown, individual model arguments appearing with typing animation

---

## Scene 4: Social Sentiment (1:30 - 1:50)

**Show:** The Elfa AI sentiment panel next to the AI consensus

**Narration:**
"We overlay social intelligence from Elfa AI — tracking what's trending across Twitter, Telegram, and crypto communities. This feeds into the AI models' analysis, giving them real-time social context that pure price data can't provide."

---

## Scene 5: Wallet Connection + Portfolio (1:50 - 2:10)

**Show:** Click Connect Wallet (Privy modal appears). Connect with Phantom. Show portfolio page.

**Narration:**
"Traders connect their Solana wallet through Privy — one click, no friction. In production, this pulls your actual Pacifica positions, P&L, and liquidation levels. Currently in demo mode while we finalize Pacifica's authenticated API integration."

---

## Scene 6: Bridge + Referrals (2:10 - 2:35)

**Show:** Navigate to Bridge page (Rhino.fi widget). Then Referrals page.

**Narration:**
"Funding is seamless — the Rhino.fi bridge lets you bring USDC from Ethereum, Arbitrum, or any chain directly to Solana in one step.

And to grow the user base, we integrated Fuul's referral infrastructure. Share your link, earn a cut of trading fees when your referrals trade through Alpha Compass."

---

## Scene 7: Closing + Architecture (2:35 - 3:00)

**Show:** Quick montage of all pages. Then show the footer with all sponsor tool credits.

**Narration:**
"Alpha Compass integrates the full Pacifica ecosystem — live market data via REST and WebSocket APIs, AI-powered analysis, social intelligence from Elfa AI, wallet onboarding through Privy, cross-chain bridging via Rhino.fi, and referral incentives through Fuul.

Built for the Pacifica Hackathon — Analytics & Data track. Thank you."

**Show:** Fade to logo + "alpha-compass.vercel.app"

---

## Technical Notes

- Record at 1920x1080
- Use the live deployed version: https://alpha-compass.vercel.app
- Make sure the AI consensus call succeeds before recording (might need a warm-up call)
- The AI typing animation is the visual highlight — let it play out fully
- Keep browser tabs clean, zoom to 110% for readability
