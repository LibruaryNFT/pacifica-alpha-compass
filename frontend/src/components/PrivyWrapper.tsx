"use client";

/**
 * Privy is only needed on the Portfolio page (wallet connection).
 * Wrapping the entire app caused crashes when the SDK fails to init.
 * Now this is a passthrough — Portfolio imports PrivyProvider directly.
 */
export default function PrivyWrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
