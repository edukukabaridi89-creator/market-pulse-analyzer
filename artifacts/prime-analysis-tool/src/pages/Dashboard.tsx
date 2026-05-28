import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Volume2, VolumeX, TrendingUp, TrendingDown,
  AlertCircle, CheckCircle2, Clock, XCircle, ChevronDown, BarChart2, Layers
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useDerivWS, VOLATILITY_MARKETS } from "@/hooks/useDerivWS";
import { useMultiMarketWS } from "@/hooks/useMultiMarketWS";
import { useTickAnalysis, getMultiMarketAdvice, AnalysisType, TradeAdvice } from "@/hooks/useTickAnalysis";
import { Sidebar } from "@/components/Sidebar";
import { DigitHeatmap } from "@/components/DigitHeatmap";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { TickChart } from "@/components/TickChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const ANALYSIS_TYPES: { type: AnalysisType; label: string; hasBarrier: boolean; barrierLabel: string }[] = [
  { type: "even",    label: "Even",    hasBarrier: false, barrierLabel: "" },
  { type: "odd",     label: "Odd",     hasBarrier: false, barrierLabel: "" },
  { type: "over",    label: "Over",    hasBarrier: true,  barrierLabel: "Barrier" },
  { type: "under",   label: "Under",   hasBarrier: true,  barrierLabel: "Barrier" },
  { type: "matches", label: "Matches", hasBarrier: true,  barrierLabel: "Digit" },
  { type: "differs", label: "Differs", hasBarrier: true,  barrierLabel: "Digit" },
];

function ActionBadge({ action }: { action: TradeAdvice["action"] }) {
  if (action === "BUY") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
      <CheckCircle2 className="w-3 h-3" /> BUY
    </span>
  );
  if (action === "AVOID") return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
      <XCircle className="w-3 h-3" /> AVOID
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
      <Clock className="w-3 h-3" /> WAIT
    </span>
  );
}

