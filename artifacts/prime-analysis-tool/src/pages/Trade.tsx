import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, DollarSign, Activity, CheckCircle2,
  XCircle, Clock, Zap, LogIn, ShieldCheck,
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
} from "@/hooks/useDerivTrading";
import { useTickAnalysis, ANALYSIS_TYPES } from "@/hooks/useTickAnalysis";
import { VOLATILITY_MARKETS } from "@/hooks/useDerivWS";
import { Sidebar } from "@/components/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STAKE_PRESETS = [0.35, 1, 2, 5, 10, 25, 50];

function StatusIcon({ status }: { status: TradeResult["status"] }) {
  if (status === "won")  return <CheckCircle2 className="w-4 h-4 text-green-400" />;
  if (status === "lost") return <XCircle className="w-4 h-4 text-red-400" />;
  return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />;
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
  const { trades, isBuying, buyContract, totalProfit } = useDerivTrading(
    derivToken,
    setBalance
  );

  const [stake, setStake] = useState(1);
  const [customStake, setCustomStake] = useState("");

  const windowTicks = filterTicks(ticks);
  const analysis = useTickAnalysis(windowTicks, analysisType, barrier);
  const { contractType, barrier: contractBarrier } = analysisTypeToContract(analysisType, barrier);
  const activeConfig = ANALYSIS_TYPES.find(t => t.type === analysisType)!;

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [user, isLoading, setLocation]);

  if (isLoading || !user) return null;

  const effectiveStake = customStake ? parseFloat(customStake) || 0 : stake;
  const estimatedPayout = effectiveStake * 1.95;

  const handleBuy = () => {
    if (!isDerivAuthed || !account) {
      toast.error("Login with Deriv to trade");
      return;
    }
    if (effectiveStake < 0.35) {
      toast.error("Minimum stake is 0.35");
      return;
    }
    buyContract({
      contractType,
      symbol: market,
      stake: effectiveStake,
      currency: account.currency,
      barrier: contractBarrier,
    });
  };

  const signalColor =
    analysis?.advice.action === "BUY"   ? "text-green-400" :
    analysis?.advice.action === "AVOID" ? "text-red-400"   : "text-yellow-400";
  const signalBg =
    analysis?.advice.action === "BUY"   ? "border-green-500/30 bg-green-500/10" :
    analysis?.advice.action === "AVOID" ? "border-red-500/30 bg-red-500/10"     : "border-yellow-500/20 bg-yellow-500/5";

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

          {/* Account info */}
          {isDerivAuthed && account ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">{account.loginid}</div>
                <div className="text-sm font-black text-white">
                  {account.balance.toFixed(2)} <span className="text-primary text-xs">{account.currency}</span>
                </div>
              </div>
              {account.isVirtual && (
                <Badge variant="outline" className="text-xs border-yellow-500/30 text-yellow-400">DEMO</Badge>
              )}
            </div>
          ) : (
            <Button
              size="sm"
              onClick={loginWithDeriv}
              disabled={isAuthorizing}
              className="bg-primary hover:bg-primary/80 gap-2"
              data-testid="button-deriv-login"
            >
              <LogIn className="w-3.5 h-3.5" />
              {isAuthorizing ? "Authorizing..." : "Login with Deriv"}
            </Button>
          )}
        </header>

        <div className="p-4 md:p-6 max-w-[1200px] mx-auto w-full space-y-5">

          {/* NOT logged into Deriv — show setup card */}
          {!isDerivAuthed && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl border border-primary/20 p-8 text-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Connect Your Deriv Account</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Authorize with Deriv to place real trades directly from the analysis signals.
                  Your credentials are handled securely by Deriv — we never see your password.
                </p>
              </div>

              <Button
                size="lg"
                onClick={loginWithDeriv}
                disabled={isAuthorizing}
                className="bg-primary hover:bg-primary/80 gap-2 px-8"
                data-testid="button-deriv-login-main"
              >
                <LogIn className="w-4 h-4" />
                {isAuthorizing ? "Authorizing..." : "Login with Deriv"}
              </Button>

              <div className="text-xs text-muted-foreground space-y-1 pt-2">
                <p>After clicking, you will be redirected to Deriv to authorize access.</p>
                <p>
                  Make sure your Deriv app ({appId}) has{" "}
                  <span className="text-white font-mono">
                    {window.location.origin}{import.meta.env.BASE_URL?.replace(/\/$/, "")}/callback
                  </span>{" "}
                  registered as a redirect URL.
                </p>
              </div>
            </motion.div>
          )}

          {isDerivAuthed && account && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

              {/* LEFT — trade form */}
              <div className="lg:col-span-5 flex flex-col gap-5">

                {/* P&L summary */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Balance", value: `${account.balance.toFixed(2)} ${account.currency}`, color: "text-white" },
                    { label: "Session P&L", value: `${totalProfit >= 0 ? "+" : ""}${totalProfit.toFixed(2)}`, color: totalProfit >= 0 ? "text-green-400" : "text-red-400" },
                    { label: "Trades", value: trades.length, color: "text-primary" },
                  ].map(s => (
                    <div key={s.label} className="glass-card rounded-xl border border-white/5 p-3 text-center">
                      <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                      <div className={`text-sm font-black ${s.color}`}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Trade form */}
                <div className="glass-card rounded-2xl border border-white/5 p-5 space-y-5">
                  <h3 className="text-sm font-bold text-white">Place Trade</h3>

                  {/* Market */}
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Market</label>
                    <div className="flex flex-wrap gap-2">
                      {VOLATILITY_MARKETS.map(m => (
                        <button
                          key={m.symbol}
                          onClick={() => setMarket(m.symbol)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            market === m.symbol
                              ? "bg-primary/20 border-primary/50 text-primary"
                              : "border-white/10 text-muted-foreground hover:text-white"
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contract type */}
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Contract Type</label>
                    <div className="flex flex-wrap gap-2">
                      {ANALYSIS_TYPES.map(at => (
                        <button
                          key={at.type}
                          onClick={() => { setAnalysisType(at.type); if (!at.hasBarrier) setBarrier(4); }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            analysisType === at.type
                              ? "bg-primary/20 border-primary/50 text-primary"
                              : "border-white/10 text-muted-foreground hover:text-white"
                          }`}
                        >
                          {at.label}
                        </button>
                      ))}
                    </div>

                    {activeConfig.hasBarrier && (
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground">{activeConfig.barrierLabel}:</span>
                        <div className="flex gap-1">
                          {Array.from({ length: 10 }, (_, i) => (
                            <button
                              key={i}
                              onClick={() => setBarrier(i)}
                              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                                barrier === i
                                  ? "bg-secondary/30 border border-secondary/60 text-secondary"
                                  : "bg-white/5 border border-white/10 text-muted-foreground hover:text-white"
                              }`}
                            >
                              {i}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stake */}
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">Stake ({account.currency})</label>
                    <div className="flex flex-wrap gap-2">
                      {STAKE_PRESETS.map(p => (
                        <button
                          key={p}
                          onClick={() => { setStake(p); setCustomStake(""); }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            stake === p && !customStake
                              ? "bg-secondary/20 border-secondary/50 text-secondary"
                              : "border-white/10 text-muted-foreground hover:text-white"
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.35"
                        step="0.01"
                        placeholder="Custom amount"
                        value={customStake}
                        onChange={e => setCustomStake(e.target.value)}
                        data-testid="input-custom-stake"
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                      />
                      <span className="text-xs text-muted-foreground">{account.currency}</span>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contract</span>
                      <span className="text-white font-semibold">{contractTypeLabel(contractType, contractBarrier)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stake</span>
                      <span className="text-white font-semibold">{effectiveStake.toFixed(2)} {account.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. payout</span>
                      <span className="text-green-400 font-semibold">~{estimatedPayout.toFixed(2)} {account.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="text-white font-semibold">1 tick</span>
                    </div>
                  </div>

                  {/* Buy button */}
                  <Button
                    size="lg"
                    className="w-full bg-green-500 hover:bg-green-400 text-black font-black text-base gap-2 h-14 shadow-[0_0_24px_rgba(34,197,94,0.4)]"
                    onClick={handleBuy}
                    disabled={isBuying || effectiveStake < 0.35}
                    data-testid="button-place-trade"
                  >
                    <Zap className="w-5 h-5" />
                    {isBuying ? "Placing..." : `BUY ${contractTypeLabel(contractType, contractBarrier).toUpperCase()}`}
                  </Button>

                  <p className="text-[10px] text-muted-foreground text-center">
                    Trading involves risk. Signals are probability-based, not guaranteed. Only trade what you can afford to lose.
                  </p>
                </div>
              </div>

              {/* RIGHT — signal + trade history */}
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

                  {/* Live digit */}
                  <div className="flex items-center gap-4 pt-1">
                    <div className="text-xs text-muted-foreground">Last digit:</div>
                    <AnimatePresence mode="wait">
                      {ticks[0] && (
                        <motion.span
                          key={ticks[0].epoch}
                          initial={{ scale: 1.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className={`text-4xl font-black ${ticks[0].lastDigit % 2 === 0 ? "text-primary" : "text-secondary"}`}
                        >
                          {ticks[0].lastDigit}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">Signal strength</div>
                      <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${analysis?.confidence ?? 0}%` }}
                        />
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
                        <motion.div
                          key={trade.id}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-colors"
                        >
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
                      <div className="p-10 text-center text-muted-foreground text-sm">
                        No trades yet. Place your first trade above.
                      </div>
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
