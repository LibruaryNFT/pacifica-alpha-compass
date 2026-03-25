export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
