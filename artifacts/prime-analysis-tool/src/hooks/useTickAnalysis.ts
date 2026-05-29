import { useMemo } from "react";
import { Tick } from "./useDerivWS";

export type TradeCategory = "digits" | "rise_fall" | "higher_lower" | "touch" | "ends" | "multipliers";

export type AnalysisType =
  | "even" | "odd" | "over" | "under" | "matches" | "differs"
  | "rise" | "fall"
  | "higher" | "lower"
  | "touch" | "no_touch"
  | "ends_in" | "ends_out"
  | "multiplier_up" | "multiplier_down";

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

// ── Price stats helper ────────────────────────────────────────────────────────
interface PriceStats {
  prices: number[];
  n: number;
  avg: number;
  stdDev: number;
  current: number;
  upPct: number;   // % of ticks that moved up
  avgMove: number; // avg absolute tick-to-tick move as % of price
  streak: number;  // consecutive up (positive) or down (negative) moves from newest
}

function getPriceStats(ticks: Tick[]): PriceStats | null {
  const prices = ticks.slice(0, 50).map(t => t.quote);
  const n = prices.length;
  if (n < 3) return null;
  const avg = prices.reduce((a, b) => a + b) / n;
  const stdDev = Math.sqrt(prices.reduce((sum, p) => sum + Math.pow(p - avg, 2), 0) / n);
  const current = prices[0];
  const upMoves = prices.slice(0, n - 1).filter((p, i) => p > prices[i + 1]).length;
  const upPct = Math.round((upMoves / (n - 1)) * 100);
  const avgMove = prices.slice(0, n - 1)
    .reduce((sum, p, i) => sum + Math.abs(p - prices[i + 1]) / prices[i + 1] * 100, 0) / (n - 1);
  let streak = 0;
  for (let i = 0; i < Math.min(10, n - 1); i++) {
    if (prices[i] > prices[i + 1]) streak++;
    else if (prices[i] < prices[i + 1]) { streak = streak > 0 ? streak : streak - 1; break; }
    else break;
  }
  return { prices, n, avg, stdDev, current, upPct, avgMove, streak };
}

