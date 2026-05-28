import { createContext, useContext, useState, ReactNode } from "react";
import { useDerivWS, Tick, VOLATILITY_MARKETS } from "@/hooks/useDerivWS";
import { useMultiMarketWS } from "@/hooks/useMultiMarketWS";
import { useSettings, AppSettings } from "@/hooks/useSettings";
import { AnalysisType } from "@/hooks/useTickAnalysis";

interface TickContextValue {
  ticks: Tick[];
  isConnected: boolean;
  market: string;
  setMarket: (m: string) => void;
  allMarketsMode: boolean;
  setAllMarketsMode: (v: boolean) => void;
  tickMap: Record<string, Tick[]>;
  multiConnected: boolean;
  analysisType: AnalysisType;
  setAnalysisType: (t: AnalysisType) => void;
  barrier: number;
  setBarrier: (b: number) => void;
  settings: AppSettings;
  saveSettings: (next: Partial<AppSettings>) => void;
  resetSettings: () => void;
  filterTicks: (ticks: Tick[]) => Tick[];
  marketInfo: typeof VOLATILITY_MARKETS[number] | undefined;
}

const TickContext = createContext<TickContextValue | null>(null);

export function TickProvider({ children }: { children: ReactNode }) {
  const [market, setMarket] = useState("R_100");
  const [allMarketsMode, setAllMarketsMode] = useState(false);
  const [analysisType, setAnalysisType] = useState<AnalysisType>("even");
  const [barrier, setBarrier] = useState(4);

  const { ticks, isConnected } = useDerivWS(market, !allMarketsMode);
  const { tickMap, isConnected: multiConnected } = useMultiMarketWS(allMarketsMode);
  const { settings, saveSettings, resetSettings, filterTicks } = useSettings();

  const marketInfo = VOLATILITY_MARKETS.find(m => m.symbol === market);

  return (
    <TickContext.Provider value={{
      ticks,
      isConnected,
      market,
      setMarket,
      allMarketsMode,
      setAllMarketsMode,
      tickMap,
      multiConnected,
      analysisType,
      setAnalysisType,
      barrier,
      setBarrier,
      settings,
      saveSettings,
      resetSettings,
      filterTicks,
      marketInfo,
    }}>
      {children}
    </TickContext.Provider>
  );
}

export function useTick() {
  const ctx = useContext(TickContext);
  if (!ctx) throw new Error("useTick must be used inside TickProvider");
  return ctx;
}
