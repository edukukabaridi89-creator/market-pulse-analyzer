import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";

const APP_ID = import.meta.env.VITE_DERIV_APP_ID || "1089";

export type ContractType =
  | "DIGITEVEN" | "DIGITODD"
  | "DIGITOVER" | "DIGITUNDER"
  | "DIGITMATCH" | "DIGITDIFF";

export interface TradeResult {
  id: string;
  contractId: number;
  contractType: ContractType;
  symbol: string;
  buyPrice: number;
  payout: number;
  currency: string;
  status: "open" | "won" | "lost" | "sold";
  profit: number | null;
  purchaseTime: number;
  shortcode: string;
  barrier?: string;
}

export interface BuyParams {
  contractType: ContractType;
  symbol: string;
  stake: number;
  currency: string;
  barrier?: string;
}

export function analysisTypeToContract(
  type: string,
  barrier?: number
): { contractType: ContractType; barrier?: string } {
  switch (type) {
    case "even":    return { contractType: "DIGITEVEN" };
    case "odd":     return { contractType: "DIGITODD" };
    case "over":    return { contractType: "DIGITOVER",  barrier: String(barrier ?? 4) };
    case "under":   return { contractType: "DIGITUNDER", barrier: String(barrier ?? 5) };
    case "matches": return { contractType: "DIGITMATCH", barrier: String(barrier ?? 0) };
    case "differs": return { contractType: "DIGITDIFF",  barrier: String(barrier ?? 0) };
    default:        return { contractType: "DIGITEVEN" };
  }
}

export function contractTypeLabel(ct: ContractType, barrier?: string): string {
  switch (ct) {
    case "DIGITEVEN":  return "Even";
    case "DIGITODD":   return "Odd";
    case "DIGITOVER":  return `Over ${barrier ?? ""}`;
    case "DIGITUNDER": return `Under ${barrier ?? ""}`;
    case "DIGITMATCH": return `Matches ${barrier ?? ""}`;
    case "DIGITDIFF":  return `Differs ${barrier ?? ""}`;
  }
}

export function useDerivTrading(token: string | null, onBalanceChange: (b: number) => void) {
  const [trades, setTrades] = useState<TradeResult[]>([]);
  const [isBuying, setIsBuying] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);
  const pendingContracts = useRef<Map<number, string>>(new Map());

  const ensureWS = useCallback((): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        resolve(wsRef.current);
        return;
      }

      const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!token) { reject(new Error("No token")); return; }
        ws.send(JSON.stringify({ authorize: token }));
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        const data = JSON.parse(event.data);

        if (data.error) {
          reject(new Error(data.error.message));
          return;
        }

        if (data.authorize) {
          onBalanceChange(data.authorize.balance);
          resolve(ws);
        }

        if (data.balance) {
          onBalanceChange(data.balance.balance);
        }

        if (data.buy) {
          const { buy } = data;
          const contractId = buy.contract_id;
          const barrier = pendingContracts.current.get(contractId);
          const result: TradeResult = {
            id: String(contractId),
            contractId,
            contractType: buy.shortcode.includes("DIGITEVEN") ? "DIGITEVEN"
              : buy.shortcode.includes("DIGITODD") ? "DIGITODD"
              : buy.shortcode.includes("DIGITOVER") ? "DIGITOVER"
              : buy.shortcode.includes("DIGITUNDER") ? "DIGITUNDER"
              : buy.shortcode.includes("DIGITMATCH") ? "DIGITMATCH"
              : "DIGITDIFF",
            symbol: buy.shortcode.split("_")[1] || "R_100",
            buyPrice: buy.buy_price,
            payout: buy.payout,
            currency: "USD",
            status: "open",
            profit: null,
            purchaseTime: buy.purchase_time,
            shortcode: buy.shortcode,
            barrier,
          };
          setTrades(prev => [result, ...prev.slice(0, 19)]);
          onBalanceChange(buy.balance_after);
          setIsBuying(false);
          toast.success(`Trade placed — ${contractTypeLabel(result.contractType, barrier)}`, {
            description: `Stake: ${buy.buy_price} | Max payout: ${buy.payout}`,
          });
        }

        if (data.proposal_open_contract) {
          const poc = data.proposal_open_contract;
          if (poc.is_sold || poc.status === "won" || poc.status === "lost") {
            const profit = poc.profit;
            const status: TradeResult["status"] = poc.status === "won" ? "won" : "lost";
            setTrades(prev =>
              prev.map(t =>
                t.contractId === poc.contract_id
                  ? { ...t, status, profit }
                  : t
              )
            );
            if (status === "won") {
              toast.success(`Trade WON +${profit?.toFixed(2)}`, { description: poc.longcode });
            } else {
              toast.error(`Trade LOST ${profit?.toFixed(2)}`, { description: poc.longcode });
            }
          }
        }
      };

      ws.onerror = () => reject(new Error("WebSocket error"));
    });
  }, [token, onBalanceChange]);

  const buyContract = useCallback(async (params: BuyParams) => {
    if (!token) { toast.error("Login with Deriv first"); return; }
    setIsBuying(true);

    try {
      const ws = await ensureWS();

      const body: Record<string, unknown> = {
        buy: 1,
        subscribe: 1,
        parameters: {
          contract_type: params.contractType,
          symbol: params.symbol,
          basis: "stake",
          currency: params.currency || "USD",
          amount: params.stake,
          duration: 1,
          duration_unit: "t",
        },
        price: params.stake,
      };

      if (params.barrier !== undefined) {
        (body.parameters as Record<string, unknown>).barrier = params.barrier;
      }

      ws.send(JSON.stringify(body));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Trade failed";
      toast.error(`Trade failed: ${msg}`);
      setIsBuying(false);
    }
  }, [token, ensureWS]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, []);

  const totalProfit = trades
    .filter(t => t.profit !== null)
    .reduce((sum, t) => sum + (t.profit ?? 0), 0);

  return { trades, isBuying, buyContract, totalProfit };
}
