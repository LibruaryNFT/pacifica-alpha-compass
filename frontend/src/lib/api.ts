import { API_URL } from "./constants";

// --- Types ---

export interface MarketPrice {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  fundingRate?: number;
  openInterest?: number;
}

export interface Position {
  symbol: string;
  side: "long" | "short";
  size: number;
  entry_price: number;
  mark_price: number;
  unrealized_pnl: number;
  realized_pnl: number;
  leverage: number;
  liquidation_price?: number;
  margin?: number;
}

export interface PortfolioSummary {
  total_equity: number;
  total_unrealized_pnl: number;
  total_realized_pnl: number;
  total_margin_used: number;
  available_balance: number;
  positions: Position[];
  portfolio_heat: number;
}

export interface AIAnalysis {
  model_name: string;
  role: string;
  direction: "bullish" | "bearish" | "neutral";
  confidence: number;
  score: number;
  reasoning: string;
  key_factors: string[];
}

export interface ConsensusResult {
  symbol: string;
  direction: "bullish" | "bearish" | "neutral";
  confidence: number;
  overall_score: number;
  regime: "trending" | "ranging" | "volatile";
  summary: string;
  analyses: AIAnalysis[];
  alert?: string;
  timestamp: string;
}

export interface FundingOpportunity {
  symbol: string;
  rate: number;
  type: string;
  annualized: number;
}

export interface FundingScanResult {
  opportunities: FundingOpportunity[];
  highest_positive?: { symbol: string; rate: number };
  most_negative?: { symbol: string; rate: number };
  average_rate: number;
}

export interface WhaleAlert {
  symbol: string;
  side: string;
  size_usd: number;
  price: number;
  timestamp: string;
  alert_type: string;
}

// --- Mock Data (demo fallback) ---

const MOCK_PRICES: Record<string, number> = {
  "BTC-USDC": 67240,
  "ETH-USDC": 3412,
  "SOL-USDC": 182.45,
  "DOGE-USDC": 0.168,
  "ARB-USDC": 1.24,
  "AVAX-USDC": 38.90,
  "LINK-USDC": 14.82,
  "OP-USDC": 2.65,
};

function mockPrices(): MarketPrice[] {
  return Object.entries(MOCK_PRICES).map(([symbol, price]) => ({
    symbol,
    price: price * (1 + (Math.random() - 0.5) * 0.002),
    change24h: (Math.random() - 0.5) * 8,
    volume24h: Math.random() * 1e8,
    high24h: price * 1.03,
    low24h: price * 0.97,
    fundingRate: (Math.random() - 0.5) * 0.02,
  }));
}

function mockPortfolio(): PortfolioSummary {
  return {
    total_equity: 10000,
    total_unrealized_pnl: 425.50,
    total_realized_pnl: 1230.00,
    total_margin_used: 1641.67,
    available_balance: 7500,
    positions: [
      {
        symbol: "SOL-USDC",
        side: "long",
        size: 50,
        entry_price: 175.20,
        mark_price: 182.45,
        unrealized_pnl: 362.50,
        realized_pnl: 0,
        leverage: 5,
        liquidation_price: 148.16,
        margin: 500,
      },
      {
        symbol: "BTC-USDC",
        side: "short",
        size: 0.05,
        entry_price: 68500,
        mark_price: 67240,
        unrealized_pnl: 63,
        realized_pnl: 0,
        leverage: 3,
        liquidation_price: 89200,
        margin: 1141.67,
      },
    ],
    portfolio_heat: 16.4,
  };
}

// --- API Functions ---

async function apiFetch<T>(endpoint: string, fallback: () => T): Promise<T> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(`API fetch failed for ${endpoint}, using mock:`, error);
    return fallback();
  }
}

export async function fetchPrices(): Promise<MarketPrice[]> {
  return apiFetch("/api/prices", mockPrices);
}

export async function fetchPrice(symbol: string): Promise<MarketPrice> {
  return apiFetch(`/api/price/${symbol}`, () => ({
    symbol,
    price: MOCK_PRICES[symbol] || 100,
    change24h: (Math.random() - 0.5) * 8,
    volume24h: Math.random() * 1e8,
    high24h: (MOCK_PRICES[symbol] || 100) * 1.03,
    low24h: (MOCK_PRICES[symbol] || 100) * 0.97,
  }));
}

export async function fetchCandles(
  symbol: string,
  interval = "1h",
  limit = 168
): Promise<unknown[]> {
  return apiFetch(`/api/candles/${symbol}?interval=${interval}&limit=${limit}`, () => []);
}

export async function fetchOrderbook(symbol: string): Promise<unknown> {
  return apiFetch(`/api/orderbook/${symbol}`, () => ({ bids: [], asks: [] }));
}

export async function fetchPortfolio(): Promise<PortfolioSummary> {
  return apiFetch("/api/portfolio", mockPortfolio);
}

export async function fetchFundingScan(): Promise<FundingScanResult> {
  return apiFetch("/api/funding-scan", () => ({
    opportunities: [],
    average_rate: 0,
  }));
}

export async function fetchConsensus(symbol: string): Promise<ConsensusResult> {
  return apiFetch(`/api/ai/consensus/${symbol}`, () => ({
    symbol,
    direction: "neutral" as const,
    confidence: 0,
    overall_score: 5,
    regime: "ranging" as const,
    summary: "AI analysis unavailable — connect backend to enable",
    analyses: [],
    timestamp: new Date().toISOString(),
  }));
}

export async function fetchWhales(
  symbol: string,
  threshold = 50000
): Promise<WhaleAlert[]> {
  return apiFetch(`/api/whales/${symbol}?threshold_usd=${threshold}`, () => []);
}

// --- Social Sentiment (Elfa AI) ---

export interface SocialSentiment {
  symbol: string;
  token: string;
  sentiment_score: number;
  sentiment_label: "bullish" | "bearish" | "neutral";
  mention_count_24h: number;
  positive_mentions: number;
  negative_mentions: number;
  top_mentions: {
    text: string;
    engagement: number;
    source: string;
    timestamp: string;
  }[];
  source: string;
}

export async function fetchSocialSentiment(
  symbol: string
): Promise<SocialSentiment> {
  return apiFetch(`/api/social/sentiment/${symbol}`, () => ({
    symbol,
    token: symbol.split("-")[0],
    sentiment_score: 0.5,
    sentiment_label: "neutral" as const,
    mention_count_24h: 0,
    positive_mentions: 0,
    negative_mentions: 0,
    top_mentions: [],
    source: "mock",
  }));
}

export async function fetchTrendingTokens(): Promise<unknown[]> {
  return apiFetch("/api/social/trending", () => []);
}
