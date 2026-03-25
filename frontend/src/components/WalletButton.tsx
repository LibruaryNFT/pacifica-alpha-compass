"use client";

import { usePrivy } from "@privy-io/react-auth";
import { LogOut } from "lucide-react";

export default function WalletButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  // Get wallet address
  const wallet = user?.linkedAccounts?.find(
    (a) => a.type === "wallet"
  );
  const address = wallet && "address" in wallet ? (wallet as { address: string }).address : null;
  const shortAddress = address
    ? `${address.slice(0, 4)}...${address.slice(-4)}`
    : null;

  if (!ready) {
    return (
      <span className="rounded-lg bg-card px-4 py-1.5 text-sm text-muted">
        Loading...
      </span>
    );
  }

  if (authenticated && shortAddress) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-xs text-primary">
          {shortAddress}
        </span>
        <button
          onClick={() => logout()}
          className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:bg-card hover:text-danger"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-background transition-colors hover:bg-primary/80"
    >
      Connect Wallet
    </button>
  );
}
