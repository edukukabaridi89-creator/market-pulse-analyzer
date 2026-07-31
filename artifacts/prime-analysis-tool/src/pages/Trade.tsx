import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, Activity, CheckCircle2, XCircle, Clock,
  Zap, LogIn, ShieldCheck, Hash, TrendingUp, ArrowUpDown,
  Target, BoxSelect, Layers,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useTick } from "@/contexts/TickContext";
import { useDerivAuth } from "@/contexts/DerivAuthContext";
import {
  useDerivTrading,
  analysisTypeToContract,
  contractTypeLabel,
  TradeResult,
  BuyParams,
} from "@/hooks/useDerivTrading";
import {
  useTickAnalysis,
  ANALYSIS_TYPES,
  TRADE_CATEGORIES,
  TradeCategory,
  generateAllTypeAdvice,
} from "@/hooks/useTickAnalysis";
import { VOLATILITY_MARKETS } from "@/hooks/useDerivWS";
import { Sidebar } from "@/components/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tick } from "@/hooks/useDerivWS";

const STAKE_PRESETS = [0.35, 1, 2, 5, 10, 25, 50];
const DURATION_PRESETS = [
  { value: 5,  unit: "t" as const, label: "5 ticks" },
  { value: 10, unit: "t" as const, label: "10 ticks" },
  { value: 15, unit: "t" as const, label: "15 ticks" },
  { value: 1,  unit: "m" as const, label: "1 min" },
  { value: 3,  unit: "m" as const, label: "3 min" },
  { value: 5,  unit: "m" as const, label: "5 min" },
];
const MULTIPLIER_PRESETS = [10, 20, 30, 50, 100, 200];

const CATEGORY_ICONS: Record<TradeCategory, typeof Hash> = {
  digits:       Hash,
  rise_fall:    TrendingUp,
  higher_lower: ArrowUpDown,
  touch:        Target,
  ends:         BoxSelect,
  multipliers:  Layers,
};

function StatusIcon({ status }: { status: TradeResult["status"] }) {
  if (status === "won")  return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (status === "lost") return <XCircle className="w-4 h-4 text-red-400" />;
  return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
}

function computeAutoBarrier(ticks: Tick[], type: string): { barrier?: string; barrier2?: string } {
  if (ticks.length < 5) return {};
  const prices = ticks.slice(0, 20).map(t => t.quote);
  const avg = prices.reduce((a, b) => a + b) / prices.length;
  const stdDev = Math.sqrt(prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / prices.length);
  const sigma = stdDev.toFixed(5);
  const sigmaLg = (stdDev * 1.5).toFixed(5);
  switch (type) {
    case "higher":   return { barrier: `+${sigma}` };
    case "lower":    return { barrier: `-${sigma}` };
    case "touch":
    case "no_touch": return { barrier: `+${sigmaLg}` };
    case "ends_in":
    case "ends_out": return { barrier: `+${sigmaLg}`, barrier2: `-${sigmaLg}` };
    default:         return {};
  }
}

