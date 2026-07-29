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

const ALL_SYMBOLS = VOLATILITY_MARKETS.map(m => m.symbol);

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
      const appId = import.meta.env.VITE_DERIV_APP_ID || "36544";
      const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${appId}`);
      wsRef.current = ws;

      let pingInterval: ReturnType<typeof setInterval> | null = null;

      // Track which symbols have already been tried so we never loop
      const triedSymbols = new Set<string>([symbol]);
      // Build the fallback order: requested symbol first, then the rest
      const fallbackQueue = [symbol, ...ALL_SYMBOLS.filter(s => s !== symbol)];
      let fallbackIndex = 0; // points to the next symbol to try after current

      const subscribeNext = () => {
        fallbackIndex++;
        if (fallbackIndex >= fallbackQueue.length) {
          console.warn("[DerivWS] All symbols returned InvalidSymbol — no markets available");
          toast.error("No volatility markets available with this app_id.");
          return;
        }
        const next = fallbackQueue[fallbackIndex];
        if (!triedSymbols.has(next)) {
          triedSymbols.add(next);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ ticks: next, subscribe: 1 }));
          }
        } else {
          subscribeNext(); // skip already-tried
        }
      };

      ws.onopen = () => {
        if (!isComponentMounted.current) return;
        setIsConnected(true);
        // Subscribe to the requested symbol immediately
        ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
        // Keep-alive ping every 30 s
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ ping: 1 }));
        }, 30_000);
      };

      ws.onmessage = (event) => {
        if (!isComponentMounted.current) return;
        const data = JSON.parse(event.data);
        if (data.pong) return;

        if (data.error) {
          const code = data.error.code;
          console.warn("[DerivWS] error from Deriv:", code, data.error.message);
          if (code === "InvalidSymbol" || code === "InputValidationFailed") {
            // This symbol is not available — silently try the next one
            subscribeNext();
            return;
          }
          // Transient errors (rate limit, etc.) → close and reconnect
          ws.close();
          return;
        }

        if (data.tick) {
          const { quote, epoch, pip_size } = data.tick;
          const activeSymbol: string = data.tick.symbol ?? symbol;
          // Show Connected toast on the very first tick received
          if (ticks.length === 0) {
            const name = VOLATILITY_MARKETS.find(m => m.symbol === activeSymbol)?.name ?? activeSymbol;
            toast.success(`Connected — ${name}`);
          }
          const decimals = typeof pip_size === "number" ? pip_size : 2;
          const lastDigit = parseInt(quote.toFixed(decimals).slice(-1), 10);
          setTicks(prev => {
            const newTick: Tick = { quote, epoch, lastDigit, symbol: activeSymbol };
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
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

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