function AdviceCard({ advice, market }: { advice: TradeAdvice; market?: string }) {
  const borderColor =
    advice.action === "BUY" ? "border-green-500/30" :
    advice.action === "AVOID" ? "border-red-500/30" :
    "border-yellow-500/20";
  const glowColor =
    advice.action === "BUY" ? "bg-green-500/10" :
    advice.action === "AVOID" ? "bg-red-500/10" :
    "bg-yellow-500/5";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card rounded-2xl p-6 border ${borderColor} relative overflow-hidden`}
    >
      <div className={`absolute inset-0 ${glowColor} pointer-events-none`} />
      <div className="relative z-10">
        {market && (
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">{market}</div>
        )}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ActionBadge action={advice.action} />
              <span className="text-xs font-mono text-muted-foreground">{advice.contractType}</span>
            </div>
            <div className="text-2xl font-black text-white mt-2">{advice.label}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-black text-white">{advice.probability}%</div>
            <div className="text-xs text-muted-foreground">probability</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                advice.action === "BUY" ? "bg-green-400" :
                advice.action === "AVOID" ? "bg-red-400" : "bg-yellow-400"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${advice.probability}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <div className="text-muted-foreground mb-1">Confidence</div>
              <div className={`font-bold ${
                advice.confidence === "VERY HIGH" ? "text-green-400" :
                advice.confidence === "HIGH" ? "text-primary" :
                advice.confidence === "MEDIUM" ? "text-yellow-400" : "text-red-400"
              }`}>{advice.confidence}</div>
            </div>
            <div className="bg-white/[0.03] rounded-lg p-2.5">
              <div className="text-muted-foreground mb-1">Risk Level</div>
              <div className={`font-bold ${
                advice.risk === "Low" ? "text-green-400" :
                advice.risk === "Medium" ? "text-yellow-400" : "text-red-400"
              }`}>{advice.risk}</div>
            </div>
          </div>

          <div className="bg-white/[0.03] rounded-lg p-3">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Analysis</div>
            <p className="text-sm text-gray-300 leading-relaxed">{advice.reason}</p>
          </div>

          <div className={`rounded-lg p-3 border ${
            advice.action === "BUY" ? "bg-green-500/10 border-green-500/20" :
            advice.action === "AVOID" ? "bg-red-500/10 border-red-500/20" :
            "bg-yellow-500/10 border-yellow-500/20"
          }`}>
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Recommended Action</div>
            <p className={`text-sm font-medium leading-relaxed ${
              advice.action === "BUY" ? "text-green-300" :
              advice.action === "AVOID" ? "text-red-300" : "text-yellow-300"
            }`}>{advice.entry}</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MultiMarketGrid({
  tickMap,
  analysisType,
  barrier,
}: {
  tickMap: Record<string, import("../hooks/useDerivWS").Tick[]>;
  analysisType: AnalysisType;
  barrier: number;
}) {
  const results = getMultiMarketAdvice(tickMap, analysisType, barrier);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono uppercase tracking-wider">
        <Layers className="w-4 h-4" />
        All Markets — {ANALYSIS_TYPES.find(t => t.type === analysisType)?.label} Analysis
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {results.map(({ symbol, advice, ticks: tickCount }) => {
          const marketInfo = VOLATILITY_MARKETS.find(m => m.symbol === symbol);
          return (
            <motion.div
              key={symbol}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: results.indexOf(results.find(r => r.symbol === symbol)!) * 0.05 }}
            >
              <AdviceCard
                advice={advice}
                market={`${marketInfo?.label || symbol} — ${marketInfo?.name || symbol} (${tickCount} ticks)`}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  const [selectedMarket, setSelectedMarket] = useState("R_100");
  const [allMarketsMode, setAllMarketsMode] = useState(false);
  const [analysisType, setAnalysisType] = useState<AnalysisType>("even");
  const [barrier, setBarrier] = useState(4);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const { ticks, isConnected: singleConnected } = useDerivWS(selectedMarket, !allMarketsMode);
  const { tickMap, isConnected: multiConnected } = useMultiMarketWS(allMarketsMode);

  const isConnected = allMarketsMode ? multiConnected : singleConnected;
  const analysis = useTickAnalysis(ticks, analysisType, barrier);

  const activeAnalysisConfig = ANALYSIS_TYPES.find(t => t.type === analysisType)!;
  const selectedMarketInfo = VOLATILITY_MARKETS.find(m => m.symbol === selectedMarket);

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
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 glass-card shrink-0 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold">
              {allMarketsMode ? "All Markets Analysis" : (selectedMarketInfo?.name || selectedMarket)}
            </h2>
            <Badge
              variant="outline"
              className={`font-mono text-xs ${isConnected ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-red-400 border-red-400/30 bg-red-400/10"}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
              {isConnected ? "LIVE" : "DISCONNECTED"}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full w-9 h-9 border-white/10"
              onClick={() => setSoundEnabled(!soundEnabled)}
              data-testid="button-sound-toggle"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
            </Button>
          </div>
        </header>

        <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-[1600px] mx-auto w-full">

          {/* ── CONTROL STRIP ─────────────────────────────────────── */}
          <div className="glass-card rounded-2xl border border-white/5 p-4 space-y-4">

            {/* Row 1: Market selector */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider shrink-0">Market</span>

              {/* All Markets toggle */}
              <button
                onClick={() => setAllMarketsMode(!allMarketsMode)}
                data-testid="button-all-markets"
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  allMarketsMode
                    ? "bg-secondary/20 border-secondary/50 text-secondary shadow-[0_0_16px_rgba(123,47,247,0.3)]"
                    : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Analyze All Markets
              </button>

              <div className="w-px h-5 bg-white/10" />

              {/* Market pills (desktop) */}
              <div className="hidden lg:flex flex-wrap gap-2">
                {VOLATILITY_MARKETS.map(m => (
                  <button
                    key={m.symbol}
                    onClick={() => { setSelectedMarket(m.symbol); setAllMarketsMode(false); }}
                    data-testid={`button-market-${m.symbol}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                      !allMarketsMode && selectedMarket === m.symbol
                        ? "bg-primary/20 border-primary/50 text-primary shadow-[0_0_12px_rgba(0,114,255,0.25)]"
                        : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Market dropdown (mobile) */}
              <div className="relative lg:hidden">
                <button
                  onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                  disabled={allMarketsMode}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border border-primary/50 bg-primary/20 text-primary"
                  data-testid="button-market-dropdown"
                >
                  {selectedMarketInfo?.label}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showMarketDropdown && (
                  <div className="absolute top-10 left-0 z-50 glass-card border border-white/10 rounded-xl p-2 min-w-[160px] space-y-1">
                    {VOLATILITY_MARKETS.map(m => (
                      <button
                        key={m.symbol}
                        onClick={() => { setSelectedMarket(m.symbol); setAllMarketsMode(false); setShowMarketDropdown(false); }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${
                          selectedMarket === m.symbol ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white hover:bg-white/5"
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

              {/* Barrier/digit selector */}
              {activeAnalysisConfig.hasBarrier && (
                <div className="flex items-center gap-2 ml-2">
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

          {/* ── ALL MARKETS MODE ──────────────────────────────────── */}
          {allMarketsMode ? (
            <MultiMarketGrid
              tickMap={tickMap}
              analysisType={analysisType}
              barrier={barrier}
            />
          ) : (
            /* ── SINGLE MARKET DASHBOARD ──────────────────────────── */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* LEFT — 8 cols */}
              <div className="lg:col-span-8 flex flex-col gap-5">

                {/* Trade Advice Card */}
                {analysis && <AdviceCard advice={analysis.advice} />}

                {/* Analysis Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Heatmap */}
                  <div className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col gap-4">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Digit Frequency Matrix (last {analysis?.n100 || 0} ticks)
                    </h3>
                    <DigitHeatmap
                      frequencies={analysis?.frequencies || Array(10).fill(0)}
                      hotDigit={analysis?.hotDigit ?? -1}
                      coldDigit={analysis?.coldDigit ?? -1}
                    />
                  </div>

                  {/* Distributions */}
                  <div className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col justify-center gap-5">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-primary">Even: {analysis?.evenPercent || 0}%</span>
                        <span className="text-secondary">Odd: {analysis?.oddPercent || 0}%</span>
                      </div>
                      <div className="h-2 w-full bg-secondary/20 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${analysis?.evenPercent || 50}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-green-400">Over 4: {analysis?.overPercent || 0}%</span>
                        <span className="text-red-400">Under 5: {analysis?.underPercent || 0}%</span>
                      </div>
                      <div className="h-2 w-full bg-red-400/20 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-green-400 transition-all duration-500"
                          style={{ width: `${analysis?.overPercent || 50}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-primary">
                          {analysis?.trendDirection === "UPTREND" ? <TrendingUp className="inline w-3 h-3 mr-1" /> : <TrendingDown className="inline w-3 h-3 mr-1" />}
                          Trend
                        </span>
                        <span className={analysis?.trendDirection === "UPTREND" ? "text-green-400" : "text-red-400"}>
                          {analysis?.trendDirection || "--"}
                        </span>
                      </div>
                    </div>

                    {/* Confidence */}
                    <div className="flex items-center gap-4 pt-1">
                      <ConfidenceMeter confidence={analysis?.confidence || 0} />
                      <div>
                        <div className="text-xs text-muted-foreground">Signal Strength</div>
                        <div className="text-lg font-bold text-white">{analysis?.confidence || 0}%</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart */}
                <div className="glass-card rounded-2xl p-5 border border-white/5">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Digit Distribution Chart</h3>
                  <div className="h-[220px] w-full">
                    <TickChart frequencies={analysis?.frequencies || Array(10).fill(0)} />
                  </div>
                </div>
              </div>

              {/* RIGHT — 4 cols */}
              <div className="lg:col-span-4 flex flex-col gap-5">

                {/* Live Digit */}
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
                    <div className="absolute bottom-3 text-xs font-mono text-muted-foreground">
                      {latestTick.quote.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Tick Stream */}
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
                                <TableCell className="font-mono text-xs text-gray-300">
                                  {tick.quote.toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] py-0 h-5 ${isEven ? "text-primary border-primary/30" : "text-secondary border-secondary/30"}`}
                                  >
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
