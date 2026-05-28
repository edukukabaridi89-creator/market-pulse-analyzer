import { useMemo } from "react";
import { Tick } from "./useDerivWS";

export type AnalysisType = "even" | "odd" | "over" | "under" | "matches" | "differs";

export interface TradeAdvice {
  action: "BUY" | "WAIT" | "AVOID";
  label: string;
  probability: number;
  confidence: "LOW" | "MEDIUM" | "HIGH" | "VERY HIGH";
  reason: string;
  entry: string;
  risk: "Low" | "Medium" | "High";
  contractType: string;
}

function getConfidenceLabel(prob: number): TradeAdvice["confidence"] {
  if (prob >= 70) return "VERY HIGH";
  if (prob >= 60) return "HIGH";
  if (prob >= 53) return "MEDIUM";
  return "LOW";
}

function getRisk(prob: number): TradeAdvice["risk"] {
  if (prob >= 65) return "Low";
  if (prob >= 55) return "Medium";
  return "High";
}

function generateAdvice(
  type: AnalysisType,
  barrier: number,
  ticks: Tick[]
): TradeAdvice {
  const sample = ticks.slice(0, 100);
  const n = sample.length;

  if (n < 10) {
    return {
      action: "WAIT",
      label: "Collecting data...",
      probability: 0,
      confidence: "LOW",
      reason: "Not enough ticks collected yet. Wait for at least 10 ticks.",
      entry: "Wait for more data.",
      risk: "High",
      contractType: type.toUpperCase(),
    };
  }

  const frequencies = Array(10).fill(0);
  sample.forEach(t => frequencies[t.lastDigit]++);

  if (type === "even") {
    const evenCount = sample.filter(t => t.lastDigit % 2 === 0).length;
    const prob = Math.round((evenCount / n) * 100);
    const action: TradeAdvice["action"] = prob >= 53 ? "BUY" : prob <= 47 ? "AVOID" : "WAIT";
    return {
      action,
      label: action === "BUY" ? "BUY EVEN" : action === "AVOID" ? "AVOID EVEN" : "WAIT",
      probability: prob,
      confidence: getConfidenceLabel(prob),
      reason: `${evenCount} of last ${n} digits were even (${prob}%). Even digits (0,2,4,6,8) ${prob >= 55 ? "are dominant" : prob <= 45 ? "are underrepresented — odd bias detected" : "are balanced"}.`,
      entry: prob >= 55
        ? `Place an EVEN trade now. Probability favours even outcome.`
        : prob <= 45
        ? `Odd digits dominate. Consider an ODD trade instead.`
        : `Distribution is balanced. Wait for a clearer signal (>55% bias).`,
      risk: getRisk(prob),
      contractType: "Digits — Even",
    };
  }

  if (type === "odd") {
    const oddCount = sample.filter(t => t.lastDigit % 2 !== 0).length;
    const prob = Math.round((oddCount / n) * 100);
    const action: TradeAdvice["action"] = prob >= 53 ? "BUY" : prob <= 47 ? "AVOID" : "WAIT";
    return {
      action,
      label: action === "BUY" ? "BUY ODD" : action === "AVOID" ? "AVOID ODD" : "WAIT",
      probability: prob,
      confidence: getConfidenceLabel(prob),
      reason: `${oddCount} of last ${n} digits were odd (${prob}%). Odd digits (1,3,5,7,9) ${prob >= 55 ? "are dominant" : prob <= 45 ? "are underrepresented — even bias detected" : "are balanced"}.`,
      entry: prob >= 55
        ? `Place an ODD trade now. Probability favours odd outcome.`
        : prob <= 45
        ? `Even digits dominate. Consider an EVEN trade instead.`
        : `Distribution is balanced. Wait for a clearer signal (>55% bias).`,
      risk: getRisk(prob),
      contractType: "Digits — Odd",
    };
  }

  if (type === "over") {
    const overCount = sample.filter(t => t.lastDigit > barrier).length;
    const prob = Math.round((overCount / n) * 100);
    const action: TradeAdvice["action"] = prob >= 53 ? "BUY" : "WAIT";
    return {
      action,
      label: action === "BUY" ? `BUY OVER ${barrier}` : "WAIT",
      probability: prob,
      confidence: getConfidenceLabel(prob),
      reason: `${overCount} of last ${n} digits were above ${barrier} (digits ${barrier + 1}–9). That's ${prob}% of ticks.`,
      entry: prob >= 53
        ? `Place an OVER ${barrier} trade. ${prob}% of recent digits exceeded this barrier.`
        : `Only ${prob}% chance based on recent data. Increase barrier or wait for stronger pattern.`,
      risk: getRisk(prob),
      contractType: `Digits — Over ${barrier}`,
    };
  }

  if (type === "under") {
    const underCount = sample.filter(t => t.lastDigit < barrier).length;
    const prob = Math.round((underCount / n) * 100);
    const action: TradeAdvice["action"] = prob >= 53 ? "BUY" : "WAIT";
    return {
      action,
      label: action === "BUY" ? `BUY UNDER ${barrier}` : "WAIT",
      probability: prob,
      confidence: getConfidenceLabel(prob),
      reason: `${underCount} of last ${n} digits were below ${barrier} (digits 0–${barrier - 1}). That's ${prob}% of ticks.`,
      entry: prob >= 53
        ? `Place an UNDER ${barrier} trade. ${prob}% of recent digits were below this barrier.`
        : `Only ${prob}% chance based on recent data. Lower the barrier or wait for a pattern shift.`,
      risk: getRisk(prob),
      contractType: `Digits — Under ${barrier}`,
    };
  }

  if (type === "matches") {
    const matchCount = frequencies[barrier];
    const prob = Math.round((matchCount / n) * 100);
    const expectedProb = 10;
    const isHot = prob > expectedProb + 3;
    const action: TradeAdvice["action"] = isHot ? "BUY" : "WAIT";
    const sortedDigits = [...frequencies.map((f, i) => ({ digit: i, freq: f }))]
      .sort((a, b) => b.freq - a.freq);
    const topDigit = sortedDigits[0];
    return {
      action,
      label: action === "BUY" ? `BUY MATCHES ${barrier}` : `WAIT — Consider ${topDigit.digit}`,
      probability: prob,
      confidence: getConfidenceLabel(prob + 40),
      reason: `Digit ${barrier} appeared ${matchCount} times in last ${n} ticks (${prob}% vs expected 10%). ${isHot ? `This digit is HOT — above average frequency.` : `This digit is COLD — below average frequency.`} Hottest digit right now: ${topDigit.digit} (${Math.round(topDigit.freq / n * 100)}%).`,
      entry: isHot
        ? `Bet MATCHES ${barrier}. This digit is running hot — ${prob}% recent frequency.`
        : `Digit ${barrier} is cold. Better to bet MATCHES ${topDigit.digit} (hottest at ${Math.round(topDigit.freq / n * 100)}%) or wait for digit ${barrier} to heat up.`,
      risk: isHot ? "Medium" : "High",
      contractType: `Digits — Matches ${barrier}`,
    };
  }

  if (type === "differs") {
    const matchCount = frequencies[barrier];
    const differsProb = Math.round(((n - matchCount) / n) * 100);
    const isHot = matchCount / n > 0.13;
    const action: TradeAdvice["action"] = isHot ? "AVOID" : "BUY";
    return {
      action,
      label: action === "BUY" ? `BUY DIFFERS ${barrier}` : `AVOID DIFFERS ${barrier}`,
      probability: differsProb,
      confidence: getConfidenceLabel(differsProb),
      reason: `Digit ${barrier} appeared ${matchCount} times (${Math.round(matchCount / n * 100)}%). DIFFERS wins when the outcome is NOT ${barrier}. ${isHot ? `Warning: digit ${barrier} is HOT — higher-than-usual match risk.` : `Digit ${barrier} is cold — good conditions for DIFFERS.`}`,
      entry: action === "BUY"
        ? `Place DIFFERS ${barrier}. Digit ${barrier} is cold (${Math.round(matchCount / n * 100)}% frequency) — favourable conditions for a differs trade.`
        : `Digit ${barrier} is hot right now. DIFFERS ${barrier} is risky. Wait for it to cool down.`,
      risk: isHot ? "High" : "Low",
      contractType: `Digits — Differs ${barrier}`,
    };
  }

  return {
    action: "WAIT",
    label: "WAIT",
    probability: 0,
    confidence: "LOW",
    reason: "Select an analysis type.",
    entry: "",
    risk: "High",
    contractType: "",
  };
}

