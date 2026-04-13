"use client";

import { Gift, Copy, Check, Users, TrendingUp, Award, Wallet } from "lucide-react";
import { useState, useEffect } from "react";

// Separate component that uses Privy hooks (only rendered when Privy is available)
function PrivyReferrals({ onAddress }: { onAddress: (addr: string | null, login: () => void) => void }) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { usePrivy } = require("@privy-io/react-auth");
  const { authenticated, user, login } = usePrivy();

  useEffect(() => {
    const wallet = user?.linkedAccounts?.find((a: { type: string }) => a.type === "wallet");
    const addr = wallet && "address" in wallet ? (wallet as { address: string }).address : null;
    onAddress(addr, login);
  }, [authenticated, user, login, onAddress]);

  return null;
}

export default function ReferralsPage() {
  const [address, setAddress] = useState<string | null>(null);
  const [loginFn, setLoginFn] = useState<(() => void) | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [privyAvailable] = useState(() => !!process.env.NEXT_PUBLIC_PRIVY_APP_ID);
  const [showPrivy, setShowPrivy] = useState(false);

  const refCode = address ? address.slice(0, 8) : "connect-wallet";
  const referralUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}?ref=${refCode}`
      : "";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) localStorage.setItem("fuul_ref", ref);
      const saved = localStorage.getItem("wallet_address");
      if (saved) setAddress(saved);
    }
    if (privyAvailable) setShowPrivy(true);
  }, [privyAvailable]);

  const handlePrivyAddress = (addr: string | null, login: () => void) => {
    setAddress(addr);
    setLoginFn(() => login);
    if (addr) localStorage.setItem("wallet_address", addr);
  };

  const connectManual = () => {
    const addr = addressInput.trim();
    if (addr.length < 32 || addr.length > 44) return;
    setAddress(addr);
    localStorage.setItem("wallet_address", addr);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      {/* Privy hook bridge — only mounted when Privy provider is available */}
      {showPrivy && <PrivyReferrals onAddress={handlePrivyAddress} />}

      <div>
        <h1 className="text-2xl font-bold">
          <Gift className="mr-2 inline h-6 w-6 text-accent" />
          Referral Program
        </h1>
        <p className="mt-1 text-sm text-muted">
          Share Alpha Compass with your trading community. Your referral link is tracked via Builder Code — every trade your referrals make contributes to your volume stats.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: <Users className="h-4 w-4" />, label: "Referrals", value: address ? "0" : "—", sub: "Friends invited" },
          { icon: <TrendingUp className="h-4 w-4" />, label: "Volume Generated", value: address ? "$0.00" : "—", sub: "From your referrals" },
          { icon: <Award className="h-4 w-4" />, label: "Rewards Earned", value: address ? "$0.00" : "—", sub: "Claimable rewards" },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-xs text-muted">{card.icon}{card.label}</div>
            <div className="mt-2 text-2xl font-bold">{card.value}</div>
            <div className="mt-1 text-xs text-muted">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Your Referral Link</h2>
        {address ? (
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
              {copied ? <><Check className="h-4 w-4" />Copied!</> : <><Copy className="h-4 w-4" />Copy</>}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {privyAvailable && loginFn && (
              <button
                onClick={loginFn}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-background transition-colors hover:bg-primary/80"
              >
                <Wallet className="h-4 w-4" />
                Connect Wallet
              </button>
            )}
            <div className={privyAvailable ? "border-t border-border pt-4" : ""}>
              {privyAvailable && <p className="mb-2 text-xs text-muted">Or enter address manually:</p>}
              {!privyAvailable && <p className="mb-2 text-sm text-muted">Enter your Solana wallet address to generate your referral link</p>}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Solana wallet address (32–44 chars)"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && connectManual()}
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 font-mono text-sm text-foreground placeholder:text-muted"
                />
                <button
                  onClick={connectManual}
                  disabled={addressInput.length < 32}
                  className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-primary/80 disabled:opacity-40"
                >
                  Get Link
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">How It Works</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { n: 1, color: "primary", title: "Share Your Link", desc: "Send your unique referral link to friends and community" },
            { n: 2, color: "accent", title: "They Trade on Pacifica", desc: "When your referrals trade using Alpha Compass, their volume is tracked via Pacifica Builder Code" },
            { n: 3, color: "success", title: "Earn Rewards", desc: "Receive a share of trading fees — distributed by Pacifica's referral program to Builder Code holders" },
          ].map((step) => (
            <div key={step.n} className="text-center">
              <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-${step.color}/10 text-2xl font-bold text-${step.color}`}>
                {step.n}
              </div>
              <h3 className="mt-3 font-medium">{step.title}</h3>
              <p className="mt-1 text-xs text-muted">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Referral Leaderboard</h2>
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center text-muted">
          <Users className="h-10 w-10 opacity-30" />
          <p className="text-sm">Leaderboard goes live when referral tracking is active.</p>
          <p className="text-xs opacity-60">Share your link now — volume accumulates from day one.</p>
        </div>
      </div>
    </div>
  );
}
