import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { BarChart2, Layers } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useTick } from "@/contexts/TickContext";
import { useTickAnalysis, ANALYSIS_TYPES, getMultiMarketAdvice } from "@/hooks/useTickAnalysis";
import { generateAllTypeAdvice } from "@/hooks/useTickAnalysis";
import { Sidebar } from "@/components/Sidebar";
import { AdviceCard } from "@/components/AdviceCard";
import { Badge } from "@/components/ui/badge";
import { DigitHeatmap } from "@/components/DigitHeatmap";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { VOLATILITY_MARKETS } from "@/hooks/useDerivWS";

export default function Analysis() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const {
    ticks, isConnected, market, allMarketsMode, tickMap,
    analysisType, setAnalysisType, barrier, setBarrier,
    filterTicks, settings, marketInfo,
  } = useTick();

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [user, isLoading, setLocation]);

  const windowTicks = filterTicks(ticks);
  const analysis = useTickAnalysis(windowTicks, analysisType, barrier);

  const allTypesSnapshot = useMemo(
    () => generateAllTypeAdvice(windowTicks, analysis?.hotDigit ?? 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [windowTicks.length, analysis?.hotDigit]
  );

  if (isLoading || !user) return null;

  const windowLabel = settings.mode === "ticks"
    ? `${windowTicks.length} ticks`
    : `${settings.minutes} min (${windowTicks.length} ticks)`;

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      <Sidebar className="hidden md:flex" />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-white/5 glass-card shrink-0 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold">
              {allMarketsMode ? "All Markets" : (marketInfo?.name || market)} — Signal Analysis
            </h2>
            <Badge
              variant="outline"
              className={`font-mono text-xs ${isConnected ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-red-400 border-red-400/30 bg-red-400/10"}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
              {isConnected ? "LIVE" : "DISCONNECTED"}
            </Badge>
          </div>
          <span className="text-xs font-mono text-muted-foreground">Window: {windowLabel}</span>
        </header>

        <div className="p-4 md:p-6 max-w-[1400px] mx-auto w-full space-y-5">

          {/* Analysis type + barrier selector */}
          <div className="glass-card rounded-2xl border border-white/5 p-4 flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Analysis Type</span>
            <div className="flex flex-wrap gap-2">
              {ANALYSIS_TYPES.map(at => (
                <button
                  key={at.type}
                  onClick={() => { setAnalysisType(at.type); if (!at.hasBarrier) setBarrier(4); }}
                  data-testid={`analysis-type-${at.type}`}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    analysisType === at.type
                      ? "bg-primary/20 border-primary/50 text-primary"
                      : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
                  }`}
                >
                  {at.label}
                </button>
              ))}
            </div>
            {ANALYSIS_TYPES.find(t => t.type === analysisType)?.hasBarrier && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {ANALYSIS_TYPES.find(t => t.type === analysisType)?.barrierLabel}:
                </span>
                <div className="flex gap-1">
                  {Array.from({ length: 10 }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setBarrier(i)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        barrier === i
                          ? "bg-secondary/30 border border-secondary/60 text-secondary"
                          : "bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {allMarketsMode ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground font-mono uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4" /> All Markets — ranked by best opportunity
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {getMultiMarketAdvice(tickMap, analysisType, barrier).map(({ symbol, advice, ticks: tc }, idx) => {
                  const info = VOLATILITY_MARKETS.find(m => m.symbol === symbol);
                  return (
                    <motion.div key={symbol} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.04 }}>
                      <AdviceCard advice={advice} market={`${info?.label} — ${info?.name} (${tc} ticks)`} />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* Left */}
              <div className="lg:col-span-8 space-y-5">
                {analysis && <AdviceCard advice={analysis.advice} />}

                {/* All-types snapshot */}
                <div className="glass-card rounded-2xl border border-white/5 p-5 space-y-3">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Quick Compare — All Types</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {allTypesSnapshot.map(({ type, label, advice }) => {
                      const isActive = type === analysisType;
                      const borderCls =
                        advice.action === "BUY"   ? "border-green-500/30 bg-green-500/5" :
                        advice.action === "AVOID" ? "border-red-500/30 bg-red-500/5"     : "border-white/5";
                      return (
                        <button
                          key={type}
                          onClick={() => setAnalysisType(type)}
                          className={`rounded-xl p-3 border text-left transition-all hover:border-primary/30 ${borderCls} ${isActive ? "ring-1 ring-primary/50" : ""}`}
                        >
                          <div className="text-xs text-muted-foreground mb-1">{label}</div>
                          <div className="text-xl font-black text-white">{advice.probability}%</div>
                          <div className={`text-xs font-bold mt-1 ${
                            advice.action === "BUY"   ? "text-green-400" :
                            advice.action === "AVOID" ? "text-red-400"   : "text-yellow-400"
                          }`}>{advice.action}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right */}
              <div className="lg:col-span-4 space-y-5">
                <div className="glass-card rounded-2xl border border-white/5 p-5 space-y-3">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Distribution</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-primary">Even {analysis?.evenPercent ?? 0}%</span>
                        <span className="text-secondary">Odd {analysis?.oddPercent ?? 0}%</span>
                      </div>
                      <div className="h-2 bg-secondary/20 rounded-full overflow-hidden flex">
                        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${analysis?.evenPercent ?? 50}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-green-400">Over 4: {analysis?.overPercent ?? 0}%</span>
                        <span className="text-red-400">Under 5: {analysis?.underPercent ?? 0}%</span>
                      </div>
                      <div className="h-2 bg-red-400/20 rounded-full overflow-hidden flex">
                        <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${analysis?.overPercent ?? 50}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl border border-white/5 p-5 space-y-3">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Signal Strength</h3>
                  <div className="flex items-center gap-4">
                    <ConfidenceMeter confidence={analysis?.confidence ?? 0} />
                    <div>
                      <div className="text-2xl font-black text-white">{analysis?.confidence ?? 0}%</div>
                      <div className="text-xs text-muted-foreground">confidence</div>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl border border-white/5 p-5 space-y-3">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Digit Heatmap</h3>
                  <DigitHeatmap
                    frequencies={analysis?.frequencies ?? Array(10).fill(0)}
                    hotDigit={analysis?.hotDigit ?? -1}
                    coldDigit={analysis?.coldDigit ?? -1}
                  />
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
