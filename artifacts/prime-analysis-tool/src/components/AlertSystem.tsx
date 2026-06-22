import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Volume2, VolumeX, Zap, ChevronDown } from "lucide-react";
import { getMultiMarketAdvice } from "@/hooks/useTickAnalysis";
import { VOLATILITY_MARKETS, Tick } from "@/hooks/useDerivWS";
import type { AnalysisType } from "@/hooks/useTickAnalysis";

interface Alert {
  id: string;
  symbol: string;
  label: string;
  name: string;
  probability: number;
  signal: string;
  entry: string;
  contractType: string;
  timestamp: number;
}

interface AlertSystemProps {
  tickMap: Record<string, Tick[]>;
  analysisType: AnalysisType;
  barrier: number;
  enabled: boolean;
}

function playChime(muted: boolean) {
  if (muted) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99]; // C5 E5 G5 — ascending major chord
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.18);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.35);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.4);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch (_) {}
}

const MAX_ALERTS = 5;
const COOLDOWN_MS = 15_000;
const BUY_THRESHOLD = 62;

export function AlertSystem({ tickMap, analysisType, barrier, enabled }: AlertSystemProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [muted, setMuted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const cooldownMap = useRef<Record<string, number>>({});
  const mutedRef = useRef(muted);

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  const dismiss = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const dismissAll = useCallback(() => setAlerts([]), []);

  useEffect(() => {
    if (!enabled) return;
    const allKeys = Object.keys(tickMap);
    if (allKeys.length === 0) return;

    const results = getMultiMarketAdvice(tickMap, analysisType, barrier);
    const now = Date.now();

    results.forEach(({ symbol, advice }) => {
      if (advice.action !== "BUY") return;
      if (advice.probability < BUY_THRESHOLD) return;

      const lastFired = cooldownMap.current[symbol] ?? 0;
      if (now - lastFired < COOLDOWN_MS) return;

      cooldownMap.current[symbol] = now;

      const info = VOLATILITY_MARKETS.find(m => m.symbol === symbol);
      const newAlert: Alert = {
        id: `${symbol}-${now}`,
        symbol,
        label: info?.label ?? symbol,
        name: info?.name ?? symbol,
        probability: advice.probability,
        signal: advice.label,
        entry: advice.entry,
        contractType: advice.contractType,
        timestamp: now,
      };

      playChime(mutedRef.current);

      setAlerts(prev => {
        const filtered = prev.filter(a => a.symbol !== symbol);
        return [newAlert, ...filtered].slice(0, MAX_ALERTS);
      });
    });
  }, [tickMap, analysisType, barrier, enabled]);

  // Auto-expire alerts after 60s
  useEffect(() => {
    if (alerts.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setAlerts(prev => prev.filter(a => now - a.timestamp < 60_000));
    }, 5000);
    return () => clearInterval(timer);
  }, [alerts.length]);

  if (!enabled || alerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-80 pointer-events-none">
      {/* Header controls */}
      <div className="flex items-center justify-between pointer-events-auto px-1">
        <div className="flex items-center gap-1.5">
          <span className="relative flex w-2 h-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
          </span>
          <span className="text-xs font-bold text-green-400 tracking-wide">
            {alerts.length} LIVE SIGNAL{alerts.length > 1 ? "S" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMuted(m => !m)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            title={muted ? "Unmute alerts" : "Mute alerts"}
          >
            {muted
              ? <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
              : <Volume2 className="w-3.5 h-3.5 text-green-400" />
            }
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={dismissAll}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-red-500/30 transition-colors"
            title="Dismiss all"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Alert cards */}
      <AnimatePresence>
        {!collapsed && alerts.map((alert, idx) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 350, damping: 28, delay: idx * 0.04 }}
            className="pointer-events-auto"
          >
            <div className="relative rounded-2xl border border-green-500/40 bg-[#0a1a0f]/95 backdrop-blur-xl shadow-[0_0_30px_rgba(34,197,94,0.2)] overflow-hidden">
              {/* Top glow bar */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-green-400 to-transparent" />

              <div className="p-4">
                {/* Market + dismiss */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                      </span>
                      <span className="text-green-400 font-black text-sm tracking-wide">ENTER NOW</span>
                    </div>
                    <div className="text-white font-bold text-base mt-0.5">{alert.label}</div>
                    <div className="text-[11px] text-muted-foreground">{alert.name}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button
                      onClick={() => dismiss(alert.id)}
                      className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center transition-colors shrink-0"
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <div className="text-right">
                      <div className="text-green-400 font-black text-xl leading-none">{alert.probability}%</div>
                      <div className="text-[10px] text-muted-foreground">confidence</div>
                    </div>
                  </div>
                </div>

                {/* Signal detail */}
                <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-3 py-2 mb-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Zap className="w-3 h-3 text-green-400 shrink-0" />
                    <span className="text-green-300 font-bold text-xs">{alert.signal}</span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-snug">{alert.entry}</p>
                </div>

                {/* Contract type + time */}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                    {alert.contractType}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
