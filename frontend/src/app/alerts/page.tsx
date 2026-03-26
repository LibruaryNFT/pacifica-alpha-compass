"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Plus, Trash2, Zap, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { TOP_MARKETS } from "@/lib/constants";

interface AlertConfig {
  id: string;
  symbol: string;
  condition: "above" | "below";
  threshold: number;
  enabled: boolean;
  discord_webhook?: string;
}

interface TriggeredAlert {
  id: string;
  symbol: string;
  condition: string;
  threshold: number;
  actual_score: number;
  direction: string;
  timestamp: string;
}

export default function AlertsPage() {
  const [configs, setConfigs] = useState<AlertConfig[]>([]);
  const [triggered, setTriggered] = useState<TriggeredAlert[]>([]);
  const [loading, setLoading] = useState(true);

  // New alert form
  const [newSymbol, setNewSymbol] = useState<string>(TOP_MARKETS[0]);
  const [newCondition, setNewCondition] = useState<"above" | "below">("above");
  const [newThreshold, setNewThreshold] = useState(70);
  const [newDiscordWebhook, setNewDiscordWebhook] = useState("");
  const [creating, setCreating] = useState(false);

  const loadAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs || []);
        setTriggered(data.triggered || []);
      }
    } catch {
      // Alerts unavailable
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 15000); // Poll every 15s for new triggers
    return () => clearInterval(interval);
  }, [loadAlerts]);

  const createAlert = async () => {
    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        symbol: newSymbol,
        condition: newCondition,
        threshold: newThreshold,
      };
      if (newDiscordWebhook.trim()) {
        payload.discord_webhook = newDiscordWebhook;
      }
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setNewDiscordWebhook("");
        loadAlerts();
      }
    } catch {
      // Creation failed
    }
    setCreating(false);
  };

  const deleteAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConfigs((prev) => prev.filter((c) => c.id !== alertId));
      }
    } catch {
      // Deletion failed
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">
          <Bell className="mr-2 inline h-6 w-6 text-yellow-400" />
          Alpha Alerts
        </h1>
        <p className="mt-1 text-sm text-muted">
          Get notified when Alpha Scores cross your thresholds. Checked every 60 seconds.
        </p>
      </div>

      {/* Create new alert */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" />
          New Alert
        </h2>
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted">Market</label>
              <select
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {TOP_MARKETS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("-USDC", "")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">When Alpha Score is</label>
              <select
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value as "above" | "below")}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="above">Above</option>
                <option value="below">Below</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted">Threshold (0-100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={newThreshold}
                onChange={(e) => setNewThreshold(Number(e.target.value))}
                className="w-20 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={createAlert}
              disabled={creating}
              className="rounded-lg bg-yellow-400/20 px-4 py-2 text-sm font-medium text-yellow-400 transition-colors hover:bg-yellow-400/30 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Alert"}
            </button>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Discord Webhook (optional)</label>
            <input
              type="text"
              placeholder="https://discord.com/api/webhooks/..."
              value={newDiscordWebhook}
              onChange={(e) => setNewDiscordWebhook(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-muted">
              Optional: paste a Discord webhook URL to receive alert notifications
            </p>
          </div>
        </div>
      </div>

      {/* Active alert configs */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Active Alerts ({configs.length})</h2>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-card" />
            ))}
          </div>
        ) : configs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted">
            No alerts configured. Create one above.
          </div>
        ) : (
          <div className="space-y-2">
            {configs.map((cfg) => (
              <div
                key={cfg.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-center gap-3">
                  {cfg.condition === "above" ? (
                    <TrendingUp className="h-4 w-4 text-success" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-danger" />
                  )}
                  <span className="font-medium">{cfg.symbol.replace("-USDC", "")}</span>
                  <span className="text-sm text-muted">
                    Alpha Score {cfg.condition}{" "}
                    <span className="font-mono font-bold text-foreground">{cfg.threshold}</span>
                  </span>
                </div>
                <button
                  onClick={() => deleteAlert(cfg.id)}
                  className="rounded p-1.5 text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Triggered alerts feed */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
          Triggered Alerts
          {triggered.length > 0 && (
            <span className="rounded-full bg-yellow-400/20 px-2 py-0.5 text-xs text-yellow-400">
              {triggered.length}
            </span>
          )}
        </h2>
        {triggered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted">
            No alerts triggered yet. Alerts are checked every 60 seconds when Alpha Scores update.
          </div>
        ) : (
          <div className="space-y-2">
            {triggered.map((alert, i) => {
              const dirColor =
                alert.direction === "bullish"
                  ? "text-success"
                  : alert.direction === "bearish"
                    ? "text-danger"
                    : "text-warning";
              return (
                <div
                  key={`${alert.id}-${i}`}
                  className="flex items-center justify-between rounded-lg border border-yellow-400/20 bg-yellow-400/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-yellow-400" />
                    <span className="font-medium">{alert.symbol.replace("-USDC", "")}</span>
                    <span className="text-sm">
                      Alpha Score{" "}
                      <span className="font-mono font-bold">{alert.actual_score.toFixed(0)}</span>{" "}
                      {alert.condition} {alert.threshold}
                    </span>
                    <span className={`text-xs font-bold ${dirColor}`}>
                      {alert.direction.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-muted">
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
