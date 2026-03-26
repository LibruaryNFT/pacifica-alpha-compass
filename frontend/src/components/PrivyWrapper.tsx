"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export default function PrivyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmn68tirx046b0ckye8rxc97h"}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#22c55e",
          walletChainType: "ethereum-and-solana",
        },
        loginMethods: ["wallet"],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
