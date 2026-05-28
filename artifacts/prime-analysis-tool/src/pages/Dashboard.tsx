import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Volume2, VolumeX, TrendingUp, TrendingDown, Server, Power, AlertCircle } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useDerivWS, Tick } from "@/hooks/useDerivWS";
import { useTickAnalysis } from "@/hooks/useTickAnalysis";

import { Sidebar } from "@/components/Sidebar";
import { DigitHeatmap } from "@/components/DigitHeatmap";
import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { TickChart } from "@/components/TickChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { ticks, isConnected } = useDerivWS();
  const analysis = useTickAnalysis(ticks);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Auth redirect
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  // Audio effect
  useEffect(() => {
    if (!soundEnabled) return;
    if (ticks.length === 0) return;
    
    // Play a short beep on new tick
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 800; // Hz
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }, [ticks, soundEnabled]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="w-8 h-8 text-primary animate-pulse" />
          <span className="text-muted-foreground font-mono text-sm uppercase tracking-widest">Initializing Terminal...</span>
        </div>
      </div>
    );
  }

  const latestTick = ticks[0] || null;

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      {/* Sidebar */}
      <Sidebar className="hidden md:flex" />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden relative">
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 glass-card shrink-0 flex items-center justify-between px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold">V100 Index Matrix</h2>
            <Badge variant="outline" className={`font-mono text-xs ${isConnected ? 'text-green-400 border-green-400/30 bg-green-400/10' : 'text-red-400 border-red-400/30 bg-red-400/10'}`}>
              <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {isConnected ? "LIVE" : "DISCONNECTED"}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full w-9 h-9 border-white/10"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
            </Button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-black/40">
              <Server className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-mono text-gray-300">Ping: ~45ms</span>
            </div>
          </div>
        </header>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto w-full">
          
          {/* Main Top Section - Signal & Last Digit */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Primary Signal Card */}
            <div className="glass-card rounded-2xl p-6 border border-primary/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="flex items-start justify-between relative z-10">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2 uppercase tracking-wider">
                    <AlertCircle className="w-4 h-4 text-primary" />
                    Market Bias Signal
                  </h3>
                  <div className="text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                    {analysis?.signalType || "ANALYZING"}
                    {analysis?.trendDirection === "UPTREND" && <TrendingUp className="w-8 h-8 text-green-400" />}
                    {analysis?.trendDirection === "DOWNTREND" && <TrendingDown className="w-8 h-8 text-red-400" />}
                  </div>
                  <div className="flex gap-4 pt-4">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Market Trend</span>
                      <span className={`font-bold ${analysis?.trendDirection === 'UPTREND' ? 'text-green-400' : 'text-red-400'}`}>
                        {analysis?.trendDirection || "--"}
                      </span>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Bias</span>
                      <span className="font-bold text-primary">{analysis?.marketBias || "--"}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <ConfidenceMeter confidence={analysis?.confidence || 0} />
                </div>
              </div>
            </div>

            {/* Analysis Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hot/Cold Matrix */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col gap-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Frequency Matrix (100t)</h3>
                <DigitHeatmap 
                  frequencies={analysis?.frequencies || Array(10).fill(0)} 
                  hotDigit={analysis?.hotDigit ?? -1} 
                  coldDigit={analysis?.coldDigit ?? -1} 
                />
              </div>

              {/* Distributions */}
              <div className="glass-card rounded-2xl p-5 border border-white/5 flex flex-col justify-center gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-primary">Even: {analysis?.evenPercent || 0}%</span>
                    <span className="text-secondary">Odd: {analysis?.oddPercent || 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-secondary/20 rounded-full overflow-hidden flex">
                    <div className="h-full bg-primary transition-all duration-500" style={{ width: `${analysis?.evenPercent || 50}%` }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-green-400">Over 4: {analysis?.overPercent || 0}%</span>
                    <span className="text-red-400">Under 5: {analysis?.underPercent || 0}%</span>
                  </div>
                  <div className="h-2 w-full bg-red-400/20 rounded-full overflow-hidden flex">
                    <div className="h-full bg-green-400 transition-all duration-500" style={{ width: `${analysis?.overPercent || 50}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="glass-card rounded-2xl p-5 border border-white/5">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Digit Distribution Chart</h3>
              <div className="h-[250px] w-full">
                <TickChart frequencies={analysis?.frequencies || Array(10).fill(0)} />
              </div>
            </div>

          </div>

          {/* Right Sidebar - Live Ticks */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Massive Last Digit Display */}
            <div className="glass-card rounded-2xl p-6 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden h-48">
              <div className="absolute top-0 right-0 p-4 text-xs font-mono text-muted-foreground">LIVE DIGIT</div>
              <AnimatePresence mode="popLayout">
                {latestTick && (
                  <motion.div
                    key={latestTick.epoch}
                    initial={{ y: 20, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -20, opacity: 0, scale: 1.2 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={`text-[8rem] font-black leading-none ${latestTick.lastDigit % 2 === 0 ? 'text-primary' : 'text-secondary'}`}
                  >
                    {latestTick.lastDigit}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tick Stream Table */}
            <div className="glass-card rounded-2xl border border-white/5 overflow-hidden flex-1 min-h-[400px] flex flex-col">
              <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Tick Stream
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <Table>
                  <TableHeader className="bg-transparent hover:bg-transparent">
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="text-xs">Quote</TableHead>
                      <TableHead className="text-xs">Type</TableHead>
                      <TableHead className="text-right text-xs">Digit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence initial={false}>
                      {ticks.slice(0, 20).map((tick, i) => {
                        const isEven = tick.lastDigit % 2 === 0;
                        return (
                          <motion.tr 
                            key={`${tick.epoch}-${i}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <TableCell className="font-mono text-sm text-gray-300">
                              {tick.quote.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] py-0 h-5 ${isEven ? 'text-primary border-primary/30' : 'text-secondary border-secondary/30'}`}>
                                {isEven ? 'EVEN' : 'ODD'}
                              </Badge>
                            </TableCell>
                            <TableCell className={`text-right font-bold text-lg ${isEven ? 'text-primary' : 'text-secondary'}`}>
                              {tick.lastDigit}
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}