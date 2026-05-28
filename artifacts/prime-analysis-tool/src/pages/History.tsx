import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { History as HistoryIcon, Download } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useTick } from "@/contexts/TickContext";
import { Sidebar } from "@/components/Sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { VOLATILITY_MARKETS } from "@/hooks/useDerivWS";

export default function History() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { ticks, isConnected, market, setMarket, setAllMarketsMode, marketInfo, filterTicks, settings } = useTick();
  const [filter, setFilter] = useState<"all" | "even" | "odd">("all");

  useEffect(() => {
    if (!isLoading && !user) setLocation("/login");
    setAllMarketsMode(false);
  }, [user, isLoading, setLocation, setAllMarketsMode]);

  const windowTicks = filterTicks(ticks);

  const stats = useMemo(() => {
    const n = windowTicks.length;
    if (n === 0) return null;
    const evenCount = windowTicks.filter(t => t.lastDigit % 2 === 0).length;
    const overCount = windowTicks.filter(t => t.lastDigit > 4).length;
    const frequencies = Array(10).fill(0);
    windowTicks.forEach(t => frequencies[t.lastDigit]++);
    const hotDigit = frequencies.indexOf(Math.max(...frequencies));
    const coldDigit = frequencies.indexOf(Math.min(...frequencies));
    return { n, evenCount, oddCount: n - evenCount, overCount, underCount: n - overCount, frequencies, hotDigit, coldDigit };
  }, [windowTicks]);

  const displayTicks = useMemo(() => {
    if (filter === "even") return windowTicks.filter(t => t.lastDigit % 2 === 0);
    if (filter === "odd") return windowTicks.filter(t => t.lastDigit % 2 !== 0);
    return windowTicks;
  }, [windowTicks, filter]);

  const copyCSV = () => {
    const header = "epoch,datetime,quote,digit,type";
    const rows = windowTicks.map(t => {
      const dt = new Date(t.epoch * 1000).toISOString();
      return `${t.epoch},${dt},${t.quote},${t.lastDigit},${t.lastDigit % 2 === 0 ? "even" : "odd"}`;
    });
    navigator.clipboard?.writeText([header, ...rows].join("\n"));
  };

  const windowLabel = settings.mode === "ticks"
    ? `${windowTicks.length} ticks`
    : `${settings.minutes} min (${windowTicks.length} ticks)`;

  if (isLoading || !user) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden text-foreground">
      <Sidebar className="hidden md:flex" />

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-white/5 glass-card shrink-0 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <HistoryIcon className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold">Tick History — {marketInfo?.name || market}</h2>
            <Badge
              variant="outline"
              className={`font-mono text-xs ${isConnected ? "text-green-400 border-green-400/30 bg-green-400/10" : "text-red-400 border-red-400/30 bg-red-400/10"}`}
            >
              <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isConnected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
              {isConnected ? "LIVE" : "DISCONNECTED"}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">Window: {windowLabel}</span>
            <Button variant="outline" size="sm" className="border-white/10 text-muted-foreground hover:text-white gap-2" onClick={copyCSV}>
              <Download className="w-3.5 h-3.5" /> Copy CSV
            </Button>
          </div>
        </header>

        <div className="p-4 md:p-6 max-w-[1400px] mx-auto w-full space-y-5">

          {/* Market selector */}
          <div className="glass-card rounded-2xl border border-white/5 p-4 flex flex-wrap items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Market</span>
            <div className="flex flex-wrap gap-2">
              {VOLATILITY_MARKETS.map(m => (
                <button
                  key={m.symbol}
                  onClick={() => setMarket(m.symbol)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    market === m.symbol
                      ? "bg-primary/20 border-primary/50 text-primary"
                      : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stats cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Ticks", value: stats.n, color: "text-white" },
                { label: "Even", value: `${stats.evenCount} (${Math.round(stats.evenCount / stats.n * 100)}%)`, color: "text-primary" },
                { label: "Odd", value: `${stats.oddCount} (${Math.round(stats.oddCount / stats.n * 100)}%)`, color: "text-secondary" },
                { label: "Over 4", value: `${stats.overCount} (${Math.round(stats.overCount / stats.n * 100)}%)`, color: "text-green-400" },
              ].map(s => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl border border-white/5 p-4">
                  <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                  <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Digit frequency breakdown */}
          {stats && (
            <div className="glass-card rounded-2xl border border-white/5 p-5 space-y-3">
              <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Digit Frequency Breakdown</h3>
              <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                {stats.frequencies.map((freq, digit) => {
                  const pct = stats.n > 0 ? Math.round(freq / stats.n * 100) : 0;
                  const isHot = digit === stats.hotDigit;
                  const isCold = digit === stats.coldDigit;
                  return (
                    <div key={digit} className={`rounded-xl p-3 text-center border ${
                      isHot  ? "border-orange-500/50 bg-orange-500/15" :
                      isCold ? "border-blue-500/50 bg-blue-500/10"     : "border-white/5 bg-white/[0.02]"
                    }`}>
                      <div className={`text-xl font-black ${isHot ? "text-orange-400" : isCold ? "text-blue-400" : "text-white"}`}>{digit}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{pct}%</div>
                      <div className="text-[10px] text-muted-foreground">{freq}×</div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Hot digit</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Cold digit</span>
              </div>
            </div>
          )}

          {/* Filter + table */}
          <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Full Tick Log ({displayTicks.length} entries)
              </h3>
              <div className="flex gap-2">
                {(["all", "even", "odd"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                      filter === f ? "bg-primary/20 border-primary/50 text-primary" : "border-white/10 text-muted-foreground hover:text-white"
                    }`}
                  >
                    {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent sticky top-0 bg-background">
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs">Quote</TableHead>
                    <TableHead className="text-xs">Digit</TableHead>
                    <TableHead className="text-xs">Even/Odd</TableHead>
                    <TableHead className="text-xs">Over/Under</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence initial={false}>
                    {displayTicks.map((tick, i) => {
                      const isEven = tick.lastDigit % 2 === 0;
                      const isOver = tick.lastDigit > 4;
                      const time = new Date(tick.epoch * 1000).toLocaleTimeString();
                      return (
                        <motion.tr
                          key={`${tick.epoch}-${i}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <TableCell className="text-xs text-muted-foreground font-mono">{i + 1}</TableCell>
                          <TableCell className="font-mono text-xs text-gray-400">{time}</TableCell>
                          <TableCell className="font-mono text-sm text-gray-200">{tick.quote.toFixed(2)}</TableCell>
                          <TableCell className={`font-black text-lg ${isEven ? "text-primary" : "text-secondary"}`}>{tick.lastDigit}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] py-0 h-5 ${isEven ? "text-primary border-primary/30" : "text-secondary border-secondary/30"}`}>
                              {isEven ? "EVEN" : "ODD"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] py-0 h-5 ${isOver ? "text-green-400 border-green-400/30" : "text-red-400 border-red-400/30"}`}>
                              {isOver ? "OVER 4" : "UNDER 5"}
                            </Badge>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
              {displayTicks.length === 0 && (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  Waiting for ticks... Connect to a market to see history.
                </div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
