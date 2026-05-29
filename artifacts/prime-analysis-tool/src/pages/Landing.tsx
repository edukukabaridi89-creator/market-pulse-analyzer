import React, { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Activity, ShieldAlert, Cpu, Zap, ArrowRight, Hexagon, BarChart2,
  TrendingUp, Bell, Target, Layers, ChevronDown, ChevronUp, CheckCircle2,
  BarChart, LineChart, Shield, Clock, DollarSign, BookOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Zap,
    title: "Sub-Millisecond Tick Feed",
    desc: "Direct WebSocket connection to the Deriv API. Every price tick is processed the moment it arrives — zero intermediary delay."
  },
  {
    icon: BarChart2,
    title: "Digit Probability Matrices",
    desc: "Even/Odd, Over/Under, Matches/Differs — all computed over a 50-tick sliding window with real-time frequency scoring."
  },
  {
    icon: Cpu,
    title: "Algorithmic Confidence Engine",
    desc: "Proprietary scoring ranks signal validity using historical frequency, streak detection, and volatility weighting."
  },
  {
    icon: TrendingUp,
    title: "Rise / Fall & Higher / Lower",
    desc: "Momentum and trend analysis across all Deriv contract types, with auto-computed price barriers."
  },
  {
    icon: Target,
    title: "Touch & Ends In/Out Signals",
    desc: "Volatility-based barrier signals for Touch, No Touch, Ends In, and Ends Out contracts — updated live."
  },
  {
    icon: Layers,
    title: "Multiplier Momentum Tracker",
    desc: "Detect strong directional streaks for Multiplier Up/Down contracts. Includes stop-loss guidance for every entry."
  },
  {
    icon: Bell,
    title: "Multi-Market Coverage",
    desc: "All 10 Volatility Index markets (R_10 – R_100 + 1s variants) available simultaneously in one dashboard."
  },
  {
    icon: LineChart,
    title: "Live P&L & Trade History",
    desc: "Every trade placed through the tool is logged with outcome tracking, so you can review your performance over time."
  },
  {
    icon: Shield,
    title: "Deriv OAuth Integration",
    desc: "Login with your real Deriv account securely via OAuth. Trade directly from the dashboard — no copy-pasting needed."
  },
];

const STEPS = [
  {
    step: "01",
    title: "Create Your Account",
    desc: "Sign up on PrimeAnalysisTool and log in. No Deriv account required to browse signals."
  },
  {
    step: "02",
    title: "Connect Your Deriv Account",
    desc: "Click 'Connect Deriv' to authorise via OAuth. Your Deriv token is stored locally — we never see your credentials."
  },
  {
    step: "03",
    title: "Pick a Market & Trade Type",
    desc: "Select from 10 volatility markets and 6 trade categories. The dashboard streams live signals and probability scores instantly."
  },
  {
    step: "04",
    title: "Read the Signal, Place the Trade",
    desc: "When confidence is high the signal card turns green. Set your stake, review the auto-computed barrier, and hit BUY — all within the tool."
  },
];

const TERMS = [
  "PrimeAnalysisTool is an independent analytics platform and is not affiliated with, endorsed by, or in partnership with Deriv Ltd.",
  "All signals, probability scores, and recommendations are generated algorithmically from live market data. They are indicative only and do not constitute financial advice.",
  "Trading in financial markets involves significant risk. You may lose some or all of your invested capital. Never trade with money you cannot afford to lose.",
  "Past signal performance does not guarantee future results. Market conditions change and no algorithm can predict outcomes with certainty.",
  "You are solely responsible for all trading decisions made using this tool. PrimeAnalysisTool and its operators accept no liability for trading losses.",
  "Access is granted on a lifetime basis upon one-time payment. Refunds are not available once access has been granted and the dashboard accessed.",
  "You agree not to reverse-engineer, resell, or redistribute any part of this platform or its underlying signal algorithms.",
  "We reserve the right to update these terms at any time. Continued use of the platform constitutes acceptance of the current terms.",
];

