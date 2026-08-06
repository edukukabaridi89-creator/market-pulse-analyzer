import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Tick, VOLATILITY_MARKETS } from "./useDerivWS";

const ALL_SYMBOLS = VOLATILITY_MARKETS.map(m => m.symbol);

export type MultiMarketTicks = Record<string, Tick[]>;

export function useMultiMarketWS(enabled: boolean) {
  const [tickMap, setTickMap] = useState<MultiMarketTicks>(() =>
    Object.fromEntries(ALL_SYMBOLS.map(s => [s, []]))
  );
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!enabled) return;
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket("wss://api.derivws.com/trading/v1/options/ws/public");
      wsRef.current = ws;

      let pingInterval: ReturnType<typeof setInterval> | null = null;
      let firstTickReceived = false;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        // Stagger subscriptions 150 ms apart to stay under Deriv's burst limit
        ALL_SYMBOLS.forEach((symbol, i) => {
          setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
            }
          }, i * 150);
        });
        // Keep-alive ping every 30 s
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ ping: 1 }));
        }, 30_000);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        const data = JSON.parse(event.data);
        if (data.pong) return;

        if (data.error) {
          const code = data.error.code;
          console.warn("[MultiMarketWS] error from Deriv:", code, data.error.message);
          // InvalidSymbol just means that one market isn't available — skip it
          if (code === "InvalidSymbol" || code === "InputValidationFailed") return;
          // Transient errors → reconnect the whole connection
          ws.close();
          return;
        }

        if (!data.tick) return;

        const { quote, epoch, symbol, pip_size } = data.tick;

        // Show connected toast on the very first tick across any market
        if (!firstTickReceived) {
          firstTickReceived = true;
          toast.success("Connected — All Markets Mode");
        }

        const decimals = typeof pip_size === "number" ? pip_size : 2;
        const lastDigit = parseInt(quote.toFixed(decimals).slice(-1), 10);
        const newTick: Tick = { quote, epoch, lastDigit, symbol };

        setTickMap(prev => {
          const existing = prev[symbol] || [];
          const next = [newTick, ...existing];
          if (next.length > 200) next.length = 200;
          return { ...prev, [symbol]: next };
        });
      };

      ws.onclose = () => {
        if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
        if (!mountedRef.current) return;
        setIsConnected(false);
        if (enabled) {
          reconnectRef.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => ws.close();
    } catch {
      setIsConnected(false);
      if (enabled) reconnectRef.current = setTimeout(connect, 3000);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      setTickMap(Object.fromEntries(ALL_SYMBOLS.map(s => [s, []])));
      connect();
    } else {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    }
  }, [enabled, connect]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  return { tickMap, isConnected };
}