// ── Main advice generator ─────────────────────────────────────────────────────
function generateAdvice(type: AnalysisType, barrier: number, ticks: Tick[]): TradeAdvice {
  const sample = ticks.slice(0, 100);
  const n = sample.length;

  if (n < 10) {
    return {
      action: "WAIT", label: "Collecting data...", probability: 0, confidence: "LOW",
      reason: "Not enough ticks yet. Wait for at least 10 ticks.",
      entry: "Wait for more data.", risk: "High", contractType: type.toUpperCase(),
    };
  }

  // ── DIGITS ────────────────────────────────────────────────────────────────
  const frequencies = Array(10).fill(0);
  sample.forEach(t => frequencies[t.lastDigit]++);

  if (type === "even") {
    const evenCount = sample.filter(t => t.lastDigit % 2 === 0).length;
    const prob = Math.round((evenCount / n) * 100);
    const action: TradeAdvice["action"] = prob >= 53 ? "BUY" : prob <= 47 ? "AVOID" : "WAIT";
    return {
      action, probability: prob, confidence: getConfidenceLabel(prob), risk: getRisk(prob),
      label: action === "BUY" ? "BUY EVEN" : action === "AVOID" ? "AVOID" : "WAIT",
      reason: `${evenCount}/${n} digits were even (${prob}%). ${prob >= 55 ? "Even bias detected." : prob <= 45 ? "Odd bias detected." : "Balanced distribution."}`,
      entry: prob >= 55 ? "Place an EVEN trade." : prob <= 45 ? "Odd digits dominate — consider ODD." : "Wait for >55% bias.",
      contractType: "Digits — Even",
    };
  }

  if (type === "odd") {
    const oddCount = sample.filter(t => t.lastDigit % 2 !== 0).length;
    const prob = Math.round((oddCount / n) * 100);
    const action: TradeAdvice["action"] = prob >= 53 ? "BUY" : prob <= 47 ? "AVOID" : "WAIT";
    return {
      action, probability: prob, confidence: getConfidenceLabel(prob), risk: getRisk(prob),
      label: action === "BUY" ? "BUY ODD" : action === "AVOID" ? "AVOID" : "WAIT",
      reason: `${oddCount}/${n} digits were odd (${prob}%). ${prob >= 55 ? "Odd bias detected." : prob <= 45 ? "Even bias detected." : "Balanced distribution."}`,
      entry: prob >= 55 ? "Place an ODD trade." : prob <= 45 ? "Even digits dominate — consider EVEN." : "Wait for >55% bias.",
      contractType: "Digits — Odd",
    };
  }

  if (type === "over") {
    const overCount = sample.filter(t => t.lastDigit > barrier).length;
    const prob = Math.round((overCount / n) * 100);
    const action: TradeAdvice["action"] = prob >= 53 ? "BUY" : "WAIT";
    return {
      action, probability: prob, confidence: getConfidenceLabel(prob), risk: getRisk(prob),
      label: action === "BUY" ? `BUY OVER ${barrier}` : "WAIT",
      reason: `${overCount}/${n} digits were above ${barrier} (digits ${barrier + 1}–9). That's ${prob}%.`,
      entry: prob >= 53 ? `Place OVER ${barrier}. ${prob}% chance.` : `Only ${prob}%. Wait or raise barrier.`,
      contractType: `Digits — Over ${barrier}`,
    };
  }

  if (type === "under") {
    const underCount = sample.filter(t => t.lastDigit < barrier).length;
    const prob = Math.round((underCount / n) * 100);
    const action: TradeAdvice["action"] = prob >= 53 ? "BUY" : "WAIT";
    return {
      action, probability: prob, confidence: getConfidenceLabel(prob), risk: getRisk(prob),
      label: action === "BUY" ? `BUY UNDER ${barrier}` : "WAIT",
      reason: `${underCount}/${n} digits were below ${barrier} (digits 0–${barrier - 1}). That's ${prob}%.`,
      entry: prob >= 53 ? `Place UNDER ${barrier}. ${prob}% chance.` : `Only ${prob}%. Wait or lower barrier.`,
      contractType: `Digits — Under ${barrier}`,
    };
  }

  if (type === "matches") {
    const matchCount = frequencies[barrier];
    const prob = Math.round((matchCount / n) * 100);
    const isHot = prob > 13;
    const sortedDigits = frequencies.map((f, i) => ({ digit: i, freq: f })).sort((a, b) => b.freq - a.freq);
    return {
      action: isHot ? "BUY" : "WAIT",
      label: isHot ? `BUY MATCHES ${barrier}` : `WAIT — Hottest: ${sortedDigits[0].digit}`,
      probability: prob, confidence: getConfidenceLabel(prob + 40), risk: isHot ? "Medium" : "High",
      reason: `Digit ${barrier} appeared ${matchCount}/${n} times (${prob}% vs 10% expected). ${isHot ? "HOT digit." : "COLD digit."} Hottest: ${sortedDigits[0].digit} (${Math.round(sortedDigits[0].freq / n * 100)}%).`,
      entry: isHot ? `Bet MATCHES ${barrier} — running hot at ${prob}%.` : `Digit ${barrier} is cold. Consider MATCHES ${sortedDigits[0].digit} instead.`,
      contractType: `Digits — Matches ${barrier}`,
    };
  }

  if (type === "differs") {
    const matchCount = frequencies[barrier];
    const differsProb = Math.round(((n - matchCount) / n) * 100);
    const isHot = matchCount / n > 0.13;
    return {
      action: isHot ? "AVOID" : "BUY",
      label: isHot ? `AVOID DIFFERS ${barrier}` : `BUY DIFFERS ${barrier}`,
      probability: differsProb, confidence: getConfidenceLabel(differsProb), risk: isHot ? "High" : "Low",
      reason: `Digit ${barrier} appeared ${matchCount}/${n} times (${Math.round(matchCount / n * 100)}%). DIFFERS wins when outcome ≠ ${barrier}. ${isHot ? "Digit is HOT — risky." : "Digit is COLD — favourable."}`,
      entry: !isHot ? `Place DIFFERS ${barrier}. Digit ${barrier} is cold.` : `Digit ${barrier} is hot. DIFFERS risky. Wait for it to cool.`,
      contractType: `Digits — Differs ${barrier}`,
    };
  }

  // ── RISE / FALL ───────────────────────────────────────────────────────────
  const ps = getPriceStats(ticks);

  if (type === "rise") {
    if (!ps) return waitAdvice("Rise (Call)");
    const prob = ps.upPct;
    const action: TradeAdvice["action"] = prob >= 55 ? "BUY" : prob <= 45 ? "AVOID" : "WAIT";
    return {
      action, probability: prob, confidence: getConfidenceLabel(prob), risk: getRisk(prob),
      label: action === "BUY" ? "BUY RISE" : action === "AVOID" ? "AVOID RISE" : "WAIT",
      reason: `${ps.upPct}% of recent ${ps.n - 1} tick-moves were upward. ${prob >= 55 ? "Clear uptrend." : prob <= 45 ? "Downtrend dominant." : "Price is moving sideways."}`,
      entry: prob >= 55 ? `Buy RISE (Call). Price is trending up (${prob}% up-moves).` : prob <= 45 ? "Downtrend detected — consider FALL instead." : "Sideways price action. Wait for a clear trend.",
      contractType: "Rise (Call)",
    };
  }

  if (type === "fall") {
    if (!ps) return waitAdvice("Fall (Put)");
    const prob = 100 - ps.upPct;
    const action: TradeAdvice["action"] = prob >= 55 ? "BUY" : prob <= 45 ? "AVOID" : "WAIT";
    return {
      action, probability: prob, confidence: getConfidenceLabel(prob), risk: getRisk(prob),
      label: action === "BUY" ? "BUY FALL" : action === "AVOID" ? "AVOID FALL" : "WAIT",
      reason: `${prob}% of recent tick-moves were downward. ${prob >= 55 ? "Clear downtrend." : prob <= 45 ? "Uptrend dominant." : "Sideways action."}`,
      entry: prob >= 55 ? `Buy FALL (Put). Price is trending down (${prob}% down-moves).` : prob <= 45 ? "Uptrend detected — consider RISE instead." : "No clear trend. Wait for direction.",
      contractType: "Fall (Put)",
    };
  }

  // ── HIGHER / LOWER ────────────────────────────────────────────────────────
  if (type === "higher") {
    if (!ps) return waitAdvice("Higher (Call+barrier)");
    const prob = ps.upPct;
    const barrierAmt = (ps.stdDev * 0.5).toFixed(5);
    const action: TradeAdvice["action"] = prob >= 55 ? "BUY" : prob <= 45 ? "AVOID" : "WAIT";
    return {
      action, probability: prob, confidence: getConfidenceLabel(prob), risk: getRisk(prob),
      label: action === "BUY" ? "BUY HIGHER" : action === "AVOID" ? "AVOID" : "WAIT",
      reason: `${prob}% up-moves. Auto-barrier set +${barrierAmt} above current price (0.5σ). ${prob >= 55 ? "Price trending higher." : "No clear upward push."}`,
      entry: prob >= 55 ? `Buy HIGHER. Price likely to exceed barrier by +${barrierAmt}.` : "Insufficient upward momentum for HIGHER trade.",
      contractType: "Higher (Call+barrier)",
    };
  }

  if (type === "lower") {
    if (!ps) return waitAdvice("Lower (Put+barrier)");
    const prob = 100 - ps.upPct;
    const barrierAmt = (ps.stdDev * 0.5).toFixed(5);
    const action: TradeAdvice["action"] = prob >= 55 ? "BUY" : prob <= 45 ? "AVOID" : "WAIT";
    return {
      action, probability: prob, confidence: getConfidenceLabel(prob), risk: getRisk(prob),
      label: action === "BUY" ? "BUY LOWER" : action === "AVOID" ? "AVOID" : "WAIT",
      reason: `${prob}% down-moves. Auto-barrier set -${barrierAmt} below current price (0.5σ). ${prob >= 55 ? "Price trending lower." : "No clear downward push."}`,
      entry: prob >= 55 ? `Buy LOWER. Price likely to fall below barrier by -${barrierAmt}.` : "Insufficient downward momentum for LOWER trade.",
      contractType: "Lower (Put+barrier)",
    };
  }

  // ── TOUCH / NO TOUCH ──────────────────────────────────────────────────────
  if (type === "touch") {
    if (!ps) return waitAdvice("Touch");
    const volatilityScore = Math.min(90, Math.round(50 + (ps.avgMove - 0.02) / 0.02 * 25));
    const prob = Math.max(30, volatilityScore);
    const action: TradeAdvice["action"] = prob >= 60 ? "BUY" : prob <= 45 ? "AVOID" : "WAIT";
    return {
      action, probability: prob, confidence: getConfidenceLabel(prob), risk: getRisk(prob),
      label: action === "BUY" ? "BUY TOUCH" : action === "AVOID" ? "AVOID" : "WAIT",
      reason: `Avg tick movement: ${ps.avgMove.toFixed(3)}% per tick. Barrier auto-set at ±1.5σ from current price. ${prob >= 60 ? "High volatility — likely to touch barrier." : "Low volatility — price may not reach barrier."}`,
      entry: prob >= 60 ? `Buy TOUCH. Price volatility (${ps.avgMove.toFixed(3)}%/tick) favours barrier contact.` : "Volatility too low for reliable TOUCH. Consider NO TOUCH instead.",
      contractType: "Touch (One Touch)",
    };
  }

  if (type === "no_touch") {
    if (!ps) return waitAdvice("No Touch");
    const volatilityScore = Math.min(90, Math.round(50 + (ps.avgMove - 0.02) / 0.02 * 25));
    const touchProb = Math.max(30, volatilityScore);
    const prob = 100 - touchProb;
    const action: TradeAdvice["action"] = prob >= 58 ? "BUY" : prob <= 42 ? "AVOID" : "WAIT";
    return {
      action, probability: prob, confidence: getConfidenceLabel(prob), risk: getRisk(prob),
      label: action === "BUY" ? "BUY NO TOUCH" : action === "AVOID" ? "AVOID" : "WAIT",
      reason: `Avg tick movement: ${ps.avgMove.toFixed(3)}%/tick (low = good for NO TOUCH). Barrier at ±1.5σ. ${prob >= 58 ? "Low volatility — price unlikely to reach barrier." : "Volatility too high — barrier may be hit."}`,
      entry: prob >= 58 ? `Buy NO TOUCH. Low price volatility (${ps.avgMove.toFixed(3)}%/tick) favours staying in range.` : "Volatility too high for NO TOUCH. Consider TOUCH instead.",
      contractType: "No Touch",
    };
  }

  // ── ENDS IN / ENDS OUT ────────────────────────────────────────────────────
  if (type === "ends_in") {
    if (!ps) return waitAdvice("Ends In");
    const rangeScore = Math.min(90, Math.round(50 + (0.03 - ps.avgMove) / 0.02 * 25));
    const prob = Math.max(30, rangeScore);
    const action: TradeAdvice["action"] = prob >= 58 ? "BUY" : prob <= 42 ? "AVOID" : "WAIT";
    return {
      action, probability: prob, confidence: getConfidenceLabel(prob), risk: getRisk(prob),
      label: action === "BUY" ? "BUY ENDS IN" : action === "AVOID" ? "AVOID" : "WAIT",
      reason: `Price moves ${ps.avgMove.toFixed(3)}%/tick avg. Range barriers at ±1.5σ. ${prob >= 58 ? "Price is contained — likely to expire within range." : "Volatility too high — price may escape the range."}`,
      entry: prob >= 58 ? `Buy ENDS IN (Stays Between). Price movement is contained at ${ps.avgMove.toFixed(3)}%/tick.` : "Price too volatile for ENDS IN. Consider ENDS OUT.",
      contractType: "Ends In (Range)",
    };
  }

  if (type === "ends_out") {
    if (!ps) return waitAdvice("Ends Out");
    const rangeScore = Math.min(90, Math.round(50 + (0.03 - ps.avgMove) / 0.02 * 25));
    const inProb = Math.max(30, rangeScore);
    const prob = 100 - inProb;
    const action: TradeAdvice["action"] = prob >= 55 ? "BUY" : prob <= 45 ? "AVOID" : "WAIT";
    return {
      action, probability: prob, confidence: getConfidenceLabel(prob), risk: getRisk(prob),
      label: action === "BUY" ? "BUY ENDS OUT" : action === "AVOID" ? "AVOID" : "WAIT",
      reason: `High price movement at ${ps.avgMove.toFixed(3)}%/tick avg. ${prob >= 55 ? "Volatile conditions — price likely to break outside the range." : "Price is relatively contained — poor conditions for ENDS OUT."}`,
      entry: prob >= 55 ? `Buy ENDS OUT (Goes Outside). Price movement is wide enough to break the range.` : "Price too stable for ENDS OUT. Wait for more volatility.",
      contractType: "Ends Out (Goes Outside)",
    };
  }

  // ── MULTIPLIERS ───────────────────────────────────────────────────────────
  if (type === "multiplier_up") {
    if (!ps) return waitAdvice("Multiplier Up");
    const streak = Math.max(0, ps.streak);
    const momentumScore = Math.min(85, 50 + streak * 6 + (ps.upPct - 50));
    const prob = Math.max(30, Math.round(momentumScore));
    const action: TradeAdvice["action"] = prob >= 62 ? "BUY" : prob <= 45 ? "AVOID" : "WAIT";
    return {
      action, probability: prob, confidence: getConfidenceLabel(prob), risk: prob >= 62 ? "Low" : "High",
      label: action === "BUY" ? "BUY MULT UP" : action === "AVOID" ? "AVOID" : "WAIT",
      reason: `${streak} consecutive up-moves. ${ps.upPct}% of recent ticks were up. ${prob >= 62 ? "Strong upward momentum — good for leveraged UP position." : "Momentum not strong enough for a multiplier trade."}`,
      entry: prob >= 62 ? `Buy MULTIPLIER UP. Strong upward streak (${streak} in a row, ${ps.upPct}% up-moves). Use with stop loss.` : "Momentum not confirmed. Wait for a stronger streak.",
      contractType: "Multiplier Up",
    };
  }

  if (type === "multiplier_down") {
    if (!ps) return waitAdvice("Multiplier Down");
    const downStreak = Math.max(0, -ps.streak);
    const momentumScore = Math.min(85, 50 + downStreak * 6 + (50 - ps.upPct));
    const prob = Math.max(30, Math.round(momentumScore));
    const action: TradeAdvice["action"] = prob >= 62 ? "BUY" : prob <= 45 ? "AVOID" : "WAIT";
    return {
      action, probability: prob, confidence: getConfidenceLabel(prob), risk: prob >= 62 ? "Low" : "High",
      label: action === "BUY" ? "BUY MULT DOWN" : action === "AVOID" ? "AVOID" : "WAIT",
      reason: `${downStreak} consecutive down-moves. ${100 - ps.upPct}% of recent ticks were down. ${prob >= 62 ? "Strong downward momentum — good for leveraged DOWN position." : "Momentum not strong enough for a multiplier trade."}`,
      entry: prob >= 62 ? `Buy MULTIPLIER DOWN. Strong downward streak (${downStreak} in a row). Use with stop loss.` : "Momentum not confirmed. Wait for a stronger streak.",
      contractType: "Multiplier Down",
    };
  }

  return waitAdvice(type);
}

