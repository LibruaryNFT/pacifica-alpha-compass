"use client";

import { useEffect, type ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

// Silence Privy's async "invalid app ID" error so it doesn't pollute the console.
// The error fires after mount via Privy's internal API call — can't use error boundaries.
// The app works regardless; referrals page falls back to manual address input.
function PrivyErrorSuppressor() {
  useEffect(() => {
    const original = console.error.bind(console);
    console.error = (...args: unknown[]) => {
      if (typeof args[0] === "string" && args[0].includes("invalid Privy app ID")) return;
      original(...args);
    };
    return () => {
      console.error = original;
    };
  }, []);
  return null;
}

export default function PrivyWrapper({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID) {
    return <>{children}</>;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: { theme: "dark", accentColor: "#22c55e" as `#${string}` },
        loginMethods: ["wallet"],
        embeddedWallets: { showWalletUIs: false },
      }}
    >
      <PrivyErrorSuppressor />
      {children}
    </PrivyProvider>
  );
}
