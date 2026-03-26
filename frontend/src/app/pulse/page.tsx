"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Activity, Loader2 } from "lucide-react";

interface LiveTrade {
  symbol: string;
  price: number;
  amount: number;
  side: string;
  timestamp: number;
  usdValue: number;
}

interface Bubble {
  id: number;
  x: number;
  y: number;
  radius: number;
  targetRadius: number;
  color: string;
  alpha: number;
  symbol: string;
  price: number;
  usdValue: number;
  side: string;
  isWhale: boolean;
  vx: number;
  vy: number;
  life: number;
}

const SYMBOL_POSITIONS: Record<string, { col: number; label: string }> = {
  BTC: { col: 0, label: "BTC" },
  ETH: { col: 1, label: "ETH" },
  SOL: { col: 2, label: "SOL" },
  DOGE: { col: 3, label: "DOGE" },
  ARB: { col: 4, label: "ARB" },
  AVAX: { col: 5, label: "AVAX" },
  LINK: { col: 6, label: "LINK" },
  OP: { col: 7, label: "OP" },
};

const WHALE_THRESHOLD = 50000; // $50K
const BUY_COLOR = "#22c55e";
const SELL_COLOR = "#ef4444";
const WHALE_COLOR = "#facc15";

export default function PulsePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bubblesRef = useRef<Bubble[]>([]);
  const nextIdRef = useRef(0);
  const wsRef = useRef<WebSocket | null>(null);
  const animFrameRef = useRef<number>(0);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState({
    totalTrades: 0,
    totalVolume: 0,
    whaleCount: 0,
    buyPressure: 50,
  });
  const statsRef = useRef(stats);

  const addBubble = useCallback((trade: LiveTrade) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const sym = trade.symbol.replace("-USDC", "");
    const pos = SYMBOL_POSITIONS[sym];
    if (!pos) return;

    const cols = Object.keys(SYMBOL_POSITIONS).length;
    const colWidth = canvas.width / cols;
    const centerX = pos.col * colWidth + colWidth / 2;
    const centerY = canvas.height * 0.5;

    const isWhale = trade.usdValue >= WHALE_THRESHOLD;
    const maxRadius = isWhale ? 60 : Math.min(40, Math.max(6, Math.sqrt(trade.usdValue / 100)));

    const isBuy = trade.side.includes("open_long") || trade.side.includes("close_short");

    const bubble: Bubble = {
      id: nextIdRef.current++,
      x: centerX + (Math.random() - 0.5) * colWidth * 0.6,
      y: centerY + (Math.random() - 0.5) * canvas.height * 0.5,
      radius: 0,
      targetRadius: maxRadius,
      color: isWhale ? WHALE_COLOR : isBuy ? BUY_COLOR : SELL_COLOR,
      alpha: 1,
      symbol: sym,
      price: trade.price,
      usdValue: trade.usdValue,
      side: isBuy ? "buy" : "sell",
      isWhale,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.3 - 0.2,
      life: isWhale ? 300 : 150,
    };

    bubblesRef.current.push(bubble);

    // Update stats
    const s = statsRef.current;
    statsRef.current = {
      totalTrades: s.totalTrades + 1,
      totalVolume: s.totalVolume + trade.usdValue,
      whaleCount: s.whaleCount + (isWhale ? 1 : 0),
      buyPressure: isBuy
        ? Math.min(100, s.buyPressure + 0.5)
        : Math.max(0, s.buyPressure - 0.5),
    };
    setStats({ ...statsRef.current });
  }, []);

  // WebSocket connection
  useEffect(() => {
    function connect() {
      const ws = new WebSocket("wss://ws.pacifica.fi/ws");

      ws.onopen = () => {
        setConnected(true);
        for (const sym of Object.keys(SYMBOL_POSITIONS)) {
          ws.send(JSON.stringify({ method: "subscribe", params: { source: "trades", symbol: sym } }));
        }
        // Heartbeat
        const ping = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ method: "ping" }));
        }, 30000);
        ws.addEventListener("close", () => clearInterval(ping));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.channel !== "trades" || !msg.data?.length) return;

          for (const raw of msg.data) {
            const price = parseFloat(raw.p);
            const amount = parseFloat(raw.a);
            if (!price || !amount) continue;

            addBubble({
              symbol: `${raw.s}-USDC`,
              price,
              amount,
              side: raw.d || "unknown",
              timestamp: raw.t,
              usdValue: price * amount,
            });
          }
        } catch {
          // ignore
        }
      };

      ws.onclose = () => {
        setConnected(false);
        setTimeout(connect, 5000);
      };

      ws.onerror = () => ws.close();
      wsRef.current = ws;
    }

    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [addBubble]);

  // Canvas animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    function draw() {
      if (!canvas || !ctx) return;
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;

      // Clear with fade trail
      ctx.fillStyle = "rgba(10, 10, 15, 0.15)";
      ctx.fillRect(0, 0, w, h);

      // Draw column labels
      const cols = Object.keys(SYMBOL_POSITIONS).length;
      const colWidth = w / cols;
      ctx.font = "12px monospace";
      ctx.textAlign = "center";
      for (const [sym, pos] of Object.entries(SYMBOL_POSITIONS)) {
        const x = pos.col * colWidth + colWidth / 2;
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillText(sym, x, 20);
        // Column divider
        ctx.strokeStyle = "rgba(255,255,255,0.05)";
        ctx.beginPath();
        ctx.moveTo(pos.col * colWidth, 30);
        ctx.lineTo(pos.col * colWidth, h);
        ctx.stroke();
      }

      // Buy/sell pressure bar at bottom
      const bp = statsRef.current.buyPressure;
      const barY = h - 8;
      ctx.fillStyle = SELL_COLOR;
      ctx.fillRect(0, barY, w, 8);
      ctx.fillStyle = BUY_COLOR;
      ctx.fillRect(0, barY, w * (bp / 100), 8);

      // Update and draw bubbles
      const alive: Bubble[] = [];
      for (const b of bubblesRef.current) {
        b.life--;
        if (b.life <= 0) continue;

        // Grow in
        if (b.radius < b.targetRadius) {
          b.radius += (b.targetRadius - b.radius) * 0.15;
        }

        // Fade out in last 30 frames
        if (b.life < 30) {
          b.alpha = b.life / 30;
        }

        // Drift
        b.x += b.vx;
        b.y += b.vy;

        // Draw glow for whales
        if (b.isWhale) {
          const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 2);
          gradient.addColorStop(0, `rgba(250, 204, 21, ${b.alpha * 0.3})`);
          gradient.addColorStop(1, "rgba(250, 204, 21, 0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius * 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw bubble
        ctx.globalAlpha = b.alpha;
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();

        // Label for large trades
        if (b.usdValue >= 10000 && b.alpha > 0.5) {
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.font = b.isWhale ? "bold 11px monospace" : "10px monospace";
          ctx.textAlign = "center";
          const label = b.usdValue >= 1000000
            ? `$${(b.usdValue / 1e6).toFixed(1)}M`
            : `$${(b.usdValue / 1e3).toFixed(0)}K`;
          ctx.fillText(label, b.x, b.y + 3);
        }

        ctx.globalAlpha = 1;
        alive.push(b);
      }
      bubblesRef.current = alive;

      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            <Activity className="mr-2 inline h-6 w-6 text-primary" />
            Market Pulse
          </h1>
          <p className="mt-1 text-sm text-muted">
            Watch the market breathe — every trade on Pacifica visualized in real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-success animate-pulse" : "bg-danger"}`} />
            {connected ? "Live" : "Connecting..."}
          </span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted">Trades</p>
          <p className="font-mono text-xl font-bold">{stats.totalTrades.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted">Volume</p>
          <p className="font-mono text-xl font-bold">
            ${stats.totalVolume >= 1e6
              ? `${(stats.totalVolume / 1e6).toFixed(1)}M`
              : stats.totalVolume >= 1e3
                ? `${(stats.totalVolume / 1e3).toFixed(0)}K`
                : stats.totalVolume.toFixed(0)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted">Whales (&gt;$50K)</p>
          <p className="font-mono text-xl font-bold text-yellow-400">{stats.whaleCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] text-muted">Buy Pressure</p>
          <div className="flex items-center gap-2">
            <p className={`font-mono text-xl font-bold ${stats.buyPressure > 55 ? "text-success" : stats.buyPressure < 45 ? "text-danger" : "text-warning"}`}>
              {stats.buyPressure.toFixed(0)}%
            </p>
            <div className="h-2 flex-1 rounded-full bg-danger/30">
              <div className="h-full rounded-full bg-success transition-all" style={{ width: `${stats.buyPressure}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-success" /> Buy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-danger" /> Sell
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-yellow-400" /> Whale (&gt;$50K)
        </span>
        <span>Bubble size = trade value</span>
        <span>Bottom bar = buy/sell pressure</span>
      </div>

      {/* Canvas */}
      <div className="relative overflow-hidden rounded-xl border border-border" style={{ height: "60vh" }}>
        {!connected && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm">Connecting to Pacifica WebSocket...</span>
            </div>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          style={{ background: "rgb(10, 10, 15)" }}
        />
      </div>
    </div>
  );
}
