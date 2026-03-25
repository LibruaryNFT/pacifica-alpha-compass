// Backend API (only for AI consensus + social sentiment — endpoints that need server-side API keys)
export const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002";

// Pacifica API (called directly from browser — no auth needed for public endpoints)
export const PACIFICA_API = "https://api.pacifica.fi/api/v1";
export const PACIFICA_TESTNET_API = "https://test-api.pacifica.fi/api/v1";

export const REFRESH_INTERVALS = {
  PRICES: 5000,       // 5s for real-time prices
  PORTFOLIO: 15000,   // 15s for portfolio
  FUNDING: 30000,     // 30s for funding rates
  AI_ANALYSIS: 900000, // 15min for AI (expensive)
} as const;

export const TOP_MARKETS = [
  "BTC-USDC",
  "ETH-USDC",
  "SOL-USDC",
  "DOGE-USDC",
  "ARB-USDC",
  "AVAX-USDC",
  "LINK-USDC",
  "OP-USDC",
] as const;
