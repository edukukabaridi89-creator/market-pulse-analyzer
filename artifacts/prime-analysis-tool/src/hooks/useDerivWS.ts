import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

export interface Tick {
  quote: number;
  epoch: number;
  lastDigit: number;
  symbol: string;
}

export const VOLATILITY_MARKETS = [
  { symbol: "R_10",    label: "V10",  name: "Volatility 10 Index" },
  { symbol: "R_25",    label: "V25",  name: "Volatility 25 Index" },
  { symbol: "R_50",    label: "V50",  name: "Volatility 50 Index" },
  { symbol: "R_75",    label: "V75",  name: "Volatility 75 Index" },
  { symbol: "R_100",   label: "V100", name: "Volatility 100 Index" },
  { symbol: "1HZ10V",  label: "V10(1s)",  name: "Volatility 10 (1s) Index" },
  { symbol: "1HZ25V",  label: "V25(1s)",  name: "Volatility 25 (1s) Index" },
  { symbol: "1HZ50V",  label: "V50(1s)",  name: "Volatility 50 (1s) Index" },
  { symbol: "1HZ75V",  label: "V75(1s)",  name: "Volatility 75 (1s) Index" },
  { symbol: "1HZ100V", label: "V100(1s)", name: "Volatility 100 (1s) Index" },
];

// Pick the best available symbol from the same volatility family.
// Prefers exact match, then same number in the other family (R_ ↔ 1HZ),
// then any available volatility symbol.
function pickBestSymbol(wanted: string, available: Set<string>): string | null {
  if (available.has(wanted)) return wanted;

  // Try the 1s-tick counterpart (R_100 ↔ 1HZ100V, R_10 ↔ 1HZ10V …)
  const numMatch = wanted.match(/(\d+)/);
  if (numMatch) {
    const num = numMatch[1];
    const alt = wanted.startsWith("1HZ") ? `R_${num}` : `1HZ${num}V`;
    if (available.has(alt)) return alt;
  }

  // Fall back to any volatility symbol we recognise
  for (const m of VOLATILITY_MARKETS) {
    if (available.has(m.symbol)) return m.symbol;
  }
  return null;
}

export function useDerivWS(market: string = "R_100", enabled: boolean = true) {
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isComponentMounted = useRef(true);
  const currentMarketRef = useRef(market);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setTicks([]);
  }, []);

  const connect = useCallback((symbol: string) => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      // 36544 = Deriv API Explorer app — whitelisted for all domains.
      // Fall back to any user-supplied ID from the environment.
      const appId = import.meta.env.VITE_DERIV_APP_ID || "36544";
      const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);
      wsRef.current = ws;

      let pingInterval: ReturnType<typeof setInterval> | null = null;

      ws.onopen = () => {
        if (!isComponentMounted.current) return;
        // Keep-alive ping every 30 s
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ ping: 1 }));
        }, 30_000);
        // Discover available symbols before subscribing
        ws.send(JSON.stringify({ active_symbols: "brief", product_type: "basic" }));
      };

      ws.onmessage = (event) => {
        if (!isComponentMounted.current) return;
        const data = JSON.parse(event.data);
        if (data.pong) return;

        // ── active_symbols response → subscribe to the best available symbol ──
        if (data.active_symbols) {
          const available = new Set<string>(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data.active_symbols.map((s: any) => s.symbol as string)
          );
          const target = pickBestSymbol(symbol, available);
          if (target) {
            setIsConnected(true);
            ws.send(JSON.stringify({ ticks: target, subscribe: 1 }));
            const name = VOLATILITY_MARKETS.find(m => m.symbol === target)?.name ?? target;
            toast.success(`Connected — ${name}${target !== symbol ? ` (${symbol} unavailable, using ${target})` : ""}`);
          } else {
            console.warn("[DerivWS] No volatility symbols available with this app_id");
            toast.error("No volatility markets available. Check your app_id.");
          }
          return;
        }

        // ── error handling ──
        if (data.error) {
          const code = data.error.code;
          console.warn("[DerivWS] error from Deriv:", code, data.error.message);
          // Transient errors → reconnect; permanent symbol errors → log and skip
          if (code === "InvalidSymbol" || code === "InputValidationFailed") return;
          ws.close();
          return;
        }

        // ── tick data ──
        if (data.tick) {
          const { quote, epoch, pip_size } = data.tick;
          const decimals = typeof pip_size === "number" ? pip_size : 2;
          const lastDigit = parseInt(quote.toFixed(decimals).slice(-1), 10);
          setTicks(prev => {
            const newTick: Tick = { quote, epoch, lastDigit, symbol: data.tick.symbol ?? symbol };
            const next = [newTick, ...prev];
            if (next.length > 200) next.length = 200;
            return next;
          });
        }
      };

      ws.onclose = () => {
        if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
        if (!isComponentMounted.current) return;
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(() => connect(currentMarketRef.current), 3000);
      };

      ws.onerror = () => ws.close();
    } catch {
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(() => connect(currentMarketRef.current), 3000);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      disconnect();
      return;
    }
    currentMarketRef.current = market;
    setTicks([]);
    connect(market);
  }, [market, enabled, connect, disconnect]);

  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  return { ticks, isConnected };
}
