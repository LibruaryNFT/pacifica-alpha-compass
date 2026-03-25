"use client";

import { ArrowRightLeft, ExternalLink, Info } from "lucide-react";

export default function BridgePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">
          <ArrowRightLeft className="mr-2 inline h-6 w-6 text-primary" />
          Fund Your Account
        </h1>
        <p className="mt-1 text-sm text-muted">
          Bridge assets from any chain to Solana — powered by{" "}
          <a
            href="https://rhino.fi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Rhino.fi
          </a>
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="text-sm">
          <p className="font-medium text-foreground">
            How it works
          </p>
          <p className="mt-1 text-muted">
            Bridge USDC from Ethereum, Arbitrum, Base, or other chains to Solana
            in one click. Once bridged, deposit into Pacifica to start trading.
            Typical bridge time: 1-5 minutes.
          </p>
        </div>
      </div>

      {/* Rhino.fi widget */}
      <div className="flex justify-center">
        <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <iframe
            src="https://app.rhino.fi/bridge?token=USDC&chainOut=SOLANA&theme=dark"
            style={{ width: "100%", height: "600px", border: "none" }}
            title="Rhino.fi Bridge"
            allow="clipboard-write"
          />
        </div>
      </div>

      {/* Supported chains */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-medium">Supported Source Chains</h3>
        <div className="flex flex-wrap gap-2">
          {[
            "Ethereum",
            "Arbitrum",
            "Base",
            "Optimism",
            "Polygon",
            "Avalanche",
            "BNB Chain",
          ].map((chain) => (
            <span
              key={chain}
              className="rounded-full bg-card-hover px-3 py-1 text-xs text-muted"
            >
              {chain}
            </span>
          ))}
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            → Solana (Pacifica)
          </span>
        </div>
      </div>

      {/* Direct link */}
      <div className="text-center">
        <a
          href="https://app.rhino.fi/bridge"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-primary"
        >
          Open Rhino.fi directly
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
