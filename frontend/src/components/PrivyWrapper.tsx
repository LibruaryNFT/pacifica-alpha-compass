"use client";

import type { ReactNode } from "react";

// Privy disabled — app ID rejected by SDK at runtime; referrals page uses manual address input
export default function PrivyWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
