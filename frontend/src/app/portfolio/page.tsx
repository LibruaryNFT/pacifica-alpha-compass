"use client";

import { useEffect, useState, useCallback } from "react";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  LogIn,
  ExternalLink,
} from "lucide-react";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmn68tirx046b0ckye8rxc97h";

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
  usdc: number;
  total_usd: number;
}

export default function PortfolioPage() {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: { theme: "dark", accentColor: "#22c55e", walletChainType: "ethereum-and-solana" },
        loginMethods: ["wallet"],
      }}
    >
      <PortfolioContent />
    </PrivyProvider>
  );
}

function PortfolioContent() {
  const { ready, authenticated, login, user } = usePrivy();
  const [alphaScores, setAlphaScores] = useState<Record<string, AlphaScore>>({});
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(false);

  const wallet = user?.linkedAccounts?.find((a) => a.type === "wallet");
  const address = wallet && "address" in wallet ? (wallet as { address: string }).address : null;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load precomputed Alpha Scores
      const res = await fetch("/api/alpha-scores/all");
      if (res.ok) {
        const data = await res.json();
        if (data?.scores) setAlphaScores(data.scores);
      }
    } catch {
      // Scores unavailable
    }

    // Fetch Solana balance if wallet connected
    if (address) {
      try {
        const rpcRes = await fetch("https://api.mainnet-beta.solana.com", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "getBalance",
            params: [address],
          }),
        });
        if (rpcRes.ok) {
          const rpcData = await rpcRes.json();
          const solBalance = (rpcData?.result?.value ?? 0) / 1e9;
          // Estimate USD (use SOL price from Alpha Scores if available)
          const solPrice = alphaScores["SOL-USDC"]
            ? parseFloat(alphaScores["SOL-USDC"].trade_suggestion?.entry_zone || "180")
            : 180;
          setBalance({
            sol: solBalance,
            usdc: 0, // Would need SPL token query for USDC balance
            total_usd: solBalance * solPrice,
          });
        }
      } catch {
        // RPC unavailable
      }
    }
    setLoading(false);
  }, [address, alphaScores]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // Not ready yet
  if (!ready) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="h-64 animate-pulse rounded-lg bg-card" />
      </div>
    );
  }

  // Not connected — prompt login
  if (!authenticated || !address) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold">
            <Wallet className="mr-2 inline h-6 w-6 text-accent" />
            Portfolio
          </h1>
          <p className="mt-1 text-sm text-muted">
            Connect your Solana wallet to see personalized Alpha Score recommendations
          </p>
        </div>

        <div className="flex flex-col items-center rounded-xl border border-border bg-card p-12 text-center">
          <Wallet className="h-16 w-16 text-primary/30" />
          <h2 className="mt-4 text-lg font-bold">Connect Your Wallet</h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            Link your Solana wallet via Privy to unlock personalized portfolio analytics,
            Alpha Score recommendations tailored to your exposure, and risk alerts.
          </p>
          <button
            onClick={login}
            className="mt-6 flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-background transition-colors hover:bg-primary/80"
          >
            <LogIn className="h-4 w-4" />
            Connect with Privy
          </button>
          <p className="mt-3 text-[10px] text-muted">
            Powered by Privy — supports Phantom, Backpack, Solflare, and more
          </p>
        </div>

        {/* Show Alpha Scores even without wallet — teaser */}
        {Object.keys(alphaScores).length > 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-6">
            <p className="mb-3 text-sm font-medium text-muted">
              Preview: Top Alpha Score signals right now
            </p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {Object.values(alphaScores)
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

  // Connected — show personalized portfolio
  const shortAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;
  const scores = Object.values(alphaScores);
  const strongSignals = scores.filter((s) => s.alpha_score > 65 || s.alpha_score < 35);
  const highRisk = scores.filter(
    (s) => s.liquidation_risk?.risk_level === "high" || s.liquidation_risk?.risk_level === "critical"
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <Wallet className="mr-2 inline h-6 w-6 text-accent" />
            Portfolio
          </h1>
          <p className="mt-1 text-sm text-muted">
            Personalized Alpha Score analytics for your wallet
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-success" />
          <span className="font-mono text-xs">{shortAddr}</span>
        </div>
      </div>

      {/* Wallet balance */}
      {balance && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted">SOL Balance</p>
            <p className="mt-1 font-mono text-2xl font-bold">
              {balance.sol.toFixed(4)}
            </p>
            <p className="text-xs text-muted">
              ~${balance.total_usd.toFixed(2)} USD
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted">Strong Signals</p>
            <p className="mt-1 font-mono text-2xl font-bold text-yellow-400">
              {strongSignals.length}
            </p>
            <p className="text-xs text-muted">Alpha Score &gt;65 or &lt;35</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted">High Risk Markets</p>
            <p className={`mt-1 font-mono text-2xl font-bold ${highRisk.length > 0 ? "text-danger" : "text-success"}`}>
              {highRisk.length}
            </p>
            <p className="text-xs text-muted">Elevated liquidation risk</p>
          </div>
        </div>
      )}

      {/* Personalized recommendations */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Zap className="h-5 w-5 text-yellow-400" />
          Recommended Actions
        </h2>
        {loading && scores.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-card" />
            ))}
          </div>
        ) : strongSignals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted">
            No strong signals right now. All markets are in neutral territory (Alpha 35-65).
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
                        {isBullish ? (
                          <TrendingUp className="h-5 w-5 text-success" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-danger" />
                        )}
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
                      <div>
                        <span className="text-muted">Entry</span>
                        <p className="font-mono font-medium">{score.trade_suggestion.entry_zone}</p>
                      </div>
                      <div>
                        <span className="text-muted">Target</span>
                        <p className="font-mono font-medium text-success">{score.trade_suggestion.target}</p>
                      </div>
                      <div>
                        <span className="text-muted">Stop</span>
                        <p className="font-mono font-medium text-danger">{score.trade_suggestion.stop_loss}</p>
                      </div>
                      <div>
                        <span className="text-muted">R:R</span>
                        <p className="font-mono font-medium">1:{score.trade_suggestion.risk_reward}</p>
                      </div>
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

      {/* All markets overview */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">All Markets</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-left text-xs text-muted">
                <th className="px-4 py-2">Market</th>
                <th className="px-4 py-2">Alpha Score</th>
                <th className="px-4 py-2">Direction</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Risk</th>
                <th className="px-4 py-2">Regime</th>
              </tr>
            </thead>
            <tbody>
              {scores
                .sort((a, b) => b.alpha_score - a.alpha_score)
                .map((score) => (
                  <tr key={score.symbol} className="border-b border-border/30 hover:bg-card-hover">
                    <td className="px-4 py-2 font-medium">{score.symbol.replace("-USDC", "")}</td>
                    <td className="px-4 py-2">
                      <span className={`font-mono font-bold ${score.alpha_score > 58 ? "text-success" : score.alpha_score < 42 ? "text-danger" : "text-warning"}`}>
                        {score.alpha_score.toFixed(0)}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded px-2 py-0.5 text-xs font-bold ${score.direction === "bullish" ? "bg-success/10 text-success" : score.direction === "bearish" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"}`}>
                        {score.direction.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      {score.trade_suggestion.action.toUpperCase()}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {score.liquidation_risk?.risk_level}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted">
                      {score.regime.replace("_", " ")}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* One-click trade execution section */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <ExternalLink className="h-5 w-5 text-primary" />
          Execute on Pacifica
        </h2>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="mb-3 text-sm text-muted">
            Alpha Compass generates signals — execute them directly on Pacifica DEX.
            Click any market below to open Pacifica with the right pair pre-selected.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {strongSignals.slice(0, 4).map((score) => {
              const isBullish = score.alpha_score > 50;
              const symbol = score.symbol.replace("-USDC", "");
              return (
                <a
                  key={score.symbol}
                  href={`https://test-app.pacifica.fi/trade/${symbol}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-card ${isBullish ? "border-success/30" : "border-danger/30"}`}
                >
                  <div>
                    <span className="text-sm font-bold">{symbol}</span>
                    <p className={`text-xs font-bold ${isBullish ? "text-success" : "text-danger"}`}>
                      {score.trade_suggestion.action.toUpperCase()}
                    </p>
                  </div>
                  <span className={`font-mono text-lg font-black ${isBullish ? "text-success" : "text-danger"}`}>
                    {score.alpha_score.toFixed(0)}
                  </span>
                </a>
              );
            })}
          </div>
          {strongSignals.length === 0 && (
            <a
              href="https://test-app.pacifica.fi"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-primary/80"
            >
              Open Pacifica DEX
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </section>

      {/* Execution architecture note */}
      <div className="rounded-lg border border-dashed border-border bg-card/50 p-4 text-xs text-muted">
        <strong>Execution Architecture:</strong> Alpha Compass uses Pacifica&apos;s REST API for market data
        and builds OHLCV candles from the trade stream. Order execution requires Pacifica&apos;s Agent Key
        signing (available via their SDK). Current integration: signal generation → deep-link to Pacifica
        with pre-selected market. Full API execution is the Phase 2 roadmap item pending Pacifica SDK access.
      </div>
    </div>
  );
}
