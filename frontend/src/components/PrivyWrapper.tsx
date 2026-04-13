"use client";

import { PrivyProvider } from "@privy-io/react-auth";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

export default function PrivyWrapper({ children }: { children: React.ReactNode }) {
  if (!PRIVY_APP_ID) {
    // No App ID configured — render without Privy (wallet pages show manual input)
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#22c55e",
        },
        loginMethods: ["wallet"],
        embeddedWallets: {
          showWalletUIs: false,
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
