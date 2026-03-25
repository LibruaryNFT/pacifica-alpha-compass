"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export default function PrivyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId="cmn68tirx046b0ckye8rxc97h"
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#22c55e",
          walletChainType: "solana-only",
        },
        loginMethods: ["wallet"],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
