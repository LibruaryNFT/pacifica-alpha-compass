"use client";

import { Component, type ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

const PRIVY_CONFIG = {
  appearance: { theme: "dark" as const, accentColor: "#22c55e" as `#${string}` },
  loginMethods: ["wallet"] as ["wallet"],
  embeddedWallets: { showWalletUIs: false },
};

// Error boundary — if Privy throws (invalid app ID, domain not whitelisted, etc.)
// catch it and render the app without Privy instead of crashing the whole page.
class PrivyErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      // Privy failed — render app normally, wallet pages show manual input fallback
      return <>{this.props.children}</>;
    }
    return (
      <PrivyProvider appId={PRIVY_APP_ID} config={PRIVY_CONFIG}>
        {this.props.children}
      </PrivyProvider>
    );
  }
}

export default function PrivyWrapper({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID) {
    return <>{children}</>;
  }
  return <PrivyErrorBoundary>{children}</PrivyErrorBoundary>;
}
