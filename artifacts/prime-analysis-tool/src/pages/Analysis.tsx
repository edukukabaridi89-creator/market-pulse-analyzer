import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart2, Layers, Zap, ArrowRight } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useTick } from "@/contexts/TickContext";
import { useTickAnalysis, ANALYSIS_TYPES, getMultiMarketAdvice } from "@/hooks/useTickAnalysis";
import { generateAllTypeAdvice } from "@/hooks/useTickAnalysis";
import { Sidebar } from "@/components/Sidebar";
import { AdviceCard } from "@/components/AdviceCard";
import { Badge } from "@/components/ui/badge";
import { DigitHeatmap } from "@/components/DigitHeatmap";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { VOLATILITY_MARKETS, Tick } from "@/hooks/useDerivWS";

// ── Live Digit Strip ──────────────────────────────────────────────────────────
function LiveDigitStrip({ ticks }: { ticks: Tick[] }) {
  const last8 = ticks.slice(0, 8);
  if (last8.length === 0) return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="w-6 h-6 rounded-md bg-white/5 animate-pulse" />
      ))}
    </div>
  );
  return (
    <div className="flex gap-1 items-center">
      {last8.map((tick, i) => {
        const d = tick.lastDigit;
        const isEven = d % 2 === 0;
        const isNewest = i === 0;
        return (
          <AnimatePresence key={`${tick.epoch}-${i}`} mode="popLayout">
            <motion.div
              initial={isNewest ? { scale: 1.4, opacity: 0 } : false}
              animate={{ scale: 1, opacity: 1 - i * 0.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className={`relative w-6 h-6 rounded-md flex items-center justify-center text-xs font-black border transition-all ${
                isNewest
                  ? isEven
                    ? "bg-primary/30 border-primary/60 text-primary shadow-[0_0_8px_rgba(0,198,255,0.5)]"
                    : "bg-secondary/30 border-secondary/60 text-secondary shadow-[0_0_8px_rgba(255,85,0,0.5)]"
                  : isEven
                    ? "bg-primary/10 border-primary/20 text-primary/70"
                    : "bg-secondary/10 border-secondary/20 text-secondary/70"
              }`}
            >
              {d}
              {isNewest && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
              )}
            </motion.div>
          </AnimatePresence>
        );
      })}
      <span className="text-[9px] text-muted-foreground ml-0.5">← latest</span>
    </div>
  );
}

// ── Entry Point Chip ──────────────────────────────────────────────────────────
function EntryPointChip({ entry, action }: { entry: string; action: "BUY" | "WAIT" | "AVOID" }) {
  if (!entry || action !== "BUY") return null;
  return (
    <div className="flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/25 mt-2">
      <ArrowRight className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
      <p className="text-[11px] text-green-300 leading-snug">{entry}</p>
    </div>
  );
}

// ── Enhanced Multi-Market Card ────────────────────────────────────────────────
interface MultiMarketCardProps {
  symbol: string;
  advice: ReturnType<typeof getMultiMarketAdvice>[number]["advice"];
  tc: number;
  idx: number;
  ticks: Tick[];
}

