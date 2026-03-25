"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Gift, Copy, Check, Users, TrendingUp, Award } from "lucide-react";
import { useState, useEffect } from "react";

export default function ReferralsPage() {
  const { authenticated, user } = usePrivy();
  const [copied, setCopied] = useState(false);

  const wallet = user?.linkedAccounts?.find((a) => a.type === "wallet");
  const address =
    wallet && "address" in wallet
      ? (wallet as { address: string }).address
      : null;
  const refCode = address ? address.slice(0, 8) : "connect-wallet";
  const referralUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}?ref=${refCode}`
      : "";

  // Track pageview for Fuul attribution
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        // Store referral code for attribution
        localStorage.setItem("fuul_ref", ref);
      }
    }
  }, []);

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">
          <Gift className="mr-2 inline h-6 w-6 text-accent" />
          Referral Program
        </h1>
        <p className="mt-1 text-sm text-muted">
          Invite friends to Alpha Compass. Earn rewards when they trade on
          Pacifica — powered by{" "}
          <a
            href="https://fuul.xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Fuul
          </a>
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Users className="h-4 w-4" />
            Referrals
          </div>
          <div className="mt-2 text-2xl font-bold">
            {authenticated ? "0" : "—"}
          </div>
          <div className="mt-1 text-xs text-muted">Friends invited</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            <TrendingUp className="h-4 w-4" />
            Volume Generated
          </div>
          <div className="mt-2 text-2xl font-bold">
            {authenticated ? "$0.00" : "—"}
          </div>
          <div className="mt-1 text-xs text-muted">
            From your referrals
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Award className="h-4 w-4" />
            Rewards Earned
          </div>
          <div className="mt-2 text-2xl font-bold">
            {authenticated ? "$0.00" : "—"}
          </div>
          <div className="mt-1 text-xs text-muted">Claimable rewards</div>
        </div>
      </div>

      {/* Referral link */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Your Referral Link</h2>
        {authenticated ? (
          <div className="flex items-center gap-3">
            <input
              type="text"
              readOnly
              value={referralUrl}
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 font-mono text-sm text-foreground"
            />
            <button
              onClick={copyLink}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-primary/80"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-background/50 p-8 text-center">
            <p className="text-sm text-muted">
              Connect your wallet to get your referral link
            </p>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">How It Works</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
              1
            </div>
            <h3 className="mt-3 font-medium">Share Your Link</h3>
            <p className="mt-1 text-xs text-muted">
              Send your unique referral link to friends and community
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-2xl font-bold text-accent">
              2
            </div>
            <h3 className="mt-3 font-medium">They Trade on Pacifica</h3>
            <p className="mt-1 text-xs text-muted">
              When your referrals trade using Alpha Compass, volume is tracked
              via Builder Code
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-2xl font-bold text-success">
              3
            </div>
            <h3 className="mt-3 font-medium">Earn Rewards</h3>
            <p className="mt-1 text-xs text-muted">
              Receive a share of trading fees. Rewards are distributed
              automatically via Fuul
            </p>
          </div>
        </div>
      </div>

      {/* Leaderboard placeholder */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Referral Leaderboard</h2>
        <div className="space-y-2">
          {[
            { rank: 1, address: "7xKn...8fPq", referrals: 24, volume: "$142,300" },
            { rank: 2, address: "3mWz...rT9v", referrals: 18, volume: "$98,750" },
            { rank: 3, address: "9pLx...kN2s", referrals: 12, volume: "$67,200" },
            { rank: 4, address: "5dRy...vJ4m", referrals: 8, volume: "$34,100" },
            { rank: 5, address: "2cFh...wQ7b", referrals: 5, volume: "$21,500" },
          ].map((entry) => (
            <div
              key={entry.rank}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 p-3 text-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    entry.rank === 1
                      ? "bg-yellow-500/20 text-yellow-500"
                      : entry.rank === 2
                        ? "bg-gray-400/20 text-gray-400"
                        : entry.rank === 3
                          ? "bg-amber-600/20 text-amber-600"
                          : "bg-card text-muted"
                  }`}
                >
                  {entry.rank}
                </span>
                <span className="font-mono">{entry.address}</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-muted">
                  {entry.referrals} referrals
                </span>
                <span className="font-mono font-medium text-primary">
                  {entry.volume}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-muted">
          Demo data — live leaderboard powered by Fuul protocol
        </p>
      </div>
    </div>
  );
}
