"use client";

import { useEffect, useState } from "react";
import { Compass, ArrowUpDown } from "lucide-react";
import { fetchFundingScan, type FundingScanResult } from "@/lib/api";

export default function ScannerPage() {
  const [scan, setScan] = useState<FundingScanResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setScan(await fetchFundingScan());
      setLoading(false);
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">
          <Compass className="mr-2 inline h-6 w-6 text-primary" />
          Funding Rate Scanner
        </h1>
        <p className="mt-1 text-sm text-muted">
          Cross-market funding rate analysis — find arbitrage opportunities
        </p>
      </div>

      {/* Summary stats */}
      {scan && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted">Highest Positive</p>
            <p className="mt-1 font-mono text-lg font-bold text-success">
              {scan.highest_positive?.symbol ?? "N/A"}
            </p>
            <p className="font-mono text-sm text-success">
              {scan.highest_positive
                ? `${(scan.highest_positive.rate * 100).toFixed(4)}%`
                : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted">Most Negative</p>
            <p className="mt-1 font-mono text-lg font-bold text-danger">
              {scan.most_negative?.symbol ?? "N/A"}
            </p>
            <p className="font-mono text-sm text-danger">
              {scan.most_negative
                ? `${(scan.most_negative.rate * 100).toFixed(4)}%`
                : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted">Average Rate</p>
            <p className="mt-1 font-mono text-lg font-bold">
              {(scan.average_rate * 100).toFixed(4)}%
            </p>
            <p className="text-xs text-muted">
              Across all markets
            </p>
          </div>
        </div>
      )}

      {/* Opportunities table */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <ArrowUpDown className="h-5 w-5 text-warning" />
          Notable Funding Rates
        </h2>
        {loading ? (
          <div className="h-48 animate-pulse rounded-lg bg-card" />
        ) : scan && scan.opportunities.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card text-left text-xs text-muted">
                  <th className="px-4 py-2">Market</th>
                  <th className="px-4 py-2">Funding Rate (8h)</th>
                  <th className="px-4 py-2">Annualized</th>
                  <th className="px-4 py-2">Direction</th>
                  <th className="px-4 py-2">Implication</th>
                </tr>
              </thead>
              <tbody>
                {scan.opportunities
                  .sort((a, b) => Math.abs(b.rate) - Math.abs(a.rate))
                  .map((opp) => (
                    <tr
                      key={opp.symbol}
                      className="border-b border-border/50 hover:bg-card-hover"
                    >
                      <td className="px-4 py-2 font-medium">{opp.symbol}</td>
                      <td
                        className={`px-4 py-2 font-mono ${
                          opp.rate >= 0 ? "text-success" : "text-danger"
                        }`}
                      >
                        {(opp.rate * 100).toFixed(4)}%
                      </td>
                      <td className="px-4 py-2 font-mono">
                        {(opp.annualized * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            opp.rate >= 0
                              ? "bg-success/10 text-success"
                              : "bg-danger/10 text-danger"
                          }`}
                        >
                          {opp.rate >= 0 ? "Longs Pay" : "Shorts Pay"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-xs text-muted">
                        {opp.rate > 0.03
                          ? "Crowded long — reversal risk"
                          : opp.rate < -0.03
                            ? "Crowded short — squeeze risk"
                            : "Elevated but manageable"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">
            No extreme funding rates detected. Market is balanced.
          </p>
        )}
      </section>
    </div>
  );
}
