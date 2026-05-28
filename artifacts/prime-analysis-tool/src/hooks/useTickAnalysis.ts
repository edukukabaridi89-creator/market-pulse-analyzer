import { useMemo } from "react";
import { Tick } from "./useDerivWS";

export function useTickAnalysis(ticks: Tick[]) {
  const analysis = useMemo(() => {
    if (ticks.length === 0) return null;

    const last50 = ticks.slice(0, 50);
    const last100 = ticks.slice(0, 100);

    // Even / Odd
    const evenCount = last50.filter(t => t.lastDigit % 2 === 0).length;
    const oddCount = last50.length - evenCount;
    const evenPercent = Math.round((evenCount / Math.max(1, last50.length)) * 100);
    const oddPercent = Math.round((oddCount / Math.max(1, last50.length)) * 100);

    // Over 4 / Under 5
    const overCount = last50.filter(t => t.lastDigit > 4).length;
    const underCount = last50.length - overCount;
    const overPercent = Math.round((overCount / Math.max(1, last50.length)) * 100);
    const underPercent = Math.round((underCount / Math.max(1, last50.length)) * 100);

    // Frequencies
    const frequencies = Array(10).fill(0);
    last100.forEach(t => {
      frequencies[t.lastDigit]++;
    });

    const maxFreq = Math.max(...frequencies);
    const minFreq = Math.min(...frequencies);
    const dominantDigit = frequencies.indexOf(maxFreq);

    // Confidence
    // calculate from: the dominant digit's frequency × 10, capped at 95.
    // wait, if frequency is out of 100, maxFreq * 10 might be too high (e.g. 15 * 10 = 150). 
    // The instructions say: "dominant digit's frequency × 10, capped at 95".
    // Actually, out of 100, average freq is 10. So max might be 15-20. 
    // Wait, frequency out of 100 is literally maxFreq. So maxFreq * 10 could be 150.
    // Let's do (maxFreq / 100) * 10? No, "frequency × 10". I'll use exactly maxFreq * 10.
    const rawConfidence = maxFreq * 10;
    const confidence = Math.min(95, rawConfidence);

    // Signal logic
    let signalType = "WAITING";
    let marketBias = "NEUTRAL";
    if (evenPercent > 60) {
      signalType = "EVEN BIAS";
      marketBias = "BEARISH"; // just dummy correlation
    } else if (oddPercent > 60) {
      signalType = "ODD BIAS";
      marketBias = "BULLISH";
    } else if (overPercent > 60) {
      signalType = "OVER BIAS";
      marketBias = "BULLISH";
    } else if (underPercent > 60) {
      signalType = "UNDER BIAS";
      marketBias = "BEARISH";
    }

    // Trend Direction based on last 5
    const last5 = ticks.slice(0, 5);
    const isUp = last5.length >= 2 && last5[0].quote > last5[last5.length - 1].quote;
    const trendDirection = isUp ? "UPTREND" : "DOWNTREND";

    return {
      evenPercent,
      oddPercent,
      overPercent,
      underPercent,
      frequencies,
      hotDigit: dominantDigit,
      coldDigit: frequencies.indexOf(minFreq),
      confidence,
      signalType,
      marketBias,
      trendDirection
    };
  }, [ticks]);

  return analysis;
}