function MultiMarketCard({ symbol, advice, tc, idx, ticks }: MultiMarketCardProps) {
  const info = VOLATILITY_MARKETS.find(m => m.symbol === symbol);
  const isBuy = advice.action === "BUY";
  const isAvoid = advice.action === "AVOID";

  const borderCls = isBuy
    ? "border-green-500/40 shadow-[0_0_20px_rgba(34,197,94,0.08)]"
    : isAvoid
      ? "border-red-500/30"
      : "border-white/8";
  const glowCls = isBuy ? "bg-green-500/5" : isAvoid ? "bg-red-500/5" : "";
  const barCls = isBuy ? "bg-green-400" : isAvoid ? "bg-red-400" : "bg-yellow-400";
  const actionTextCls = isBuy ? "text-green-400" : isAvoid ? "text-red-400" : "text-yellow-400";
  const actionBg = isBuy
    ? "bg-green-500/15 border-green-500/30"
    : isAvoid
      ? "bg-red-500/15 border-red-500/30"
      : "bg-yellow-500/10 border-yellow-500/20";

  // Digit frequencies from live ticks
  const freq = Array(10).fill(0);
  ticks.slice(0, 50).forEach(t => freq[t.lastDigit]++);
  const total = Math.max(1, ticks.slice(0, 50).length);
  const hotDigit = freq.indexOf(Math.max(...freq));
  const coldDigit = freq.indexOf(Math.min(...freq));

  // Pattern summary
  const evenCount = ticks.slice(0, 20).filter(t => t.lastDigit % 2 === 0).length;
  const oddCount = 20 - evenCount;
  const lastConsecutive = (() => {
    if (ticks.length < 2) return null;
    const first = ticks[0].lastDigit;
    const firstIsEven = first % 2 === 0;
    let streak = 1;
    for (let i = 1; i < Math.min(ticks.length, 10); i++) {
      if ((ticks[i].lastDigit % 2 === 0) === firstIsEven) streak++;
      else break;
    }
    return { streak, type: firstIsEven ? "EVEN" : "ODD", opposite: firstIsEven ? "ODD" : "EVEN" };
  })();

  return (
    <motion.div
      key={symbol}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.04 }}
      className={`glass-card rounded-2xl border ${borderCls} ${glowCls} overflow-hidden relative`}
    >
      {isBuy && (
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-green-400 to-transparent" />
      )}

      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              {isBuy && <Zap className="w-3.5 h-3.5 text-green-400" />}
              <span className="text-white font-black text-base">{info?.label ?? symbol}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${actionBg} ${actionTextCls}`}>
                {advice.action}
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">{info?.name ?? symbol}</div>
          </div>
          <div className="text-right shrink-0">
            <div className={`text-2xl font-black ${isBuy ? "text-green-400" : isAvoid ? "text-red-400" : "text-white"}`}>
              {advice.probability}%
            </div>
            <div className="text-[10px] text-muted-foreground">confidence</div>
          </div>
        </div>

        {/* Probability bar */}
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${barCls}`}
            initial={{ width: 0 }}
            animate={{ width: `${advice.probability}%` }}
            transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.04 }}
          />
        </div>

        {/* Live digit stream */}
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Live Digits</div>
          <LiveDigitStrip ticks={ticks} />
        </div>

        {/* Digit stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/[0.03] rounded-lg p-2 text-center">
            <div className="text-[10px] text-muted-foreground">Hot Digit</div>
            <div className="text-base font-black text-orange-400">{hotDigit}</div>
            <div className="text-[9px] text-muted-foreground">{Math.round(freq[hotDigit] / total * 100)}%</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2 text-center">
            <div className="text-[10px] text-muted-foreground">Cold Digit</div>
            <div className="text-base font-black text-blue-400">{coldDigit}</div>
            <div className="text-[9px] text-muted-foreground">{Math.round(freq[coldDigit] / total * 100)}%</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2 text-center">
            <div className="text-[10px] text-muted-foreground">Even/Odd</div>
            <div className="text-base font-black text-white">{evenCount}/{oddCount}</div>
            <div className="text-[9px] text-muted-foreground">last 20</div>
          </div>
        </div>

        {/* Streak insight */}
        {lastConsecutive && lastConsecutive.streak >= 3 && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <span className="text-yellow-400 font-black text-xs">{lastConsecutive.streak}×</span>
            <span className="text-yellow-300 text-[11px]">
              consecutive {lastConsecutive.type} — {lastConsecutive.opposite} is overdue
            </span>
          </div>
        )}

        {/* Analysis reason */}
        <div className="bg-white/[0.03] rounded-lg px-3 py-2">
          <p className="text-[11px] text-muted-foreground leading-snug">{advice.reason}</p>
        </div>

        {/* Entry point */}
        <EntryPointChip entry={advice.entry} action={advice.action} />

        {/* Contract + ticks */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
            {advice.contractType}
          </span>
          <span className="text-[10px] text-muted-foreground">{tc} ticks</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
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

  const multiMarketResults = getMultiMarketAdvice(tickMap, analysisType, barrier);

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
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground font-mono uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4" /> All Markets — ranked by best opportunity
                </div>
                {/* BUY count badge */}
                {(() => {
                  const buyCount = multiMarketResults.filter(r => r.advice.action === "BUY").length;
                  return buyCount > 0 ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/15 border border-green-500/30">
                      <Zap className="w-3.5 h-3.5 text-green-400" />
                      <span className="text-green-400 font-bold text-xs">{buyCount} market{buyCount > 1 ? "s" : ""} signalling BUY</span>
                    </div>
                  ) : null;
                })()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {multiMarketResults.map(({ symbol, advice, ticks: tc }, idx) => (
                  <MultiMarketCard
                    key={symbol}
                    symbol={symbol}
                    advice={advice}
                    tc={tc}
                    idx={idx}
                    ticks={tickMap[symbol] ?? []}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* Left */}
              <div className="lg:col-span-8 space-y-5">
                {analysis && <AdviceCard advice={analysis.advice} />}

                {/* Live digit stream for single market */}
                <div className="glass-card rounded-2xl border border-white/5 p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Live Digit Stream</h3>
                    <span className="text-[10px] text-muted-foreground">{windowTicks.length} ticks</span>
                  </div>
                  <LiveDigitStrip ticks={windowTicks} />
                  {/* Last 20 digits grid */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {windowTicks.slice(0, 20).map((tick, i) => {
                      const isEven = tick.lastDigit % 2 === 0;
                      return (
                        <div
                          key={`${tick.epoch}-${i}`}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${
                            isEven
                              ? "bg-primary/10 border-primary/20 text-primary"
                              : "bg-secondary/10 border-secondary/20 text-secondary"
                          }`}
                        >
                          {tick.lastDigit}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary/40 inline-block" /> Even digits</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-secondary/40 inline-block" /> Odd digits</span>
                  </div>
                </div>

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