export function useTickAnalysis(
  ticks: Tick[],
  analysisType: AnalysisType = "even",
  barrier: number = 4
) {
  return useMemo(() => {
    const sample50 = ticks.slice(0, 50);
    const sample100 = ticks.slice(0, 100);
    const n50 = sample50.length;
    const n100 = sample100.length;

    const evenCount = sample50.filter(t => t.lastDigit % 2 === 0).length;
    const oddCount = n50 - evenCount;
    const evenPercent = Math.round((evenCount / Math.max(1, n50)) * 100);
    const oddPercent = 100 - evenPercent;

    const overCount = sample50.filter(t => t.lastDigit > 4).length;
    const underCount = n50 - overCount;
    const overPercent = Math.round((overCount / Math.max(1, n50)) * 100);
    const underPercent = 100 - overPercent;

    const frequencies = Array(10).fill(0);
    sample100.forEach(t => frequencies[t.lastDigit]++);
    const maxFreq = Math.max(...frequencies);
    const minFreq = Math.min(...frequencies);
    const hotDigit = frequencies.indexOf(maxFreq);
    const coldDigit = frequencies.indexOf(minFreq);

    const last5 = ticks.slice(0, 5);
    const trendDirection =
      last5.length >= 2 && last5[0].quote > last5[last5.length - 1].quote
        ? "UPTREND"
        : "DOWNTREND";

    const advice = generateAdvice(analysisType, barrier, ticks);
    const confidence = Math.min(95, maxFreq > 0 ? maxFreq * (100 / Math.max(n100, 1)) * 3 : 0);

    return {
      evenPercent,
      oddPercent,
      overPercent,
      underPercent,
      frequencies,
      hotDigit,
      coldDigit,
      confidence: Math.round(Math.min(95, confidence)),
      trendDirection,
      advice,
      n50,
      n100,
    };
  }, [ticks, analysisType, barrier]);
}

export function getMultiMarketAdvice(
  tickMap: Record<string, Tick[]>,
  analysisType: AnalysisType,
  barrier: number
) {
  return Object.entries(tickMap)
    .map(([symbol, ticks]) => {
      const advice = generateAdvice(analysisType, barrier, ticks);
      const market = symbol;
      return { symbol, market, ticks: ticks.length, advice };
    })
    .sort((a, b) => {
      if (a.advice.action === "BUY" && b.advice.action !== "BUY") return -1;
      if (b.advice.action === "BUY" && a.advice.action !== "BUY") return 1;
      return b.advice.probability - a.advice.probability;
    });
}