export default function Trade() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const {
    ticks, isConnected, market, setMarket,
    analysisType, setAnalysisType, barrier, setBarrier,
    filterTicks, marketInfo,
  } = useTick();
  const { derivToken, account, isDerivAuthed, isAuthorizing, loginWithDeriv, setBalance, appId } = useDerivAuth();
  const { trades, isBuying, buyContract, totalProfit } = useDerivTrading(derivToken, setBalance);

  const [activeCategory, setActiveCategory] = useState<TradeCategory>("digits");
  const [stake, setStake] = useState(1);
  const [customStake, setCustomStake] = useState("");
  const [durationIdx, setDurationIdx] = useState(0);
  const [multiplier, setMultiplier] = useState(10);

  const windowTicks = filterTicks(ticks);
  const analysis = useTickAnalysis(windowTicks, analysisType, barrier);
  const { contractType, barrier: contractBarrier } = analysisTypeToContract(analysisType, barrier);
  const activeConfig = ANALYSIS_TYPES.find(t => t.type === analysisType)!;
  const categoryTypes = ANALYSIS_TYPES.filter(t => t.category === activeCategory);

  const allSignals = useMemo(
    () => generateAllTypeAdvice(windowTicks, analysis?.hotDigit ?? 0),
    [windowTicks, analysis?.hotDigit]
  );
  const categorySignals = allSignals.filter(s => s.category === activeCategory);

  const autoBarriers = useMemo(
    () => computeAutoBarrier(ticks, analysisType),
    [ticks, analysisType]
  );

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [user, isLoading, setLocation]);

  // When switching category, auto-select first type in that category
  useEffect(() => {
    const first = ANALYSIS_TYPES.find(t => t.category === activeCategory);
    if (first) setAnalysisType(first.type);
  }, [activeCategory, setAnalysisType]);

  if (isLoading || !user) return null;

  const effectiveStake = customStake ? parseFloat(customStake) || 0 : stake;
  const isMultiplier = activeCategory === "multipliers";
  const estimatedPayout = isMultiplier
    ? `${multiplier}x leverage`
    : `~${(effectiveStake * 1.95).toFixed(2)} ${account?.currency ?? "USD"}`;

  const handleBuy = () => {
    if (!isDerivAuthed || !account) { toast.error("Login with Deriv first"); return; }
    if (effectiveStake < 0.35) { toast.error("Minimum stake is 0.35"); return; }

    const duration = DURATION_PRESETS[durationIdx];
    const params: BuyParams = {
      contractType,
      symbol: market,
      stake: effectiveStake,
      currency: account.currency,
      duration: duration.value,
      durationUnit: duration.unit,
    };

    // Digits use 1-tick duration
    if (activeCategory === "digits") {
      params.duration = 1;
      params.durationUnit = "t";
      if (contractBarrier !== undefined) params.barrier = contractBarrier;
    } else if (isMultiplier) {
      delete params.duration;
      delete params.durationUnit;
      params.multiplier = multiplier;
    } else {
      // Higher/Lower/Touch/Ends — auto-computed barriers
      if (autoBarriers.barrier)  params.barrier  = autoBarriers.barrier;
      if (autoBarriers.barrier2) params.barrier2 = autoBarriers.barrier2;
    }

    buyContract(params);
  };

  const signalColor = analysis?.advice.action === "BUY" ? "text-green-400"
    : analysis?.advice.action === "AVOID" ? "text-red-400" : "text-yellow-400";
  const signalBg = analysis?.advice.action === "BUY" ? "border-green-500/30 bg-green-500/10"
    : analysis?.advice.action === "AVOID" ? "border-red-500/30 bg-red-500/10" : "border-yellow-500/20 bg-yellow-500/5";

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      <Sidebar className="hidden md:flex" />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* Header */}
        <header className="h-16 border-b border-white/5 glass-card shrink-0 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold">Live Trading</h2>
            <Badge variant="outline" className={`font-mono text-xs ${isConnected ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-red-400 border-red-400/30 bg-red-400/10"}`}>
              <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
              {isConnected ? "LIVE" : "DISCONNECTED"}
            </Badge>
          </div>
          {isDerivAuthed && account ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">{account.loginid}</div>
                <div className="text-sm font-black text-white">
                  {account.balance.toFixed(2)} <span className="text-primary text-xs">{account.currency}</span>
                </div>
              </div>
              {account.isVirtual && <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">DEMO</Badge>}
            </div>
          ) : (
            <Button size="sm" onClick={loginWithDeriv} disabled={isAuthorizing} className="bg-primary hover:bg-primary/80 gap-2">
              <LogIn className="w-3.5 h-3.5" />
              {isAuthorizing ? "Authorizing..." : "Login with Deriv"}
            </Button>
          )}
        </header>

        <div className="p-4 md:p-6 max-w-[1200px] mx-auto w-full space-y-5">

          {/* Not connected to Deriv */}
          {!isDerivAuthed && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl border border-primary/20 p-8 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Connect Your Deriv Account</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Authorize with Deriv to place real trades across all contract types directly from the analysis signals.
                </p>
              </div>
              <Button size="lg" onClick={loginWithDeriv} disabled={isAuthorizing} className="bg-primary hover:bg-primary/80 gap-2 px-8">
                <LogIn className="w-4 h-4" />
                {isAuthorizing ? "Authorizing..." : "Login with Deriv"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Redirect URL to register in your Deriv app ({appId}):{" "}
                <span className="text-white font-mono">
                  {window.location.origin}{import.meta.env.BASE_URL?.replace(/\/$/, "")}/callback
                </span>
              </p>
            </motion.div>
          )}

          {isDerivAuthed && account && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* LEFT — trade form */}
              <div className="lg:col-span-5 flex flex-col gap-4">

                {/* P&L bar */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Balance", value: `${account.balance.toFixed(2)} ${account.currency}`, color: "text-white" },
                    { label: "Session P&L", value: `${totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}`, color: totalProfit >= 0 ? "text-green-400" : "text-red-400" },
                    { label: "Trades", value: trades.length, color: "text-primary" },
                  ].map(s => (
                    <div key={s.label} className="glass-card rounded-xl border border-white/5 p-3 text-center">
                      <div className="text-xs text-muted-foreground mb-0.5">{s.label}</div>
                      <div className={`text-sm font-black ${s.color}`}>{s.value}</div>
                    </div>
                  ))}
                </div>

                <div className="glass-card rounded-2xl border border-white/5 p-4 space-y-4">

                  {/* Market */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Market</label>
                    <div className="flex flex-wrap gap-1.5">
                      {VOLATILITY_MARKETS.map(m => (
                        <button key={m.symbol} onClick={() => setMarket(m.symbol)}
                          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all border ${market === m.symbol ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:text-white"}`}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Category tabs */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Trade Type</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {TRADE_CATEGORIES.map(cat => {
                        const Icon = CATEGORY_ICONS[cat.id];
                        const isActive = activeCategory === cat.id;
                        // Best signal in this category
                        const catSignals = allSignals.filter(s => s.category === cat.id);
                        const hasBuy = catSignals.some(s => s.advice.action === "BUY");
                        return (
                          <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-bold transition-all ${isActive ? "bg-primary/20 border-primary/40 text-primary" : "border-white/8 text-muted-foreground hover:text-white hover:border-white/20"}`}>
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{cat.label}</span>
                            {hasBuy && <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{TRADE_CATEGORIES.find(c => c.id === activeCategory)?.desc}</p>
                  </div>

                  {/* Signal cards for active category */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Select Contract — Live Signal</label>
                    <div className="grid grid-cols-2 gap-2">
                      {categorySignals.map(({ type, label, advice }) => {
                        const cfg = ANALYSIS_TYPES.find(a => a.type === type)!;
                        const autoBarrierForType = cfg.hasBarrier
                          ? (type === "matches" || type === "differs" ? analysis?.hotDigit ?? 0 : type === "over" ? 4 : 5)
                          : undefined;
                        const isBuy   = advice.action === "BUY";
                        const isAvoid = advice.action === "AVOID";
                        const isActive = analysisType === type;
                        return (
                          <button key={type}
                            onClick={() => { setAnalysisType(type); if (autoBarrierForType !== undefined) setBarrier(autoBarrierForType); }}
                            className={`rounded-xl border p-2.5 text-left transition-all hover:scale-[1.01] ${isBuy ? "bg-green-500/10" : isAvoid ? "bg-red-500/5" : "bg-white/[0.02]"} ${isActive ? "ring-2 ring-primary/60 border-primary/40" : "border-white/8"}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-bold text-white">{label}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${isBuy ? "text-green-400 bg-green-500/20 border-green-500/30" : isAvoid ? "text-red-400 bg-red-500/20 border-red-500/30" : "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"}`}>
                                {advice.action}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className={`text-lg font-black ${isBuy ? "text-green-400" : isAvoid ? "text-red-400" : "text-yellow-400"}`}>
                                {advice.probability}%
                              </span>
                              {autoBarrierForType !== undefined && (
                                <span className="text-[10px] text-muted-foreground font-mono">{cfg.barrierLabel} {autoBarrierForType}</span>
                              )}
                            </div>
                            <div className="mt-1 h-0.5 w-full bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-700 ${isBuy ? "bg-green-400" : isAvoid ? "bg-red-400" : "bg-yellow-400"}`} style={{ width: `${advice.probability}%` }} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Category-specific settings */}
                  {activeCategory === "digits" && activeConfig.hasBarrier && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{activeConfig.barrierLabel}:</span>
                      <div className="flex gap-1 flex-wrap">
                        {Array.from({ length: 10 }, (_, i) => (
                          <button key={i} onClick={() => setBarrier(i)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${barrier === i ? "bg-secondary/30 border border-secondary/60 text-secondary" : "bg-white/5 border border-white/10 text-muted-foreground hover:text-white"}`}>
                            {i}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(activeCategory === "rise_fall" || activeCategory === "higher_lower" || activeCategory === "touch" || activeCategory === "ends") && (
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider">Duration</label>
                      <div className="flex flex-wrap gap-1.5">
                        {DURATION_PRESETS.map((d, idx) => (
                          <button key={idx} onClick={() => setDurationIdx(idx)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${durationIdx === idx ? "bg-secondary/20 border-secondary/50 text-secondary" : "border-white/10 text-muted-foreground hover:text-white"}`}>
                            {d.label}
                          </button>
                        ))}
                      </div>
                      {(activeCategory === "higher_lower" || activeCategory === "touch" || activeCategory === "ends") && ticks[0] && (
                        <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2 text-xs space-y-0.5">
                          <div className="text-muted-foreground">Auto-computed barriers (based on recent volatility):</div>
                          <div className="text-white font-mono">
                            {autoBarriers.barrier && <span>Upper: {autoBarriers.barrier}</span>}
                            {autoBarriers.barrier2 && <span className="ml-3">Lower: {autoBarriers.barrier2}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {isMultiplier && (
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider">Multiplier</label>
                      <div className="flex flex-wrap gap-1.5">
                        {MULTIPLIER_PRESETS.map(m => (
                          <button key={m} onClick={() => setMultiplier(m)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${multiplier === m ? "bg-secondary/20 border-secondary/50 text-secondary" : "border-white/10 text-muted-foreground hover:text-white"}`}>
                            {m}×
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">Multiplier contracts stay open until sold or stopped out. Always set a stop loss in Deriv.</p>
                    </div>
                  )}

                  {/* Stake */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Stake ({account.currency})</label>
                    <div className="flex flex-wrap gap-1.5">
                      {STAKE_PRESETS.map(p => (
                        <button key={p} onClick={() => { setStake(p); setCustomStake(""); }}
                          className={`px-2.5 py-1.5 rounded-full text-xs font-bold transition-all border ${stake === p && !customStake ? "bg-secondary/20 border-secondary/50 text-secondary" : "border-white/10 text-muted-foreground hover:text-white"}`}>
                          {p}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" min="0.35" step="0.01" placeholder="Custom amount"
                        value={customStake} onChange={e => setCustomStake(e.target.value)}
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50" />
                      <span className="text-xs text-muted-foreground">{account.currency}</span>
                    </div>
                  </div>

                  {/* Trade summary */}
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs space-y-1.5">
                    {[
                      ["Contract",  contractTypeLabel(contractType, contractBarrier)],
                      ["Market",    marketInfo?.label ?? market],
                      ["Stake",     `${effectiveStake.toFixed(2)} ${account.currency}`],
                      ["Est. payout", estimatedPayout],
                      ...(!isMultiplier ? [["Duration", `${DURATION_PRESETS[durationIdx].label}`]] as [string, string][] : []),
                      ...(isMultiplier   ? [["Multiplier", `${multiplier}×`]] as [string, string][] : []),
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="text-white font-semibold">{v}</span>
                      </div>
                    ))}
                  </div>

                  {/* Buy button */}
                  <Button size="lg"
                    className="w-full bg-green-500 hover:bg-green-400 text-black font-black text-base gap-2 h-14 shadow-[0_0_24px_rgba(34,197,94,0.4)]"
                    onClick={handleBuy}
                    disabled={isBuying || effectiveStake < 0.35}
                    data-testid="button-place-trade">
                    <Zap className="w-5 h-5" />
                    {isBuying ? "Placing..." : `BUY ${contractTypeLabel(contractType, contractBarrier).toUpperCase()}`}
                  </Button>

                  <p className="text-[10px] text-muted-foreground text-center">Trading involves risk. Signals are probability-based, not guaranteed. Never trade more than you can afford to lose.</p>
                </div>
              </div>

              {/* RIGHT — signal + history */}
              <div className="lg:col-span-7 flex flex-col gap-5">

                {/* Current signal */}
                <div className={`glass-card rounded-2xl p-5 border ${signalBg} space-y-3`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5" /> Live Signal — {marketInfo?.label}
                      </div>
                      <div className={`text-3xl font-black ${signalColor}`}>
                        {analysis?.advice.label || "ANALYZING..."}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-white">{analysis?.advice.probability ?? 0}%</div>
                      <div className="text-xs text-muted-foreground">probability</div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300">{analysis?.advice.reason}</p>
                  <div className={`rounded-lg p-3 text-sm font-medium ${signalColor} bg-white/[0.03]`}>
                    {analysis?.advice.entry}
                  </div>
                  <div className="flex items-center gap-4 pt-1">
                    <div className="text-xs text-muted-foreground">Last digit:</div>
                    <AnimatePresence mode="wait">
                      {ticks[0] && (
                        <motion.span key={ticks[0].epoch} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }}
                          className={`text-4xl font-black ${ticks[0].lastDigit % 2 === 0 ? "text-primary" : "text-secondary"}`}>
                          {ticks[0].lastDigit}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">Signal strength</div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${analysis?.confidence ?? 0}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trade history */}
                <div className="glass-card rounded-2xl border border-white/5 overflow-hidden flex-1">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <DollarSign className="w-4 h-4" /> Trade History
                    </h3>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-green-400">{trades.filter(t => t.status === "won").length}W</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-red-400">{trades.filter(t => t.status === "lost").length}L</span>
                    </div>
                  </div>
                  <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
                    <AnimatePresence initial={false}>
                      {trades.map(trade => (
                        <motion.div key={trade.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors">
                          <StatusIcon status={trade.status} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white truncate">
                              {contractTypeLabel(trade.contractType, trade.barrier)}
                              <span className="text-xs text-muted-foreground ml-2">{trade.symbol}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Stake: {trade.buyPrice.toFixed(2)} · Payout: {trade.payout.toFixed(2)}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            {trade.profit !== null ? (
                              <div className={`text-sm font-black ${trade.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {trade.profit >= 0 ? "+" : ""}{trade.profit.toFixed(2)}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/30">OPEN</Badge>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {trades.length === 0 && (
                      <div className="p-10 text-center text-muted-foreground text-sm">No trades yet. Place your first trade above.</div>
                    )}
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
