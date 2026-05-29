import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";

const APP_ID = import.meta.env.VITE_DERIV_APP_ID || "1089";

export type ContractType =
  // Digits
  | "DIGITEVEN" | "DIGITODD" | "DIGITOVER" | "DIGITUNDER" | "DIGITMATCH" | "DIGITDIFF"
  // Rise/Fall & Higher/Lower (same Deriv type, barrier optional)
  | "CALL" | "PUT"
  // Touch
  | "ONE_TOUCH" | "NO_TOUCH"
  // Ends In/Out
  | "EXPIRYRANGE" | "EXPIRYMISS"
  // Multipliers
  | "MULTUP" | "MULTDOWN";

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
  barrier2?: string;
  multiplier?: number;
}

export interface BuyParams {
  contractType: ContractType;
  symbol: string;
  stake: number;
  currency: string;
  barrier?: string;
  barrier2?: string;
  duration?: number;
  durationUnit?: "t" | "m" | "h" | "d";
  multiplier?: number;
}

// Map analysis type string → ContractType + optional barrier
export function analysisTypeToContract(
  type: string,
  barrier?: number
): { contractType: ContractType; barrier?: string } {
  switch (type) {
    case "even":           return { contractType: "DIGITEVEN" };
    case "odd":            return { contractType: "DIGITODD" };
    case "over":           return { contractType: "DIGITOVER",  barrier: String(barrier ?? 4) };
    case "under":          return { contractType: "DIGITUNDER", barrier: String(barrier ?? 5) };
    case "matches":        return { contractType: "DIGITMATCH", barrier: String(barrier ?? 0) };
    case "differs":        return { contractType: "DIGITDIFF",  barrier: String(barrier ?? 0) };
    case "rise":           return { contractType: "CALL" };
    case "fall":           return { contractType: "PUT" };
    case "higher":         return { contractType: "CALL" };  // barrier computed externally
    case "lower":          return { contractType: "PUT" };
    case "touch":          return { contractType: "ONE_TOUCH" };
    case "no_touch":       return { contractType: "NO_TOUCH" };
    case "ends_in":        return { contractType: "EXPIRYRANGE" };
    case "ends_out":       return { contractType: "EXPIRYMISS" };
    case "multiplier_up":  return { contractType: "MULTUP" };
    case "multiplier_down":return { contractType: "MULTDOWN" };
    default:               return { contractType: "DIGITEVEN" };
  }
}

export function contractTypeLabel(ct: ContractType, barrier?: string): string {
  switch (ct) {
    case "DIGITEVEN":   return "Even";
    case "DIGITODD":    return "Odd";
    case "DIGITOVER":   return `Over ${barrier ?? ""}`;
    case "DIGITUNDER":  return `Under ${barrier ?? ""}`;
    case "DIGITMATCH":  return `Matches ${barrier ?? ""}`;
    case "DIGITDIFF":   return `Differs ${barrier ?? ""}`;
    case "CALL":        return barrier ? `Higher (>${barrier})` : "Rise";
    case "PUT":         return barrier ? `Lower (<${barrier})` : "Fall";
    case "ONE_TOUCH":   return `Touch ${barrier ?? ""}`;
    case "NO_TOUCH":    return `No Touch ${barrier ?? ""}`;
    case "EXPIRYRANGE": return "Ends In";
    case "EXPIRYMISS":  return "Ends Out";
    case "MULTUP":      return "Multiplier Up";
    case "MULTDOWN":    return "Multiplier Down";
  }
}

export function isDigitContract(ct: ContractType): boolean {
  return ct.startsWith("DIGIT");
}

export function isMultiplierContract(ct: ContractType): boolean {
  return ct === "MULTUP" || ct === "MULTDOWN";
}

export function useDerivTrading(token: string | null, onBalanceChange: (b: number) => void) {
  const [trades, setTrades] = useState<TradeResult[]>([]);
  const [isBuying, setIsBuying] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);

  function detectContractType(shortcode: string): ContractType {
    if (shortcode.includes("DIGITEVEN"))  return "DIGITEVEN";
    if (shortcode.includes("DIGITODD"))   return "DIGITODD";
    if (shortcode.includes("DIGITOVER"))  return "DIGITOVER";
    if (shortcode.includes("DIGITUNDER")) return "DIGITUNDER";
    if (shortcode.includes("DIGITMATCH")) return "DIGITMATCH";
    if (shortcode.includes("DIGITDIFF"))  return "DIGITDIFF";
    if (shortcode.includes("MULTUP"))     return "MULTUP";
    if (shortcode.includes("MULTDOWN"))   return "MULTDOWN";
    if (shortcode.includes("ONETOUCH"))   return "ONE_TOUCH";
    if (shortcode.includes("NOTOUCH"))    return "NO_TOUCH";
    if (shortcode.includes("EXPIRYMISS")) return "EXPIRYMISS";
    if (shortcode.includes("EXPIRYRANGE"))return "EXPIRYRANGE";
    if (shortcode.includes("CALL"))       return "CALL";
    if (shortcode.includes("PUT"))        return "PUT";
    return "CALL";
  }

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
          const result: TradeResult = {
            id: String(contractId),
            contractId,
            contractType: detectContractType(buy.shortcode || ""),
            symbol: buy.shortcode?.split("_")[1] || "R_100",
            buyPrice: buy.buy_price,
            payout: buy.payout,
            currency: "USD",
            status: "open",
            profit: null,
            purchaseTime: buy.purchase_time,
            shortcode: buy.shortcode,
          };
          setTrades(prev => [result, ...prev.slice(0, 19)]);
          onBalanceChange(buy.balance_after);
          setIsBuying(false);
          toast.success(`Trade placed — ${contractTypeLabel(result.contractType)}`, {
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
                t.contractId === poc.contract_id ? { ...t, status, profit } : t
              )
            );
            if (status === "won") {
              toast.success(`Trade WON +${profit?.toFixed(2)}`);
            } else {
              toast.error(`Trade LOST ${profit?.toFixed(2)}`);
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

      const isMultiplier = isMultiplierContract(params.contractType);
      const parameters: Record<string, unknown> = {
        contract_type: params.contractType,
        symbol: params.symbol,
        basis: "stake",
        currency: params.currency || "USD",
        amount: params.stake,
      };

      if (isMultiplier) {
        parameters.multiplier = params.multiplier ?? 10;
      } else {
        parameters.duration = params.duration ?? 5;
        parameters.duration_unit = params.durationUnit ?? "t";
      }

      if (params.barrier)  parameters.barrier  = params.barrier;
      if (params.barrier2) parameters.barrier2 = params.barrier2;

      ws.send(JSON.stringify({
        buy: 1,
        subscribe: 1,
        parameters,
        price: params.stake,
      }));
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