function waitAdvice(contractType: string): TradeAdvice {
  return { action: "WAIT", label: "WAIT", probability: 0, confidence: "LOW", reason: "Collecting data...", entry: "", risk: "High", contractType };
}

// ── Public hook ───────────────────────────────────────────────────────────────
export function useTickAnalysis(ticks: Tick[], analysisType: AnalysisType = "even", barrier: number = 4) {
  return useMemo(() => {
    const sample50 = ticks.slice(0, 50);
    const n50 = sample50.length;

    const evenCount = sample50.filter(t => t.lastDigit % 2 === 0).length;
    const evenPercent = Math.round((evenCount / Math.max(1, n50)) * 100);
    const oddPercent = 100 - evenPercent;

    const overCount = sample50.filter(t => t.lastDigit > 4).length;
    const overPercent = Math.round((overCount / Math.max(1, n50)) * 100);
    const underPercent = 100 - overPercent;

    const frequencies = Array(10).fill(0);
    ticks.slice(0, 100).forEach(t => frequencies[t.lastDigit]++);
    const maxFreq = Math.max(...frequencies);
    const minFreq = Math.min(...frequencies);
    const hotDigit = frequencies.indexOf(maxFreq);
    const coldDigit = frequencies.indexOf(minFreq);

    const last5 = ticks.slice(0, 5);
    const trendDirection = last5.length >= 2 && last5[0].quote > last5[last5.length - 1].quote ? "UPTREND" : "DOWNTREND";

    const advice = generateAdvice(analysisType, barrier, ticks);
    const confidence = Math.min(95, maxFreq > 0 ? maxFreq * (100 / Math.max(n50, 1)) * 3 : 0);

    return {
      evenPercent, oddPercent, overPercent, underPercent, frequencies,
      hotDigit, coldDigit,
      confidence: Math.round(Math.min(95, confidence)),
      trendDirection, advice, n50, n100: ticks.slice(0, 100).length,
    };
  }, [ticks, analysisType, barrier]);
}

