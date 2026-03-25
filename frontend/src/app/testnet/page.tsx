"use client";

import { useState, useEffect } from "react";
import { FlaskConical, ExternalLink, Check, Copy } from "lucide-react";

const TESTNET_STEPS = [
  {
    step: 1,
    title: "Access Pacifica Testnet",
    description: "Go to the testnet trading interface",
    link: "https://test-app.pacifica.fi",
    code: "Pacifica",
    note: "Use access code: Pacifica",
  },
  {
    step: 2,
    title: "Connect Your Wallet",
    description: "Connect the same Solana wallet you use in Alpha Compass",
    note: "Phantom, Solflare, or any Solana wallet",
  },
  {
    step: 3,
    title: "Get Testnet USDC",
    description: "Request testnet USDC from the faucet to practice trading",
    note: "Testnet tokens have no real value",
  },
  {
    step: 4,
    title: "Start Trading",
    description: "Practice trading perps with zero risk. Your positions will show in Alpha Compass once API Agent Keys are configured.",
    note: "All Pacifica features available on testnet",
  },
];

export default function TestnetPage() {
  const [copiedCode, setCopiedCode] = useState(false);
  const [apiHealth, setApiHealth] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    fetch("https://test-api.pacifica.fi/api/v1/market-price")
      .then((r) => {
        setApiHealth(r.ok ? "online" : "offline");
      })
      .catch(() => setApiHealth("offline"));
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">
          <FlaskConical className="mr-2 inline h-6 w-6 text-warning" />
          Testnet Guide
        </h1>
        <p className="mt-1 text-sm text-muted">
          Practice trading on Pacifica testnet with zero risk
        </p>
      </div>

      {/* Status */}
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              apiHealth === "online"
                ? "bg-success animate-pulse"
                : apiHealth === "offline"
                  ? "bg-danger"
                  : "bg-warning animate-pulse"
            }`}
          />
          <span className="text-muted">Testnet API:</span>
          <span className="font-medium">
            {apiHealth === "checking"
              ? "Checking..."
              : apiHealth === "online"
                ? "Online"
                : "Offline"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted">Access Code:</span>
          <code className="rounded bg-background px-2 py-0.5 font-mono text-primary">
            Pacifica
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText("Pacifica");
              setCopiedCode(true);
              setTimeout(() => setCopiedCode(false), 2000);
            }}
            className="text-muted hover:text-foreground"
          >
            {copiedCode ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {TESTNET_STEPS.map((s) => (
          <div
            key={s.step}
            className="rounded-lg border border-border bg-card p-5"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {s.step}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.description}</p>
                {s.note && (
                  <p className="mt-2 text-xs text-warning">{s.note}</p>
                )}
                {s.link && (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    Open Testnet App
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* API endpoints */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Testnet API Endpoints</h2>
        <div className="space-y-2 font-mono text-sm">
          <div className="flex items-center justify-between rounded bg-background p-2">
            <span className="text-muted">REST API</span>
            <span className="text-foreground">
              https://test-api.pacifica.fi/api/v1
            </span>
          </div>
          <div className="flex items-center justify-between rounded bg-background p-2">
            <span className="text-muted">WebSocket</span>
            <span className="text-foreground">
              wss://test-ws.pacifica.fi/ws
            </span>
          </div>
          <div className="flex items-center justify-between rounded bg-background p-2">
            <span className="text-muted">Trading UI</span>
            <span className="text-foreground">
              https://test-app.pacifica.fi
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
