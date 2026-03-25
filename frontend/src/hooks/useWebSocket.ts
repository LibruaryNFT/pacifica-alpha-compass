"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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
  price: string;
  amount: string;
  direction: string;
  timestamp: number;
}

interface WSMessage {
  channel: string;
  data: RawTrade[];
}

export function usePacificaWebSocket(symbols: string[]) {
  const wsRef = useRef<WebSocket | null>(null);
  const [lastTrades, setLastTrades] = useState<Record<string, Trade>>({});
  const [connected, setConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const pingIntervalRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket("wss://ws.pacifica.fi/ws");

      ws.onopen = () => {
        setConnected(true);
        // Subscribe to trades for each symbol
        for (const symbol of symbols) {
          const baseSymbol = symbol.replace("-USDC", "");
          ws.send(
            JSON.stringify({
              method: "subscribe",
              params: { source: "trades", symbol: baseSymbol },
            })
          );
        }

        // Heartbeat every 30s
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ method: "ping" }));
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          if (msg.channel === "trades" && msg.data?.length > 0) {
            const raw = msg.data[msg.data.length - 1];
            const trade: Trade = {
              symbol: `${raw.s}-USDC`,
              price: raw.p,
              amount: raw.a,
              direction: raw.d,
              timestamp: raw.t,
            };
            setLastTrades((prev) => ({
              ...prev,
              [trade.symbol]: trade,
            }));
          }
        } catch {
          // ignore parse errors (pong messages etc)
        }
      };

      ws.onclose = () => {
        setConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        // Reconnect after 3s
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };

      wsRef.current = ws;
    } catch {
      // WebSocket creation failed, retry
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    }
  }, [symbols]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
    };
  }, [connect]);

  return { lastTrades, connected };
}
