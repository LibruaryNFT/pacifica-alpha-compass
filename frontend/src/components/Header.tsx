"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, BarChart3, Wallet, Brain, Fish, LogOut } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/scanner", label: "Scanner", icon: Compass },
  { href: "/ai", label: "AI Consensus", icon: Brain },
  { href: "/whales", label: "Whales", icon: Fish },
];

export default function Header() {
  const pathname = usePathname();
  const { ready, authenticated, login, logout, user } = usePrivy();

  // Get Solana wallet address if connected
  const solanaWallet = user?.linkedAccounts?.find(
    (a): a is Extract<typeof a, { type: "wallet" }> =>
      a.type === "wallet" && "chainType" in a && a.chainType === "solana"
  );
  const walletAddress = solanaWallet && "address" in solanaWallet ? solanaWallet.address : null;
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    : null;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Compass className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">
            <span className="text-primary">Alpha</span>{" "}
            <span className="text-foreground">Compass</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {ready && authenticated && shortAddress ? (
            <>
              <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-xs text-primary">
                {shortAddress}
              </span>
              <button
                onClick={() => { logout(); }}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:bg-card hover:text-danger"
                title="Disconnect wallet"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Disconnect</span>
              </button>
            </>
          ) : (
            <button
              onClick={login}
              disabled={!ready}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-background transition-colors hover:bg-primary/80 disabled:opacity-50"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
