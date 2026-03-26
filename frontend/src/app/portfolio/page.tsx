"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Search,
  ExternalLink,
} from "lucide-react";

interface AlphaScore {
  symbol: string;
  alpha_score: number;
  direction: string;
  regime: string;
  trade_suggestion: {
    action: string;
    confidence: number;
    entry_zone: string;
    target: string;
    stop_loss: string;
    risk_reward: number;
  };
  liquidation_risk: {
    risk_level: string;
    risk_score: number;
  };
}

interface WalletBalance {
  sol: number;
  total_usd: number;
}

interface PacificaPosition {
  symbol: string;
  side: string;
  size: number;
  entry_price: number;
  unrealized_pnl: number;
  leverage: number;
}

interface PacificaOrder {
  symbol: string;
  side: string;
  size: number;
  price: number;
  order_type: string;
}

export default function PortfolioPage() {
  const [addressInput, setAddressInput] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  const [alphaScores, setAlphaScores] = useState<Record<string, AlphaScore>>({});
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [positions, setPositions] = useState<PacificaPosition[]>([]);
  const [orders, setOrders] = useState<PacificaOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadData = useCallback(async (addr: string) => {
    setLoading(true);
    setError("");

    // Load Alpha Scores
    try {
      const res = await fetch("/api/alpha-scores/all");
      if (res.ok) {
        const data = await res.json();
        if (data?.scores) setAlphaScores(data.scores);
      }
    } catch { /* unavailable */ }

    // Fetch SOL balance
    try {
      const rpcRes = await fetch("https://api.devnet.solana.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [addr] }),
      });
      if (rpcRes.ok) {
        const rpcData = await rpcRes.json();
        if (rpcData?.error) {
          setError("Invalid Solana address");
          setLoading(false);
          return;
        }
        const solBalance = (rpcData?.result?.value ?? 0) / 1e9;
        setBalance({ sol: solBalance, total_usd: solBalance * 180 });
      }
    } catch { /* RPC unavailable */ }

    // Fetch REAL positions from Pacifica
    try {
      const posRes = await fetch(`https://api.pacifica.fi/api/v1/positions?account=${addr}`);
      if (posRes.ok) {
        const posData = await posRes.json();
        if (posData?.success && Array.isArray(posData.data)) {
          setPositions(posData.data.map((p: Record<string, unknown>) => ({
            symbol: String(p.symbol || p.market || ""),
            side: String(p.side || ""),
            size: Number(p.size || p.amount || 0),
            entry_price: Number(p.entry_price || p.entryPrice || 0),
            unrealized_pnl: Number(p.unrealized_pnl || p.pnl || 0),
            leverage: Number(p.leverage || 1),
          })));
        }
      }
    } catch { /* unavailable */ }

    // Fetch REAL orders from Pacifica
    try {
      const ordRes = await fetch(`https://api.pacifica.fi/api/v1/orders?account=${addr}`);
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        if (ordData?.success && Array.isArray(ordData.data)) {
          setOrders(ordData.data.map((o: Record<string, unknown>) => ({
            symbol: String(o.symbol || o.market || ""),
            side: String(o.side || ""),
            size: Number(o.size || o.amount || 0),
            price: Number(o.price || 0),
            order_type: String(o.order_type || o.type || "limit"),
          })));
        }
      }
    } catch { /* unavailable */ }

    setLoading(false);
  }, []);

  // Load Alpha Scores on mount (even without wallet)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/alpha-scores/all");
        if (res.ok) {
          const data = await res.json();
          if (data?.scores) setAlphaScores(data.scores);
        }
      } catch { /* unavailable */ }
    })();
  }, []);

  const handleConnect = () => {
    const addr = addressInput.trim();
    if (addr.length < 32 || addr.length > 44) {
      setError("Enter a valid Solana wallet address (32-44 characters)");
      return;
    }
    setAddress(addr);
    loadData(addr);
  };

  const scores = Object.values(alphaScores);
  const strongSignals = scores.filter((s) => s.alpha_score > 65 || s.alpha_score < 35);

  // Not connected — show address input
  if (!address) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">
            <Wallet className="mr-2 inline h-6 w-6 text-accent" />
            Portfolio
          </h1>
          <p className="mt-1 text-sm text-muted">
            Enter your Solana wallet address to see real Pacifica positions + AI recommendations
          </p>
        </div>

        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-8 text-center">
          <Wallet className="h-12 w-12 text-primary/30" />
          <h2 className="mt-4 text-lg font-bold">Connect Your Wallet</h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            Paste your Solana address to see your real Pacifica positions, open orders, and personalized Alpha Score recommendations. No signing required — data is read-only from Pacifica&apos;s public API.
          </p>

          <div className="mt-6 flex w-full max-w-lg gap-2">
            <input
              type="text"
              placeholder="Solana wallet address (e.g. 7xKX...)"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
              className="flex-1 rounded-lg border border-border bg-background px-4 py-3 font-mono text-sm placeholder:text-muted/50"
            />
            <button
              onClick={handleConnect}
              className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-background transition-colors hover:bg-primary/80"
            >
              <Search className="h-4 w-4" />
              Look Up
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          <p className="mt-3 text-[10px] text-muted">
            Read-only — we never sign transactions or access private keys
          </p>
        </div>

        {/* Preview Alpha Scores */}
        {scores.length > 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-6">
            <p className="mb-3 text-sm font-medium text-muted">
              Top Alpha Score signals right now
            </p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {scores
                .sort((a, b) => Math.abs(b.alpha_score - 50) - Math.abs(a.alpha_score - 50))
                .slice(0, 4)
                .map((score) => (
                  <div key={score.symbol} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">{score.symbol.replace("-USDC", "")}</span>
                      <span className={`font-mono text-lg font-bold ${score.alpha_score > 58 ? "text-success" : score.alpha_score < 42 ? "text-danger" : "text-warning"}`}>
                        {score.alpha_score.toFixed(0)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted">Connect wallet for personalized view</p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Connected — show portfolio
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <Wallet className="mr-2 inline h-6 w-6 text-accent" />
            Portfolio
          </h1>
          <p className="mt-1 text-sm text-muted">
            Real Pacifica data for your wallet
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="font-mono text-xs">{shortAddr}</span>
          </div>
          <button
            onClick={() => { setAddress(null); setPositions([]); setOrders([]); setBalance(null); }}
            className="rounded-lg border border-border px-3 py-2 text-xs text-muted hover:text-foreground"
          >
            Disconnect
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm">Loading portfolio data from Pacifica...</span>
        </div>
      )}

      {/* Wallet balance + stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {balance && (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted">SOL Balance</p>
            <p className="mt-1 font-mono text-2xl font-bold">{balance.sol.toFixed(4)}</p>
          </div>
        )}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted">Open Positions</p>
          <p className="mt-1 font-mono text-2xl font-bold">{positions.length}</p>
          <p className="text-xs text-muted">{positions.length > 0 ? "Live from Pacifica" : "No active trades"}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted">Strong Signals</p>
          <p className="mt-1 font-mono text-2xl font-bold text-yellow-400">{strongSignals.length}</p>
          <p className="text-xs text-muted">Alpha Score &gt;65 or &lt;35</p>
        </div>
      </div>

      {/* Real Pacifica Positions */}
      {positions.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Wallet className="h-5 w-5 text-primary" />
            Your Pacifica Positions
            <span className="rounded-full bg-success/20 px-2 py-0.5 text-[10px] font-bold text-success">LIVE</span>
          </h2>
          <div className="space-y-3">
            {positions.map((pos, i) => (
              <div key={`${pos.symbol}-${i}`} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">{pos.symbol}</span>
                    <span className={`rounded px-2 py-0.5 text-xs font-bold ${pos.side.includes("long") ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                      {pos.side.toUpperCase()} {pos.leverage}x
                    </span>
                  </div>
                  <span className={`font-mono text-lg font-bold ${pos.unrealized_pnl >= 0 ? "text-success" : "text-danger"}`}>
                    {pos.unrealized_pnl >= 0 ? "+" : ""}${pos.unrealized_pnl.toFixed(2)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-3 text-xs text-muted">
                  <div>Size: <span className="font-mono text-foreground">{pos.size}</span></div>
                  <div>Entry: <span className="font-mono text-foreground">${pos.entry_price.toLocaleString()}</span></div>
                  <div>Leverage: <span className="font-mono text-foreground">{pos.leverage}x</span></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Real Pacifica Orders */}
      {orders.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            Open Orders
            <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">LIVE</span>
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card text-left text-xs text-muted">
                  <th className="px-4 py-2">Market</th>
                  <th className="px-4 py-2">Side</th>
                  <th className="px-4 py-2">Size</th>
                  <th className="px-4 py-2">Price</th>
                  <th className="px-4 py-2">Type</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord, i) => (
                  <tr key={`${ord.symbol}-${i}`} className="border-b border-border/30">
                    <td className="px-4 py-2 font-medium">{ord.symbol}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-bold ${ord.side.includes("long") || ord.side.includes("buy") ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                        {ord.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono">{ord.size}</td>
                    <td className="px-4 py-2 font-mono">${ord.price.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs text-muted">{ord.order_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* No positions */}
      {positions.length === 0 && !loading && (
        <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center">
          <p className="text-sm text-muted">No open positions found on Pacifica for this wallet.</p>
          <p className="mt-1 text-xs text-muted/60">Trade on Pacifica DEX first, then your positions appear here automatically.</p>
        </div>
      )}

      {/* Personalized recommendations */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Zap className="h-5 w-5 text-yellow-400" />
          Recommended Actions
        </h2>
        {strongSignals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted">
            No strong signals right now. All markets are in neutral territory.
          </div>
        ) : (
          <div className="space-y-3">
            {strongSignals
              .sort((a, b) => Math.abs(b.alpha_score - 50) - Math.abs(a.alpha_score - 50))
              .map((score) => {
                const isBullish = score.alpha_score > 50;
                return (
                  <div
                    key={score.symbol}
                    className={`rounded-lg border p-4 ${isBullish ? "border-success/20 bg-success/5" : "border-danger/20 bg-danger/5"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isBullish ? <TrendingUp className="h-5 w-5 text-success" /> : <TrendingDown className="h-5 w-5 text-danger" />}
                        <span className="text-lg font-bold">{score.symbol.replace("-USDC", "")}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isBullish ? "bg-success/20 text-success" : "bg-danger/20 text-danger"}`}>
                          {score.trade_suggestion.action.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font-mono text-2xl font-black ${isBullish ? "text-success" : "text-danger"}`}>
                          {score.alpha_score.toFixed(0)}
                        </span>
                        <span className="text-xs text-muted">/100</span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-3 text-xs">
                      <div><span className="text-muted">Entry</span><p className="font-mono font-medium">{score.trade_suggestion.entry_zone}</p></div>
                      <div><span className="text-muted">Target</span><p className="font-mono font-medium text-success">{score.trade_suggestion.target}</p></div>
                      <div><span className="text-muted">Stop</span><p className="font-mono font-medium text-danger">{score.trade_suggestion.stop_loss}</p></div>
                      <div><span className="text-muted">R:R</span><p className="font-mono font-medium">1:{score.trade_suggestion.risk_reward}</p></div>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <Shield className={`h-3 w-3 ${score.liquidation_risk?.risk_level === "low" ? "text-success" : "text-warning"}`} />
                        {score.liquidation_risk?.risk_level} risk
                      </span>
                      <span className="rounded bg-card px-1.5 py-0.5">{score.regime.replace("_", " ")}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* Execute on Pacifica */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-center">
        <p className="text-sm">Ready to act on these signals?</p>
        <a
          href="https://test-app.pacifica.fi"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-primary/80"
        >
          Trade on Pacifica DEX
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Architecture note */}
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-4 text-xs text-muted">
        <strong>How it works:</strong> Positions and orders are fetched from Pacifica&apos;s public REST API
        ({`/positions?account={address}`}). No signing or API keys required — Pacifica exposes this data publicly.
        Alpha Scores are precomputed every 60 seconds from real trade data collected via WebSocket.
      </div>
    </div>
  );
}
