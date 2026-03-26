"use client";

import { useRouter, usePathname } from "next/navigation";
import { Wallet } from "lucide-react";

/**
 * Wallet button shown in the header.
 * On non-portfolio pages: navigates to /portfolio to connect.
 * On /portfolio page: Privy handles wallet display directly in the page.
 */
export default function WalletButton() {
  const router = useRouter();
  const pathname = usePathname();

  // On portfolio page, the page itself handles wallet state via Privy
  if (pathname === "/portfolio") {
    return (
      <span className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
        <Wallet className="h-3.5 w-3.5" />
        Wallet Connected
      </span>
    );
  }

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
