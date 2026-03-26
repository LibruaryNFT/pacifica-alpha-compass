"use client";

import { useRouter } from "next/navigation";
import { Wallet } from "lucide-react";

export default function WalletButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/portfolio")}
      className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-background transition-colors hover:bg-primary/80"
    >
      <Wallet className="h-3.5 w-3.5" />
      Look Up Wallet
    </button>
  );
}
