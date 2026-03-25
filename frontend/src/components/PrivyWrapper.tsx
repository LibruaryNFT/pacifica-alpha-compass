"use client";

import { PrivyProvider } from "@privy-io/react-auth";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmn68tirx046b0ckye8rxc97h";

export default function PrivyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#22c55e",
          logo: undefined,
        },
        loginMethods: ["wallet"],
        supportedChains: [],
        defaultChain: undefined,
        embeddedWallets: {
          showWalletUIs: false,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
