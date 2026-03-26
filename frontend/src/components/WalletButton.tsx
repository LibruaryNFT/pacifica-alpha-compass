"use client";

import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";

/**
 * Simple wallet button that navigates to the Portfolio page
 * where the full Privy provider lives. This avoids wrapping
 * the entire app in PrivyProvider (which crashes if SDK fails to init).
 */
export default function WalletButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/portfolio")}
      className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-background transition-colors hover:bg-primary/80"
    >
      <Wallet className="h-3.5 w-3.5" />
      Connect Wallet
    </button>
  );
}
