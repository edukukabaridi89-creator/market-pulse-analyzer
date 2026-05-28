import { useState, useCallback } from "react";
import { AnalysisType } from "./useTickAnalysis";
import { Tick } from "./useDerivWS";

export interface AppSettings {
  mode: "ticks" | "minutes";
  tickCount: number;
  minutes: number;
  defaultAnalysisType: AnalysisType;
}

const STORAGE_KEY = "prime_settings";

const DEFAULTS: AppSettings = {
  mode: "ticks",
  tickCount: 100,
  minutes: 5,
  defaultAnalysisType: "even",
};

function load(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(load);

  const saveSettings = useCallback((next: Partial<AppSettings>) => {
    setSettingsState(prev => {
      const updated = { ...prev, ...next };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState(DEFAULTS);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const filterTicks = useCallback((ticks: Tick[]): Tick[] => {
    if (settings.mode === "ticks") {
      return ticks.slice(0, settings.tickCount);
    }
    const cutoff = Math.floor(Date.now() / 1000) - settings.minutes * 60;
    const filtered = ticks.filter(t => t.epoch >= cutoff);
    return filtered.length >= 5 ? filtered : ticks.slice(0, 50);
  }, [settings]);

  return { settings, saveSettings, resetSettings, filterTicks };
}