// ── Type metadata ─────────────────────────────────────────────────────────────
export const ANALYSIS_TYPES: {
  type: AnalysisType;
  label: string;
  category: TradeCategory;
  hasBarrier: boolean;
  barrierLabel: string;
}[] = [
  { type: "even",          label: "Even",       category: "digits",      hasBarrier: false, barrierLabel: "" },
  { type: "odd",           label: "Odd",        category: "digits",      hasBarrier: false, barrierLabel: "" },
  { type: "over",          label: "Over",       category: "digits",      hasBarrier: true,  barrierLabel: "Barrier" },
  { type: "under",         label: "Under",      category: "digits",      hasBarrier: true,  barrierLabel: "Barrier" },
  { type: "matches",       label: "Matches",    category: "digits",      hasBarrier: true,  barrierLabel: "Digit" },
  { type: "differs",       label: "Differs",    category: "digits",      hasBarrier: true,  barrierLabel: "Digit" },
  { type: "rise",          label: "Rise",       category: "rise_fall",   hasBarrier: false, barrierLabel: "" },
  { type: "fall",          label: "Fall",       category: "rise_fall",   hasBarrier: false, barrierLabel: "" },
  { type: "higher",        label: "Higher",     category: "higher_lower",hasBarrier: false, barrierLabel: "" },
  { type: "lower",         label: "Lower",      category: "higher_lower",hasBarrier: false, barrierLabel: "" },
  { type: "touch",         label: "Touch",      category: "touch",       hasBarrier: false, barrierLabel: "" },
  { type: "no_touch",      label: "No Touch",   category: "touch",       hasBarrier: false, barrierLabel: "" },
  { type: "ends_in",       label: "Ends In",    category: "ends",        hasBarrier: false, barrierLabel: "" },
  { type: "ends_out",      label: "Ends Out",   category: "ends",        hasBarrier: false, barrierLabel: "" },
  { type: "multiplier_up", label: "Mult Up",    category: "multipliers", hasBarrier: false, barrierLabel: "" },
  { type: "multiplier_down",label: "Mult Down", category: "multipliers", hasBarrier: false, barrierLabel: "" },
];

