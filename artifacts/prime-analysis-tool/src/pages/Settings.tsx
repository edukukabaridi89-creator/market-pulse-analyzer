import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Settings as SettingsIcon, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

import { useAuth } from "@/hooks/useAuth";
import { useTick } from "@/contexts/TickContext";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { AppSettings } from "@/hooks/useSettings";
import { ANALYSIS_TYPES, AnalysisType } from "@/hooks/useTickAnalysis";

const TICK_OPTIONS = [20, 50, 100, 200, 500];
const MINUTE_OPTIONS = [1, 2, 5, 10, 30, 60];

export default function Settings() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { settings, saveSettings, resetSettings } = useTick();

  const [draft, setDraft] = useState<AppSettings>({ ...settings });

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    setDraft({ ...settings });
  }, [settings]);

  const handleSave = () => {
    saveSettings(draft);
    toast.success("Settings saved", {
      description: draft.mode === "ticks"
        ? `Analysis will use the last ${draft.tickCount} ticks.`
        : `Analysis will use the last ${draft.minutes} minutes of data.`,
    });
  };

  const handleReset = () => {
    resetSettings();
    toast("Settings reset to defaults");
  };

  if (isLoading || !user) return null;

  const estimatedTicks = draft.mode === "ticks"
    ? `${draft.tickCount} ticks`
    : `~${draft.minutes * 2}–${draft.minutes * 4} ticks (approx. ${draft.minutes} min of data)`;

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      <Sidebar className="hidden md:flex" />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-white/5 glass-card shrink-0 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold">Settings</h2>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 text-muted-foreground hover:text-white gap-2"
              onClick={handleReset}
              data-testid="button-reset-settings"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>
            <Button
              size="sm"
              className="gap-2 bg-primary hover:bg-primary/80"
              onClick={handleSave}
              data-testid="button-save-settings"
            >
              <Save className="w-3.5 h-3.5" /> Save
            </Button>
          </div>
        </header>

        <div className="p-4 md:p-6 max-w-[800px] mx-auto w-full space-y-5">

          {/* Analysis Window */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl border border-white/5 p-6 space-y-5">
            <div>
              <h3 className="text-base font-bold text-white">Analysis Window</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Choose how much data the analysis engine uses for calculating probabilities and generating signals.
              </p>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-xl overflow-hidden border border-white/10 w-fit">
              {(["ticks", "minutes"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setDraft(d => ({ ...d, mode }))}
                  data-testid={`button-mode-${mode}`}
                  className={`px-6 py-2.5 text-sm font-bold transition-all ${
                    draft.mode === mode
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:text-white bg-transparent"
                  }`}
                >
                  {mode === "ticks" ? "By Number of Ticks" : "By Time Period"}
                </button>
              ))}
            </div>

            {/* Ticks selector */}
            {draft.mode === "ticks" && (
              <div className="space-y-3">
                <label className="text-sm text-muted-foreground">Number of ticks to analyze</label>
                <div className="flex flex-wrap gap-3">
                  {TICK_OPTIONS.map(n => (
                    <button
                      key={n}
                      onClick={() => setDraft(d => ({ ...d, tickCount: n }))}
                      data-testid={`button-ticks-${n}`}
                      className={`px-5 py-3 rounded-xl text-sm font-bold transition-all border ${
                        draft.tickCount === n
                          ? "bg-primary/20 border-primary/60 text-primary shadow-[0_0_14px_rgba(0,114,255,0.3)]"
                          : "border-white/10 text-muted-foreground hover:border-white/25 hover:text-white"
                      }`}
                    >
                      {n} ticks
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  The analysis will always look at the most recent {draft.tickCount} ticks from the live stream, regardless of how long they took to arrive.
                </p>
              </div>
            )}

            {/* Minutes selector */}
            {draft.mode === "minutes" && (
              <div className="space-y-3">
                <label className="text-sm text-muted-foreground">Time period to analyze</label>
                <div className="flex flex-wrap gap-3">
                  {MINUTE_OPTIONS.map(m => (
                    <button
                      key={m}
                      onClick={() => setDraft(d => ({ ...d, minutes: m }))}
                      data-testid={`button-minutes-${m}`}
                      className={`px-5 py-3 rounded-xl text-sm font-bold transition-all border ${
                        draft.minutes === m
                          ? "bg-primary/20 border-primary/60 text-primary shadow-[0_0_14px_rgba(0,114,255,0.3)]"
                          : "border-white/10 text-muted-foreground hover:border-white/25 hover:text-white"
                      }`}
                    >
                      {m} {m === 1 ? "min" : "min"}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Only ticks received in the last {draft.minutes} minute{draft.minutes !== 1 ? "s" : ""} will be included. The app streams ticks in real time — the buffer fills as you use it.
                </p>
              </div>
            )}

            {/* Preview */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="text-xs text-primary uppercase tracking-wider mb-1">Current window</div>
              <div className="text-white font-bold">{estimatedTicks}</div>
            </div>
          </motion.div>

          {/* Default Analysis Type */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl border border-white/5 p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Default Analysis Type</h3>
              <p className="text-sm text-muted-foreground mt-1">
                The analysis type selected when you open the dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {ANALYSIS_TYPES.map(at => (
                <button
                  key={at.type}
                  onClick={() => setDraft(d => ({ ...d, defaultAnalysisType: at.type as AnalysisType }))}
                  data-testid={`button-default-${at.type}`}
                  className={`px-5 py-3 rounded-xl text-sm font-bold transition-all border ${
                    draft.defaultAnalysisType === at.type
                      ? "bg-secondary/20 border-secondary/60 text-secondary shadow-[0_0_14px_rgba(123,47,247,0.3)]"
                      : "border-white/10 text-muted-foreground hover:border-white/25 hover:text-white"
                  }`}
                >
                  {at.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Data Info */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl border border-white/5 p-6 space-y-3">
            <h3 className="text-base font-bold text-white">Data & Storage</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>The app buffers up to <span className="text-white font-semibold">200 ticks per market</span> in memory while you use the dashboard.</p>
              <p>Switching markets resets the tick buffer for that market. Tick data is never saved to disk — it refreshes with each session.</p>
              <p>Settings are saved to your browser&apos;s local storage and persist across sessions.</p>
            </div>
          </motion.div>

          {/* Save row */}
          <div className="flex justify-end gap-3 pb-6">
            <Button variant="outline" size="sm" className="border-white/10 text-muted-foreground gap-2" onClick={handleReset}>
              <RotateCcw className="w-3.5 h-3.5" /> Reset to defaults
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/80 gap-2 px-6" onClick={handleSave}>
              <Save className="w-3.5 h-3.5" /> Save settings
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
