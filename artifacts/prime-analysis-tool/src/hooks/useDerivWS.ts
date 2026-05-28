import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

export interface Tick {
  quote: number;
  epoch: number;
  lastDigit: number;
}

export function useDerivWS() {
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const isComponentMounted = useRef(true);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket("wss://ws.derivws.com/websockets/v3?app_id=1089");
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        toast.success("Connected to Deriv API");
        ws.send(JSON.stringify({ ticks: "R_100", subscribe: 1 }));
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) {
          console.error("Deriv WS Error:", data.error.message);
          return;
        }

        if (data.tick) {
          const { quote, epoch } = data.tick;
          const lastDigit = Math.floor(quote * 100) % 10;
          
          setTicks(prev => {
            const newTick = { quote, epoch, lastDigit };
            const newTicks = [newTick, ...prev];
            // Keep last 100 ticks for analysis
            if (newTicks.length > 100) newTicks.length = 100;
            return newTicks;
          });
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (isComponentMounted.current) {
          toast.error("Reconnecting...");
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      console.error("WS connect error", e);
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, []);

  useEffect(() => {
    isComponentMounted.current = true;
    connect();

    return () => {
      isComponentMounted.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { ticks, isConnected };
}