export const TRADE_CATEGORIES: { id: TradeCategory; label: string; desc: string }[] = [
  { id: "digits",       label: "Digits",        desc: "Even, Odd, Over, Under, Matches, Differs" },
  { id: "rise_fall",    label: "Rise / Fall",   desc: "Predict if price rises or falls" },
  { id: "higher_lower", label: "Higher / Lower",desc: "Price vs auto-set barrier level" },
  { id: "touch",        label: "Touch",         desc: "Price touches a barrier or not" },
  { id: "ends",         label: "Ends In / Out", desc: "Price ends within or outside range" },
  { id: "multipliers",  label: "Multipliers",   desc: "Leveraged directional trades" },
];

export function generateAllTypeAdvice(ticks: Tick[], hotDigit: number) {
  return ANALYSIS_TYPES.map(at => {
    const autoBarrier = at.hasBarrier
      ? (at.type === "matches" || at.type === "differs" ? hotDigit : 4)
      : 4;
    const advice = generateAdvice(at.type, autoBarrier, ticks);
    return { type: at.type, label: at.label, category: at.category, advice, autoBarrier };
  });
}

export function getMultiMarketAdvice(
  tickMap: Record<string, Tick[]>,
  analysisType: AnalysisType,
  barrier: number
) {
  return Object.entries(tickMap)
    .map(([symbol, ticks]) => {
      const advice = generateAdvice(analysisType, barrier, ticks);
      return { symbol, market: symbol, ticks: ticks.length, advice };
    })
    .sort((a, b) => {
      if (a.advice.action === "BUY" && b.advice.action !== "BUY") return -1;
      if (b.advice.action === "BUY" && a.advice.action !== "BUY") return 1;
      return b.advice.probability - a.advice.probability;
    });
}
