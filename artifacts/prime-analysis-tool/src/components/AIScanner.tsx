import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Scan, X, Play, Square, Wallet, Settings2, Zap,
  TrendingUp, RefreshCw, ExternalLink, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMultiMarketAdvice, ANALYSIS_TYPES } from "@/hooks/useTickAnalysis";
import { analysisTypeToContract, BuyParams, TradeResult } from "@/hooks/useDerivTrading";
import { VOLATILITY_MARKETS, Tick } from "@/hooks/useDerivWS";
import type { DerivAccount } from "@/contexts/DerivAuthContext";

type ScanPhase = "config" | "scanning" | "ready" | "trading";

interface AIScannerProps {
  tickMap: Record<string, Tick[]>;
  isDerivAuthed: boolean;
  account: DerivAccount | null;
  loginWithDeriv: () => void;
  buyContract: (params: BuyParams) => Promise<void>;
  trades: TradeResult[];
  isBuying: boolean;
  barrier: number;
}

export function AIScanner({
  tickMap, isDerivAuthed, account,
  loginWithDeriv, buyContract, trades, isBuying, barrier,
}: AIScannerProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<ScanPhase>("config");
  const [tradeType, setTradeType] = useState("even");
  const [initialStake, setInitialStake] = useState("1");
  const [martingale, setMartingale] = useState("2.2");
  const [bestMarket, setBestMarket] = useState<{ symbol: string; label: string; name: string; probability: number } | null>(null);
  const [currentStake, setCurrentStake] = useState(1);
  const [session, setSession] = useState({ wins: 0, losses: 0, pnl: 0 });
  const [statusMsg, setStatusMsg] = useState("");

  const autoRef = useRef({
    active: false,
    currentStake: 1,
    initialStake: 1,
    martingale: 2.2,
    lastTradeId: "",
    bestSymbol: "",
    tradeType: "even",
    currency: "USD",
    barrier: 4,
  });

  const prevTradesRef = useRef<TradeResult[]>([]);

  // ── Watch trade resolutions ──
  useEffect(() => {
    if (!autoRef.current.active) return;

    const prev = prevTradesRef.current;

    // Detect a newly added trade (buy confirmed) → record its ID
    if (trades.length > prev.length) {
      autoRef.current.lastTradeId = trades[0].id;
    }

    // Detect when the tracked trade resolves
    const resolved = trades.find(t =>
      t.id === autoRef.current.lastTradeId &&
      (t.status === "won" || t.status === "lost")
    );
    const prevResolved = prev.find(p => p.id === autoRef.current.lastTradeId);

    if (resolved && prevResolved && prevResolved.status === "open") {
      const won = resolved.status === "won";
      const profit = resolved.profit ?? 0;

      setSession(s => ({
        wins: s.wins + (won ? 1 : 0),
        losses: s.losses + (won ? 0 : 1),
        pnl: s.pnl + profit,
      }));

      if (won) {
        autoRef.current.currentStake = autoRef.current.initialStake;
        setStatusMsg("✅ Win! Stake reset.");
      } else {
        const next = parseFloat(
          (autoRef.current.currentStake * autoRef.current.martingale).toFixed(2)
        );
        autoRef.current.currentStake = next;
        setStatusMsg(`❌ Loss. Next stake: ${next.toFixed(2)} ${autoRef.current.currency}`);
      }

      setCurrentStake(autoRef.current.currentStake);

      // Schedule next trade
      if (autoRef.current.active) {
        setTimeout(() => {
          if (autoRef.current.active) placeTrade();
        }, 800);
      }
    }

    prevTradesRef.current = trades;
  }, [trades]);

  // ── Scan ──
  const runScan = useCallback(() => {
    setPhase("scanning");
    setTimeout(() => {
      const results = getMultiMarketAdvice(tickMap, tradeType, barrier);
      const sorted = [...results].sort((a, b) => {
        if (a.advice.action === "BUY" && b.advice.action !== "BUY") return -1;
        if (b.advice.action === "BUY" && a.advice.action !== "BUY") return 1;
        return b.advice.probability - a.advice.probability;
      });
      const top = sorted[0];
      if (top) {
        const info = VOLATILITY_MARKETS.find(m => m.symbol === top.symbol);
        setBestMarket({
          symbol: top.symbol,
          label: info?.label ?? top.symbol,
          name: info?.name ?? "",
          probability: top.advice.probability,
        });
        autoRef.current.bestSymbol = top.symbol;
      }
      setPhase("ready");
    }, 2800);
  }, [tickMap, tradeType, barrier]);

  // ── Place one trade ──
  const placeTrade = useCallback(async () => {
    if (!autoRef.current.active || !autoRef.current.bestSymbol) return;
    const { contractType, barrier: barrierStr } = analysisTypeToContract(
      autoRef.current.tradeType,
      autoRef.current.barrier
    );
    const isMultiplier = contractType === "MULTUP" || contractType === "MULTDOWN";
    setStatusMsg("⏳ Placing trade...");
    await buyContract({
      contractType,
      symbol: autoRef.current.bestSymbol,
      stake: autoRef.current.currentStake,
      currency: autoRef.current.currency,
      barrier: barrierStr,
      duration: isMultiplier ? undefined : 5,
      durationUnit: isMultiplier ? undefined : "t",
      multiplier: isMultiplier ? 10 : undefined,
    });
    setStatusMsg("🔄 Waiting for result...");
  }, [buyContract]);

  // ── Start auto-trading ──
  const startTrading = useCallback(async () => {
    const stake = parseFloat(initialStake);
    const mg = parseFloat(martingale);
    if (isNaN(stake) || isNaN(mg) || stake <= 0 || mg <= 1) return;

    autoRef.current = {
      active: true,
      currentStake: stake,
      initialStake: stake,
      martingale: mg,
      lastTradeId: "",
      bestSymbol: bestMarket?.symbol ?? "",
      tradeType,
      currency: account?.currency ?? "USD",
      barrier,
    };
    prevTradesRef.current = trades;
    setCurrentStake(stake);
    setSession({ wins: 0, losses: 0, pnl: 0 });
    setPhase("trading");
    await placeTrade();
  }, [initialStake, martingale, bestMarket, tradeType, barrier, account, trades, placeTrade]);

  // ── Stop ──
  const stopTrading = () => {
    autoRef.current.active = false;
    setPhase("ready");
    setStatusMsg("");
  };

  const typeLabelMap = Object.fromEntries(ANALYSIS_TYPES.map(a => [a.type, a.label]));

  return (
    <>
      {/* ── Floating scan button ── */}
      <button
        onClick={() => setOpen(true)}
        className="relative group"
        title="AI Market Scanner"
      >
        <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping pointer-events-none" />
        <span className="relative flex w-10 h-10 items-center justify-center rounded-full bg-primary/20 border border-primary/40 hover:bg-primary/30 transition-colors">
          <Scan className="w-4 h-4 text-primary" />
        </span>
      </button>

      {/* ── Modal ── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (phase !== "trading") setOpen(false); }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 32 }}
              transition={{ type: "spring", stiffness: 290, damping: 26 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="pointer-events-auto w-full max-w-md glass-card border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">

                {/* glow bg */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                {/* Header */}
                <div className="flex items-center justify-between mb-5 relative">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 shrink-0">
                      <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
                      <span className="relative flex w-10 h-10 items-center justify-center rounded-full bg-primary/20 border border-primary/40">
                        <Scan className="w-5 h-5 text-primary" />
                      </span>
                    </div>
                    <div>
                      <div className="text-white font-bold text-sm">AI Market Scanner</div>
                      <div className="text-[11px] text-muted-foreground">Auto-trade with martingale recovery</div>
                    </div>
                  </div>
                  {phase !== "trading" && (
                    <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  )}
                </div>

                {/* ── CONFIG ── */}
                {phase === "config" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Trade Type</label>
                      <select
                        value={tradeType}
                        onChange={e => setTradeType(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-primary/50 cursor-pointer"
                      >
                        {ANALYSIS_TYPES.map(at => (
                          <option key={at.type} value={at.type} className="bg-gray-900 text-white">
                            {at.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">Initial Stake (USD)</label>
                      <Input
                        value={initialStake}
                        onChange={e => setInitialStake(e.target.value)}
                        type="number" min="0.35" step="0.5"
                        className="bg-white/5 border-white/10 text-white font-mono h-11"
                        placeholder="1.00"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-muted-foreground block mb-1.5">
                        Martingale Multiplier
                        <span className="ml-2 text-primary font-bold">×{martingale || "2.2"}</span>
                      </label>
                      <Input
                        value={martingale}
                        onChange={e => setMartingale(e.target.value)}
                        type="number" min="1.1" max="10" step="0.1"
                        className="bg-white/5 border-white/10 text-white font-mono h-11"
                        placeholder="2.2"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        On each loss, stake is multiplied by this. Default 2.2× — recovers loss + small profit.
                      </p>
                    </div>

                    <Button
                      onClick={runScan}
                      className="w-full h-11 bg-gradient-to-r from-primary to-[#0055ff] border-none text-white font-bold"
                    >
                      <Scan className="w-4 h-4 mr-2 animate-spin" style={{ animationDuration: "3s" }} />
                      Scan All 10 Markets
                    </Button>
                  </div>
                )}

                {/* ── SCANNING ── */}
                {phase === "scanning" && (
                  <div className="py-10 flex flex-col items-center gap-5">
                    <div className="relative w-24 h-24">
                      <span className="absolute inset-0 rounded-full border-2 border-primary/15 animate-ping" />
                      <span className="absolute inset-3 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDelay: "0.4s" }} />
                      <span className="absolute inset-6 rounded-full border-2 border-primary/50 animate-ping" style={{ animationDelay: "0.8s" }} />
                      <span className="relative flex w-24 h-24 items-center justify-center rounded-full bg-primary/10">
                        <Scan className="w-9 h-9 text-primary animate-spin" style={{ animationDuration: "2.5s" }} />
                      </span>
                    </div>
                    <div className="text-center space-y-1">
                      <div className="text-white font-bold">Scanning All 10 Markets...</div>
                      <div className="text-xs text-muted-foreground">
                        Analysing <span className="text-primary">{typeLabelMap[tradeType]}</span> signals across all Volatility Indices
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {VOLATILITY_MARKETS.map((m, i) => (
                        <div
                          key={m.symbol}
                          className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                          style={{ animationDelay: `${i * 0.1}s` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── READY / TRADING ── */}
                {(phase === "ready" || phase === "trading") && bestMarket && (
                  <div className="space-y-4">

                    {/* Best market banner */}
                    <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30 relative overflow-hidden">
                      <div className="absolute -right-4 -top-4 w-16 h-16 bg-green-500/10 rounded-full blur-xl pointer-events-none" />
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-green-400" />
                        <span className="text-green-400 font-bold text-sm">Best Market Found!</span>
                      </div>
                      <div className="text-white font-black text-xl">{bestMarket.label}</div>
                      <div className="text-xs text-muted-foreground mb-3">{bestMarket.name}</div>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-green-400 rounded-full transition-all" style={{ width: `${bestMarket.probability}%` }} />
                        </div>
                        <span className="text-green-400 font-bold text-xs shrink-0">{bestMarket.probability}% confidence</span>
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        Contract: <span className="text-white font-mono">{typeLabelMap[tradeType]}</span>
                        {" · "}
                        Stake: <span className="text-white font-mono">{initialStake} {account?.currency ?? "USD"}</span>
                        {" · "}
                        Martingale: <span className="text-white font-mono">{martingale}×</span>
                      </div>
                    </div>

                    {/* Session stats */}
                    {phase === "trading" && (
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                          <div className="text-xl font-black text-green-400">{session.wins}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Wins</div>
                        </div>
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                          <div className="text-xl font-black text-red-400">{session.losses}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">Losses</div>
                        </div>
                        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                          <div className={`text-xl font-black ${session.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {session.pnl >= 0 ? "+" : ""}{session.pnl.toFixed(2)}
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">P&L</div>
                        </div>
                      </div>
                    )}

                    {/* Current stake + martingale */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <Wallet className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-muted-foreground">
                          {phase === "trading" ? "Current Stake (martingale adjusted)" : "Starting Stake"}
                        </div>
                        <div className="text-sm font-bold text-white">
                          {currentStake.toFixed(2)} {account?.currency ?? "USD"}
                        </div>
                      </div>
                      <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground">Recovery ×</div>
                        <div className="text-sm font-bold text-white">{martingale}</div>
                      </div>
                    </div>

                    {/* Status message */}
                    {phase === "trading" && statusMsg && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                        {isBuying && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />}
                        <span className="text-xs text-muted-foreground">{statusMsg}</span>
                      </div>
                    )}

                    {/* Not authed warning */}
                    {!isDerivAuthed && (
                      <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 space-y-2">
                        <p className="text-yellow-300 text-xs">Connect your Deriv account to start auto-trading</p>
                        <Button onClick={loginWithDeriv} size="sm" className="w-full bg-gradient-to-r from-primary to-[#0055ff] border-none text-white text-xs h-9">
                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Connect Deriv Account
                        </Button>
                      </div>
                    )}

                    {/* Account badge */}
                    {isDerivAuthed && account && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                        <span className="text-xs text-muted-foreground flex-1">{account.loginid}</span>
                        <span className="text-xs font-bold text-white">{account.balance?.toFixed(2)} {account.currency}</span>
                        {account.isVirtual && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">DEMO</span>}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {phase === "ready" ? (
                        <>
                          <Button
                            onClick={() => { setPhase("config"); setBestMarket(null); }}
                            variant="outline"
                            className="flex-1 border-white/10 text-muted-foreground hover:text-white text-sm h-11"
                          >
                            <Settings2 className="w-3.5 h-3.5 mr-1.5" /> Reconfigure
                          </Button>
                          <Button
                            onClick={startTrading}
                            disabled={!isDerivAuthed || isBuying}
                            className="flex-1 h-11 bg-gradient-to-r from-green-500 to-emerald-600 border-none text-white font-bold text-sm shadow-[0_0_20px_rgba(34,197,94,0.25)] hover:opacity-90 disabled:opacity-50"
                          >
                            <Play className="w-3.5 h-3.5 mr-1.5" /> Start Trading
                          </Button>
                        </>
                      ) : (
                        <div className="flex flex-col gap-2 w-full">
                          <Button
                            onClick={stopTrading}
                            className="w-full h-11 bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 font-bold text-sm"
                          >
                            <Square className="w-3.5 h-3.5 mr-1.5" /> Stop Auto-Trade
                          </Button>
                          <button
                            onClick={() => { stopTrading(); setPhase("config"); setBestMarket(null); }}
                            className="text-xs text-muted-foreground hover:text-white text-center transition-colors"
                          >
                            <RefreshCw className="w-3 h-3 inline mr-1" /> Reset & reconfigure
                          </button>
                        </div>
                      )}
                    </div>

                    {phase === "ready" && (
                      <p className="text-center text-[10px] text-muted-foreground">
                        Trading uses 5-tick contracts · Martingale doubles recovery automatically
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
