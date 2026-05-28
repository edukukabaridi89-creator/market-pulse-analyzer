import React from "react";
import { motion } from "framer-motion";

interface ConfidenceMeterProps {
  confidence: number;
}

export function ConfidenceMeter({ confidence }: ConfidenceMeterProps) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  let color = "text-primary";
  if (confidence < 40) color = "text-destructive";
  else if (confidence < 70) color = "text-yellow-400";

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg className="w-full h-full transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-white/5"
        />
        {/* Foreground Arc */}
        <motion.circle
          cx="64"
          cy="64"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          strokeLinecap="round"
          className={color}
          style={{ dropShadow: "0 0 8px currentColor" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-2xl font-bold font-mono tracking-tighter">{confidence}%</span>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Confidence</span>
      </div>
    </div>
  );
}