import { motion } from "framer-motion";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { TradeAdvice } from "@/hooks/useTickAnalysis";

export function ActionBadge({ action }: { action: TradeAdvice["action"] }) {
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

interface AdviceCardProps {
  advice: TradeAdvice;
  market?: string;
  compact?: boolean;
}

export function AdviceCard({ advice, market, compact = false }: AdviceCardProps) {
  const borderColor =
    advice.action === "BUY"   ? "border-green-500/30" :
    advice.action === "AVOID" ? "border-red-500/30"   : "border-yellow-500/20";
  const glowColor =
    advice.action === "BUY"   ? "bg-green-500/10"  :
    advice.action === "AVOID" ? "bg-red-500/10"    : "bg-yellow-500/5";
  const barColor =
    advice.action === "BUY"   ? "bg-green-400" :
    advice.action === "AVOID" ? "bg-red-400"   : "bg-yellow-400";
  const entryBg =
    advice.action === "BUY"   ? "bg-green-500/10 border-green-500/20"  :
    advice.action === "AVOID" ? "bg-red-500/10 border-red-500/20"      : "bg-yellow-500/10 border-yellow-500/20";
  const entryText =
    advice.action === "BUY"   ? "text-green-300" :
    advice.action === "AVOID" ? "text-red-300"   : "text-yellow-300";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card rounded-2xl p-5 border ${borderColor} relative overflow-hidden`}
    >
      <div className={`absolute inset-0 ${glowColor} pointer-events-none`} />
      <div className="relative z-10 space-y-3">
        {market && (
          <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest">{market}</div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ActionBadge action={advice.action} />
              <span className="text-xs font-mono text-muted-foreground">{advice.contractType}</span>
            </div>
            <div className="text-2xl font-black text-white mt-1.5">{advice.label}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-black text-white">{advice.probability}%</div>
            <div className="text-xs text-muted-foreground">probability</div>
          </div>
        </div>

        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${barColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${advice.probability}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="bg-white/[0.03] rounded-lg p-2.5">
            <div className="text-muted-foreground mb-0.5">Confidence</div>
            <div className={`font-bold ${
              advice.confidence === "VERY HIGH" ? "text-green-400" :
              advice.confidence === "HIGH"      ? "text-primary"   :
              advice.confidence === "MEDIUM"    ? "text-yellow-400": "text-red-400"
            }`}>{advice.confidence}</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2.5">
            <div className="text-muted-foreground mb-0.5">Risk</div>
            <div className={`font-bold ${
              advice.risk === "Low"    ? "text-green-400" :
              advice.risk === "Medium" ? "text-yellow-400": "text-red-400"
            }`}>{advice.risk}</div>
          </div>
        </div>

        {!compact && (
          <>
            <div className="bg-white/[0.03] rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Analysis</div>
              <p className="text-sm text-gray-300 leading-relaxed">{advice.reason}</p>
            </div>

            <div className={`rounded-lg p-3 border ${entryBg}`}>
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Recommended Action</div>
              <p className={`text-sm font-medium leading-relaxed ${entryText}`}>{advice.entry}</p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
