"use client";

import { useEffect, useRef, useState } from "react";

// Pacifica WebSocket uses short field names
interface RawTrade {
  h: number;        // trade ID
  s: string;        // symbol (e.g. "BTC")
  a: string;        // amount
  p: string;        // price
  d: string;        // direction
  tc: string;       // trade type
  t: number;        // timestamp ms
  li: number;       // last instruction
}

export interface Trade {
  symbol: string;
  price: number;
  amount: string;
  direction: string;
  timestamp: number;
}

interface WSMessage {
  channel: string;
  data: RawTrade[];
}

// Stable symbol list — prevents reconnect loops
const DEFAULT_SYMBOLS = [
  "BTC", "ETH", "SOL", "DOGE", "ARB", "AVAX", "LINK", "OP",
];

export function usePacificaWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const [lastTrades, setLastTrades] = useState<Record<string, Trade>>({});
  const [connected, setConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const pingIntervalRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      try {
        const ws = new WebSocket("wss://ws.pacifica.fi/ws");

        ws.onopen = () => {
          if (!mountedRef.current) { ws.close(); return; }
          setConnected(true);

          for (const symbol of DEFAULT_SYMBOLS) {
            ws.send(
              JSON.stringify({
                method: "subscribe",
                params: { source: "trades", symbol },
              })
            );
          }

          pingIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ method: "ping" }));
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          if (!mountedRef.current) return;
          try {
            const msg: WSMessage = JSON.parse(event.data);
            if (msg.channel !== "trades" || !msg.data?.length) return;

            const raw = msg.data[msg.data.length - 1];
            const price = parseFloat(raw.p);

            // Sanity check: skip trades with zero or absurd prices
            if (!price || price <= 0) return;

            const fullSymbol = `${raw.s}-USDC`;

            setLastTrades((prev) => {
              const existing = prev[fullSymbol];

              // Skip if price changed more than 20% from last known — likely bad data
              if (existing && existing.price > 0) {
                const pctChange = Math.abs(price - existing.price) / existing.price;
                if (pctChange > 0.2) return prev;
              }

              return {
                ...prev,
                [fullSymbol]: {
                  symbol: fullSymbol,
                  price,
                  amount: raw.a,
                  direction: raw.d,
                  timestamp: raw.t,
                },
              };
            });
          } catch {
            // ignore pong/malformed messages
          }
        };

        ws.onclose = () => {
          if (!mountedRef.current) return;
          setConnected(false);
          if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
          reconnectTimeoutRef.current = setTimeout(connect, 5000);
        };

        ws.onerror = () => {
          ws.close();
        };

        wsRef.current = ws;
      } catch {
        reconnectTimeoutRef.current = setTimeout(connect, 10000);
      }
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, []); // Empty deps — connect once, stable

  return { lastTrades, connected };
}
