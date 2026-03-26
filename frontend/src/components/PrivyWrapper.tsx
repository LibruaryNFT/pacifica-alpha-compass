"use client";

import { Component, type ReactNode } from "react";
import { PrivyProvider } from "@privy-io/react-auth";

// Error boundary to prevent Privy SDK crashes from killing the entire app
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
      // Render children without Privy if it crashes
      return this.props.children;
    }
    return this.props.children;
  }
}

export default function PrivyWrapper({ children }: { children: ReactNode }) {
  try {
    return (
      <PrivyErrorBoundary>
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
      </PrivyErrorBoundary>
    );
  } catch {
    // If PrivyProvider itself throws during render, just render children
    return <>{children}</>;
  }
}
