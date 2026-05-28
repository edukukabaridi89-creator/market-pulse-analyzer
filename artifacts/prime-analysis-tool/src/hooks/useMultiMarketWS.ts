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
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!enabled) return;
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        toast.success("Connected — All Markets Mode");
        ALL_SYMBOLS.forEach(symbol => {
          ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
        });
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        const data = JSON.parse(event.data);
        if (data.error || !data.tick) return;

        const { quote, epoch, symbol } = data.tick;
        const lastDigit = Math.floor(quote * 100) % 10;
        const newTick: Tick = { quote, epoch, lastDigit, symbol };

        setTickMap(prev => {
          const existing = prev[symbol] || [];
          const next = [newTick, ...existing];
          if (next.length > 200) next.length = 200;
          return { ...prev, [symbol]: next };
        });
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        if (enabled) {
          toast.error("Reconnecting all markets...");
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