export default function Landing() {
  const [termsOpen, setTermsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30">

      {/* ── Navbar ── */}
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
              Get Access — $200
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
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
            <span>Deriv Markets Analysis — All 6 Trade Categories</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight">
            Real-Time Deriv <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Market Intelligence</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            A high-end trading intelligence dashboard built for precision. Deep tick analysis, probability heatmaps, live signal generation, and one-click trading — all in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/signup">
              <Button size="lg" className="h-14 px-8 text-base bg-white text-black hover:bg-gray-200 border-none">
                Get Lifetime Access — $200
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="h-14 px-8 text-base glass-card">
                Dashboard Login
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            One-time payment · Lifetime access · No subscription
          </p>
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6 relative border-t border-white/5 bg-black/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono uppercase tracking-wider mb-4">
              <BarChart className="w-3.5 h-3.5" /> Features
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything You Need to Trade Smarter</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              PrimeAnalysisTool processes the Deriv tick stream across all markets and trade types in real time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <FeatureCard icon={f.icon} title={f.title} desc={f.desc} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section id="how-it-works" className="py-24 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono uppercase tracking-wider mb-4">
              <BookOpen className="w-3.5 h-3.5" /> How It Works
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">From Signal to Trade in 4 Steps</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              The entire flow from market connection to placing a trade takes under 60 seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="glass-card rounded-2xl border border-white/5 p-6 flex gap-5"
              >
                <div className="shrink-0 w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <span className="text-primary font-black text-sm font-mono">{s.step}</span>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg mb-1">{s.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-24 px-6 border-t border-white/5 bg-black/20">
        <div className="max-w-xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-mono uppercase tracking-wider mb-6">
            <DollarSign className="w-3.5 h-3.5" /> Pricing
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Simple. One-Time. Forever.</h2>
          <p className="text-muted-foreground mb-10">No monthly fees. No hidden charges. Pay once, use forever.</p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass-card rounded-3xl border border-primary/30 p-8 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold mb-4">
                LIFETIME ACCESS
              </div>
              <div className="flex items-end justify-center gap-2 mb-6">
                <span className="text-6xl font-black text-white">$200</span>
                <span className="text-muted-foreground mb-2">one-time</span>
              </div>
              <ul className="space-y-3 text-sm text-left mb-8">
                {[
                  "All 6 trade categories — Digits, Rise/Fall, Higher/Lower, Touch, Ends In/Out, Multipliers",
                  "10 Volatility Index markets covered simultaneously",
                  "Live tick feed via Deriv WebSocket",
                  "Algorithmic signal scoring + probability bars",
                  "One-click trading via Deriv OAuth",
                  "Trade history & P&L tracking",
                  "Lifetime updates included",
                ].map(item => (
                  <li key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup">
                <Button size="lg" className="w-full h-14 text-base bg-gradient-to-r from-primary to-[#0055ff] border-none text-white shadow-[0_0_30px_rgba(0,198,255,0.3)] hover:opacity-90">
                  Proceed to Tool — $200
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground mt-3">
                Secure checkout · Instant access after payment
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Terms & Conditions ── */}
      <section id="terms" className="py-16 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setTermsOpen(v => !v)}
            className="w-full flex items-center justify-between text-left group"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <span className="text-white font-semibold text-lg">Terms & Conditions / Risk Disclaimer</span>
            </div>
            {termsOpen
              ? <ChevronUp className="w-5 h-5 text-muted-foreground" />
              : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>

          {termsOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 glass-card rounded-2xl border border-white/5 p-6 space-y-4"
            >
              {TERMS.map((t, i) => (
                <div key={i} className="flex gap-3 text-sm text-muted-foreground leading-relaxed">
                  <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                  <p>{t}</p>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2 border-t border-white/5">
                Last updated: May 2026. By creating an account and accessing PrimeAnalysisTool, you confirm you have read, understood, and agree to all terms above.
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* ── CTA Footer ── */}
      <section className="py-32 px-6 relative overflow-hidden flex flex-col items-center text-center border-t border-white/5">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="relative z-10 max-w-2xl space-y-6">
          <ShieldAlert className="w-12 h-12 text-primary mx-auto opacity-80" />
          <h2 className="text-4xl font-bold text-white">Ready to Trade Smarter?</h2>
          <p className="text-lg text-muted-foreground">Lifetime access. One-time payment of $200. Unparalleled market vision.</p>
          <Link href="/signup">
            <Button size="lg" className="mt-4 bg-gradient-to-r from-primary to-[#0055ff] border-none text-white h-14 px-10 shadow-[0_0_30px_rgba(0,198,255,0.3)] hover:opacity-90">
              Proceed to Tool — $200
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground">
            By proceeding you confirm you have read and accepted the Terms & Conditions above.
          </p>
        </div>
      </section>

    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="glass-card p-6 rounded-2xl flex flex-col gap-4 group hover:bg-white/[0.05] transition-colors h-full">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
    </div>
  );
}
