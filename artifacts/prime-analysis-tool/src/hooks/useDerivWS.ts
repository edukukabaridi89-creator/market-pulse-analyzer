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
      const ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isComponentMounted.current) return;
        setIsConnected(true);
        toast.success(`Connected — ${VOLATILITY_MARKETS.find(m => m.symbol === symbol)?.name || symbol}`);
        ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
      };

      ws.onmessage = (event) => {
        if (!isComponentMounted.current) return;
        const data = JSON.parse(event.data);
        if (data.error) return;

        if (data.tick) {
          const { quote, epoch } = data.tick;
          const lastDigit = Math.floor(quote * 100) % 10;
          setTicks(prev => {
            const newTick: Tick = { quote, epoch, lastDigit, symbol };
            const next = [newTick, ...prev];
            if (next.length > 200) next.length = 200;
            return next;
          });
        }
      };

      ws.onclose = () => {
        if (!isComponentMounted.current) return;
        setIsConnected(false);
        toast.error("Reconnecting...");
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
