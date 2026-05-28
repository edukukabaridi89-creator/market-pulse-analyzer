import React from "react";
import { motion } from "framer-motion";

interface DigitHeatmapProps {
  frequencies: number[];
  hotDigit: number;
  coldDigit: number;
}

export function DigitHeatmap({ frequencies, hotDigit, coldDigit }: DigitHeatmapProps) {
  const maxFreq = Math.max(...frequencies, 1);

  return (
    <div className="grid grid-cols-5 gap-2">
      {frequencies.map((freq, digit) => {
        const isHot = digit === hotDigit;
        const isCold = digit === coldDigit;
        const intensity = freq / maxFreq;

        let bgColor = "bg-white/5";
        let borderColor = "border-white/10";
        let textColor = "text-muted-foreground";

        if (isHot) {
          bgColor = "bg-primary/20";
          borderColor = "border-primary/50";
          textColor = "text-primary";
        } else if (isCold) {
          bgColor = "bg-destructive/10";
          borderColor = "border-destructive/30";
          textColor = "text-destructive";
        }

        return (
          <motion.div
            key={digit}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={`flex flex-col items-center justify-center p-2 rounded-md border ${bgColor} ${borderColor} transition-colors duration-300`}
          >
            <span className={`text-lg font-bold ${textColor}`}>{digit}</span>
            <span className="text-[10px] text-muted-foreground">{freq}</span>
            {/* Tiny progress bar inside the box */}
            <div className="w-full h-1 bg-black/20 rounded-full mt-1 overflow-hidden">
              <div 
                className={`h-full ${isHot ? 'bg-primary' : isCold ? 'bg-destructive' : 'bg-white/20'}`} 
                style={{ width: `${intensity * 100}%` }} 
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}