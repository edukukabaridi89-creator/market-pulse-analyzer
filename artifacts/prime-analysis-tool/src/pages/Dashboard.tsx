import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Volume2, VolumeX, TrendingUp, TrendingDown,
  BarChart2, Layers, ChevronDown,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useTick } from "@/contexts/TickContext";
import { useTickAnalysis, ANALYSIS_TYPES, TRADE_CATEGORIES, getMultiMarketAdvice, generateAllTypeAdvice } from "@/hooks/useTickAnalysis";
import { VOLATILITY_MARKETS } from "@/hooks/useDerivWS";
import { Sidebar } from "@/components/Sidebar";
import { AdviceCard } from "@/components/AdviceCard";
import { DigitHeatmap } from "@/components/DigitHeatmap";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { TickChart } from "@/components/TickChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const {
    ticks, isConnected, market, setMarket,
    allMarketsMode, setAllMarketsMode,
    tickMap, multiConnected,
    analysisType, setAnalysisType,
    barrier, setBarrier,
    filterTicks, marketInfo,
  } = useTick();

  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const windowTicks = filterTicks(ticks);
  const analysis = useTickAnalysis(windowTicks, analysisType, barrier);
  const activeAnalysisConfig = ANALYSIS_TYPES.find(t => t.type === analysisType)!;
  const allSignals = useMemo(
    () => generateAllTypeAdvice(windowTicks, analysis?.hotDigit ?? 0),
    [windowTicks, analysis?.hotDigit]
  );
  const isConnectedAll = allMarketsMode ? multiConnected : isConnected;

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    if (!soundEnabled || ticks.length === 0) return;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  }, [ticks, soundEnabled]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-8 h-8 text-primary animate-pulse" />
          <span className="text-muted-foreground font-mono text-sm uppercase tracking-widest">Initializing Terminal...</span>
        </div>
      </div>
    );
  }

  const latestTick = ticks[0] || null;

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      <Sidebar className="hidden md:flex" />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <header className="h-16 border-b border-white/5 glass-card shrink-0 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold">
              {allMarketsMode ? "All Markets Analysis" : (marketInfo?.name || market)}
            </h2>
            <Badge
              variant="outline"
              className={`font-mono text-xs ${isConnectedAll ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-red-400 border-red-400/30 bg-red-400/10"}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isConnectedAll ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
              {isConnectedAll ? "LIVE" : "DISCONNECTED"}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full w-9 h-9 border-white/10"
            onClick={() => setSoundEnabled(!soundEnabled)}
            data-testid="button-sound-toggle"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
          </Button>
        </header>

        <div className="p-4 md:p-6 space-y-4 max-w-[1600px] mx-auto w-full">

          {/* ── CONTROL STRIP ── */}
          <div className="glass-card rounded-2xl border border-white/5 p-4 space-y-4">

            {/* Row 1: Market selector */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider shrink-0">Market</span>

              <button
                onClick={() => setAllMarketsMode(!allMarketsMode)}
                data-testid="button-all-markets"
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  allMarketsMode
                    ? "bg-secondary/20 border-secondary/50 text-secondary shadow-[0_0_16px_rgba(123,47,247,0.3)]"
                    : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Analyze All Markets
              </button>

              <div className="w-px h-5 bg-white/10" />

              {/* Desktop pills */}
              <div className="hidden lg:flex flex-wrap gap-2">
                {VOLATILITY_MARKETS.map(m => (
                  <button
                    key={m.symbol}
                    onClick={() => { setMarket(m.symbol); setAllMarketsMode(false); }}
                    data-testid={`button-market-${m.symbol}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      !allMarketsMode && market === m.symbol
                        ? "bg-primary/20 border-primary/50 text-primary shadow-[0_0_12px_rgba(0,114,255,0.25)]"
                        : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Mobile dropdown */}
              <div className="relative lg:hidden">
                <button
                  onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                  disabled={allMarketsMode}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border border-primary/50 bg-primary/20 text-primary"
                  data-testid="button-market-dropdown"
                >
                  {marketInfo?.label} <ChevronDown className="w-3 h-3" />
                </button>
                {showMarketDropdown && (
                  <div className="absolute top-10 left-0 z-50 glass-card border border-white/10 rounded-xl p-2 min-w-[180px] space-y-1">
                    {VOLATILITY_MARKETS.map(m => (
                      <button
                        key={m.symbol}
                        onClick={() => { setMarket(m.symbol); setAllMarketsMode(false); setShowMarketDropdown(false); }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${
                          market === m.symbol ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {m.label} — {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Row 2: Analysis type + barrier */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider shrink-0">Analysis</span>
              <div className="flex flex-wrap gap-2">
                {ANALYSIS_TYPES.map(at => (
                  <button
                    key={at.type}
                    onClick={() => { setAnalysisType(at.type); if (!at.hasBarrier) setBarrier(4); }}
                    data-testid={`button-analysis-${at.type}`}
                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      analysisType === at.type
                        ? "bg-primary/20 border-primary/50 text-primary shadow-[0_0_12px_rgba(0,114,255,0.25)]"
                        : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {at.label}
                  </button>
                ))}
              </div>
              {activeAnalysisConfig.hasBarrier && (
                <div className="flex items-center gap-2 ml-1">
                  <span className="text-xs text-muted-foreground">{activeAnalysisConfig.barrierLabel}:</span>
                  <div className="flex gap-1">
                    {Array.from({ length: 10 }, (_, i) => {
                      const disabled =
                        (analysisType === "over" && i >= 9) ||
                        (analysisType === "under" && i === 0);
                      return (
                        <button
                          key={i}
                          disabled={disabled}
                          onClick={() => setBarrier(i)}
                          data-testid={`button-barrier-${i}`}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                            barrier === i
                              ? "bg-secondary/30 border border-secondary/60 text-secondary"
                              : disabled
                              ? "opacity-20 cursor-not-allowed text-muted-foreground"
                              : "bg-white/5 border border-white/10 text-muted-foreground hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {i}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── ALL MARKETS MODE ── */}
          {allMarketsMode ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono uppercase tracking-wider">
                <Layers className="w-4 h-4" />
                All Markets — {ANALYSIS_TYPES.find(t => t.type === analysisType)?.label} Analysis
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {getMultiMarketAdvice(tickMap, analysisType, barrier).map(({ symbol, advice, ticks: tc }, idx) => {
                  const info = VOLATILITY_MARKETS.find(m => m.symbol === symbol);
                  return (
                    <motion.div key={symbol} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}>
                      <AdviceCard advice={advice} market={`${info?.label} — ${info?.name} (${tc} ticks)`} />
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── SINGLE MARKET ── */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* LEFT — 8 cols */}
              <div className="lg:col-span-8 flex flex-col gap-5">
                {analysis && <AdviceCard advice={analysis.advice} />}

                {/* ── ALL TRADE TYPE SIGNALS ── */}
                <div className="glass-card rounded-2xl border border-white/5 p-4 space-y-4">
                  <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" /> All Trade Type Signals — Live
                  </div>
                  {TRADE_CATEGORIES.map(cat => {
                    const catSignals = allSignals.filter(s => s.category === cat.id);
                    const buyCount = catSignals.filter(s => s.advice.action === "BUY").length;
                    return (
                      <div key={cat.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{cat.label}</span>
                          {buyCount > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                              {buyCount} BUY
                            </span>
                          )}
                          <div className="flex-1 h-px bg-white/5" />
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                          {catSignals.map(({ type, label, advice }) => {
                            const isBuy   = advice.action === "BUY";
                            const isAvoid = advice.action === "AVOID";
                            const isActive = analysisType === type;
                            return (
                              <button
                                key={type}
                                onClick={() => setAnalysisType(type)}
                                className={`rounded-xl border p-2.5 text-left transition-all hover:scale-[1.01] ${isBuy ? "border-green-500/30 bg-green-500/10" : isAvoid ? "border-red-500/20 bg-red-500/5" : "border-white/5 bg-white/[0.02]"} ${isActive ? "ring-1 ring-primary/50" : ""}`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs font-bold text-white">{label}</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${isBuy ? "text-green-400 bg-green-500/20 border-green-500/30" : isAvoid ? "text-red-400 bg-red-500/20 border-red-500/30" : "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"}`}>
                                    {advice.action}
                                  </span>
                                </div>
                                <div className="flex items-end justify-between">
                                  <span className={`text-lg font-black ${isBuy ? "text-green-400" : isAvoid ? "text-red-400" : "text-yellow-400"}`}>
                                    {advice.probability}%
                                  </span>
                                </div>
                                <div className="mt-1 h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ${isBuy ? "bg-green-400" : isAvoid ? "bg-red-400" : "bg-yellow-400"}`}
                                    style={{ width: `${advice.probability}%` }}
                                  />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col gap-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Digit Frequency ({windowTicks.length} ticks)
                    </h3>
                    <DigitHeatmap
                      frequencies={analysis?.frequencies || Array(10).fill(0)}
                      hotDigit={analysis?.hotDigit ?? -1}
                      coldDigit={analysis?.coldDigit ?? -1}
                    />
                  </div>

                  <div className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col justify-center gap-5">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-primary">Even: {analysis?.evenPercent || 0}%</span>
                        <span className="text-secondary">Odd: {analysis?.oddPercent || 0}%</span>
                      </div>
                      <div className="h-2 w-full bg-secondary/20 rounded-full overflow-hidden flex">
                        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${analysis?.evenPercent || 50}%` }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-green-400">Over 4: {analysis?.overPercent || 0}%</span>
                        <span className="text-red-400">Under 5: {analysis?.underPercent || 0}%</span>
                      </div>
                      <div className="h-2 w-full bg-red-400/20 rounded-full overflow-hidden flex">
                        <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${analysis?.overPercent || 50}%` }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-primary flex items-center gap-1">
                          {analysis?.trendDirection === "UPTREND"
                            ? <TrendingUp className="w-3 h-3" />
                            : <TrendingDown className="w-3 h-3" />}
                          Trend
                        </span>
                        <span className={analysis?.trendDirection === "UPTREND" ? "text-green-400" : "text-red-400"}>
                          {analysis?.trendDirection || "--"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pt-1">
                      <ConfidenceMeter confidence={analysis?.confidence || 0} />
                      <div>
                        <div className="text-xs text-muted-foreground">Signal Strength</div>
                        <div className="text-xl font-black text-white">{analysis?.confidence || 0}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-5 border border-white/5">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Digit Distribution Chart</h3>
                  <div className="h-[220px] w-full">
                    <TickChart frequencies={analysis?.frequencies || Array(10).fill(0)} />
                  </div>
                </div>
              </div>

              {/* RIGHT — 4 cols */}
              <div className="lg:col-span-4 flex flex-col gap-5">
                <div className="glass-card rounded-2xl p-6 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden h-44">
                  <div className="absolute top-0 right-0 p-3 text-xs font-mono text-muted-foreground">LIVE DIGIT</div>
                  <AnimatePresence mode="popLayout">
                    {latestTick ? (
                      <motion.div
                        key={latestTick.epoch}
                        initial={{ y: 20, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: -20, opacity: 0, scale: 1.2 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className={`text-[7rem] font-black leading-none ${latestTick.lastDigit % 2 === 0 ? "text-primary" : "text-secondary"}`}
                      >
                        {latestTick.lastDigit}
                      </motion.div>
                    ) : (
                      <div className="text-[7rem] font-black leading-none text-white/10">—</div>
                    )}
                  </AnimatePresence>
                  {latestTick && (
                    <div className="absolute bottom-3 text-xs font-mono text-muted-foreground">{latestTick.quote.toFixed(2)}</div>
                  )}
                </div>

                <div className="glass-card rounded-2xl border border-white/5 overflow-hidden flex-1 flex flex-col">
                  <div className="p-4 border-b border-white/5 bg-white/[0.02] shrink-0">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Live Tick Stream
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/5 hover:bg-transparent">
                          <TableHead className="text-xs">Quote</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                          <TableHead className="text-right text-xs">Digit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <AnimatePresence initial={false}>
                          {ticks.slice(0, 25).map((tick, i) => {
                            const isEven = tick.lastDigit % 2 === 0;
                            return (
                              <motion.tr
                                key={`${tick.epoch}-${i}`}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="border-white/5 hover:bg-white/5 transition-colors"
                              >
                                <TableCell className="font-mono text-xs text-gray-300">{tick.quote.toFixed(2)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`text-[10px] py-0 h-5 ${isEven ? "text-primary border-primary/30" : "text-secondary border-secondary/30"}`}>
                                    {isEven ? "EVEN" : "ODD"}
                                  </Badge>
                                </TableCell>
                                <TableCell className={`text-right font-bold ${isEven ? "text-primary" : "text-secondary"}`}>
                                  {tick.lastDigit}
                                </TableCell>
                              </motion.tr>
                            );
                          })}
                        </AnimatePresence>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </main>
    </div>
  );
}
