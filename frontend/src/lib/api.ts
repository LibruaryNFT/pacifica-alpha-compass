import { PACIFICA_API } from "./constants";

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

// --- Mock Data (fallback when APIs fail) ---

const MOCK_PRICES: Record<string, number> = {
  "BTC-USDC": 67240, "ETH-USDC": 3412, "SOL-USDC": 182.45,
  "DOGE-USDC": 0.168, "ARB-USDC": 1.24, "AVAX-USDC": 38.90,
  "LINK-USDC": 14.82, "OP-USDC": 2.65,
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
      { symbol: "SOL-USDC", side: "long", size: 50, entry_price: 175.20, mark_price: 182.45, unrealized_pnl: 362.50, realized_pnl: 0, leverage: 5, liquidation_price: 148.16, margin: 500 },
      { symbol: "BTC-USDC", side: "short", size: 0.05, entry_price: 68500, mark_price: 67240, unrealized_pnl: 63, realized_pnl: 0, leverage: 3, liquidation_price: 89200, margin: 1141.67 },
    ],
    portfolio_heat: 16.4,
  };
}

// --- Fetch helpers ---

async function pacificaFetch<T>(path: string, fallback: () => T): Promise<T> {
  try {
    const response = await fetch(`${PACIFICA_API}${path}`);
    if (!response.ok) throw new Error(`Pacifica API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(`Pacifica API failed for ${path}, using mock:`, error);
    return fallback();
  }
}

// backendFetch removed — backend calls now go through Next.js API proxy routes

// --- Pacifica Direct (public market data — no auth needed) ---

export async function fetchPrices(): Promise<MarketPrice[]> {
  // market-price endpoint is 404, build prices from /trades
  const symbols = ["BTC", "ETH", "SOL", "DOGE", "ARB", "AVAX", "LINK", "OP"];
  try {
    const results = await Promise.allSettled(
      symbols.map(async (sym) => {
        const res = await fetch(`${PACIFICA_API}/trades?symbol=${sym}&limit=1`);
        if (!res.ok) return null;
        const data = await res.json();
        const trades = data?.data;
        if (!trades?.length) return null;
        return {
          symbol: `${sym}-USDC`,
          price: parseFloat(trades[0].price),
          markPrice: parseFloat(trades[0].price),
        };
      })
    );
    const prices: MarketPrice[] = [];
    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        prices.push(normalizePrice(r.value as Record<string, unknown>));
      }
    }

    return prices.length > 0 ? prices : mockPrices();
  } catch {
    return mockPrices();
  }
}

export async function fetchPrice(symbol: string): Promise<MarketPrice> {
  const data = await pacificaFetch(`/market-price?symbol=${symbol}`, () => ({
    symbol, price: MOCK_PRICES[symbol] || 100,
    change24h: 0, volume24h: 0, high24h: 0, low24h: 0,
  }));
  return normalizePrice(data as Record<string, unknown>);
}

export async function fetchCandles(
  symbol: string, interval = "1h", limit = 168
): Promise<unknown[]> {
  return pacificaFetch(`/candles?symbol=${symbol}&interval=${interval}&limit=${limit}`, () => []);
}

export async function fetchOrderbook(symbol: string): Promise<unknown> {
  return pacificaFetch(`/orderbook?symbol=${symbol}&limit=20`, () => ({ bids: [], asks: [] }));
}

export async function fetchFundingRate(symbol: string): Promise<unknown> {
  return pacificaFetch(`/funding-rate?symbol=${symbol}`, () => ({ symbol, rate: 0 }));
}

export async function fetchRecentTrades(symbol: string, limit = 50): Promise<unknown[]> {
  return pacificaFetch(`/trades?symbol=${symbol}&limit=${limit}`, () => []);
}

// Funding scan: fetch all funding rates and compute opportunities client-side
export async function fetchFundingScan(): Promise<FundingScanResult> {
  try {
    const rates = await pacificaFetch<unknown[]>("/funding-rate", () => []);
    if (!Array.isArray(rates) || rates.length === 0) {
      return { opportunities: [], average_rate: 0 };
    }

    const parsed = rates.map((r: unknown) => {
      const rec = r as Record<string, unknown>;
      return {
        symbol: String(rec.symbol || "?"),
        rate: Number(rec.fundingRate ?? rec.rate ?? 0),
      };
    });

    const sorted = [...parsed].sort((a, b) => a.rate - b.rate);
    const avg = parsed.reduce((s, r) => s + r.rate, 0) / parsed.length;

    const opportunities: FundingOpportunity[] = parsed
      .filter((r) => Math.abs(r.rate) > 0.01)
      .map((r) => ({
        symbol: r.symbol,
        rate: r.rate,
        type: r.rate > 0 ? "high_positive" : "high_negative",
        annualized: r.rate * 3 * 365,
      }));

    return {
      opportunities,
      highest_positive: sorted.length ? { symbol: sorted[sorted.length - 1].symbol, rate: sorted[sorted.length - 1].rate } : undefined,
      most_negative: sorted.length ? { symbol: sorted[0].symbol, rate: sorted[0].rate } : undefined,
      average_rate: avg,
    };
  } catch {
    return { opportunities: [], average_rate: 0 };
  }
}

// Whale detection: fetch recent trades and filter large ones client-side
export async function fetchWhales(symbol: string, threshold = 50000): Promise<WhaleAlert[]> {
  try {
    const trades = await fetchRecentTrades(symbol, 100);
    const whales: WhaleAlert[] = [];
    for (const t of trades as Record<string, unknown>[]) {
      const size = Number(t.size ?? t.qty ?? 0);
      const price = Number(t.price ?? 0);
      const usd = size * price;
      if (usd >= threshold) {
        whales.push({
          symbol,
          side: String(t.side ?? "unknown"),
          size_usd: Math.round(usd * 100) / 100,
          price,
          timestamp: String(t.timestamp ?? t.time ?? new Date().toISOString()),
          alert_type: "large_trade",
        });
      }
    }
    return whales.sort((a, b) => b.size_usd - a.size_usd);
  } catch {
    return [];
  }
}

// Portfolio: mock for now (needs wallet auth to be real)
export async function fetchPortfolio(): Promise<PortfolioSummary> {
  return mockPortfolio();
}

// --- Backend via Next.js API proxy (avoids HTTPS mixed content) ---

export async function fetchConsensus(symbol: string): Promise<ConsensusResult> {
  try {
    const response = await fetch(`/api/ai/consensus/${symbol}`);
    if (!response.ok) throw new Error(`Proxy error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn("AI consensus failed:", error);
    return {
      symbol,
      direction: "neutral" as const,
      confidence: 0,
      overall_score: 5,
      regime: "ranging" as const,
      summary: "AI analysis unavailable — backend unreachable",
      analyses: [],
      timestamp: new Date().toISOString(),
    };
  }
}

export async function fetchSocialSentiment(symbol: string): Promise<SocialSentiment> {
  try {
    const response = await fetch(`/api/social/sentiment/${symbol}`);
    if (!response.ok) throw new Error(`Proxy error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn("Social sentiment failed:", error);
    return {
      symbol,
      token: symbol.split("-")[0],
      sentiment_score: 0.5,
      sentiment_label: "neutral" as const,
      mention_count_24h: 0,
      positive_mentions: 0,
      negative_mentions: 0,
      top_mentions: [],
      source: "mock",
    };
  }
}

export async function fetchTrendingTokens(): Promise<unknown[]> {
  try {
    const response = await fetch("/api/social/trending");
    if (!response.ok) throw new Error(`Proxy error: ${response.status}`);
    return await response.json();
  } catch {
    return [];
  }
}

// --- Helpers ---

function normalizePrice(raw: Record<string, unknown>): MarketPrice {
  return {
    symbol: String(raw.symbol || ""),
    price: Number(raw.price ?? raw.markPrice ?? raw.lastPrice ?? 0),
    change24h: Number(raw.change24h ?? raw.priceChange24h ?? 0),
    volume24h: Number(raw.volume24h ?? raw.volume ?? 0),
    high24h: Number(raw.high24h ?? raw.high ?? 0),
    low24h: Number(raw.low24h ?? raw.low ?? 0),
    fundingRate: raw.fundingRate != null ? Number(raw.fundingRate) : undefined,
    openInterest: raw.openInterest != null ? Number(raw.openInterest) : undefined,
  };
}
