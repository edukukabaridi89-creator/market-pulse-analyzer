import React from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Activity, ShieldAlert, Cpu, Zap, ArrowRight, Hexagon, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary/30">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 h-20 z-50 glass-card border-x-0 border-t-0 border-b border-white/5 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Hexagon className="w-6 h-6 text-primary fill-primary/20" />
          <span className="font-bold text-xl tracking-tight">PrimeAnalysisTool</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-muted-foreground hover:text-white">Login</Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-gradient-to-r from-[#00c6ff] to-[#0072ff] hover:opacity-90 shadow-[0_0_15px_rgba(0,198,255,0.4)] border-none">
              Get Access
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 px-6 min-h-[90vh] flex flex-col items-center justify-center text-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen" />
          <div className="absolute top-[40%] right-[20%] w-[400px] h-[400px] bg-secondary/20 rounded-full blur-[100px] mix-blend-screen" />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 max-w-4xl mx-auto space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-medium mb-4">
            <Activity className="w-4 h-4" />
            <span>Deriv Digit Markets Analysis v2.0</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight">
            Real-Time Deriv <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Market Intelligence</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            A high-end trading intelligence dashboard built for precision. Deep tick analysis, probability heatmaps, and live signal generation.
          </p>
          
          <div className="flex items-center justify-center gap-4 pt-4">
            <Link href="/signup">
              <Button size="lg" className="h-14 px-8 text-base bg-white text-black hover:bg-gray-200 border-none">
                Start Analyzing
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-14 px-8 text-base glass-card">
                Dashboard Login
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 relative border-t border-white/5 bg-black/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Unfair Advantage Delivered</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">We process the Deriv tick stream in real-time, providing institutional-grade visual analytics.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard 
              icon={Zap}
              title="Sub-Millisecond Ticks"
              desc="Direct WebSocket connection to the Deriv API ensuring zero latency between market moves and your dashboard."
            />
            <FeatureCard 
              icon={BarChart2}
              title="Probability Matrices"
              desc="Even/Odd and Over/Under statistical distribution over 50-tick sliding windows."
            />
            <FeatureCard 
              icon={Cpu}
              title="Algorithmic Confidence"
              desc="Proprietary scoring engine ranks signal validity based on deep historical frequency."
            />
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-32 px-6 relative overflow-hidden flex flex-col items-center text-center border-t border-white/5">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="relative z-10 max-w-2xl space-y-6">
          <ShieldAlert className="w-12 h-12 text-primary mx-auto opacity-80" />
          <h2 className="text-4xl font-bold text-white">Join the Elite Tier</h2>
          <p className="text-lg text-muted-foreground">Lifetime access. One-time payment. Unparalleled market vision.</p>
          <Link href="/signup">
            <Button size="lg" className="mt-4 bg-gradient-to-r from-primary to-[#0055ff] border-none text-white h-14 px-10 shadow-[0_0_30px_rgba(0,198,255,0.3)]">
              Unlock Premium Access
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="glass-card p-8 rounded-2xl flex flex-col gap-4 group hover:bg-white/[0.05] transition-colors">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}