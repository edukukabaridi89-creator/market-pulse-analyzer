import React from "react";
import { Link } from "wouter";
import { Hexagon, CheckCircle2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Signup() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-[20%] right-0 w-[500px] h-[500px] bg-secondary/10 blur-[150px] pointer-events-none opacity-50" />
      
      <div className="w-full max-w-lg space-y-8 relative z-10">
        <div className="text-center">
          <Hexagon className="w-12 h-12 text-primary fill-primary/20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white tracking-tight">Premium Access</h1>
          <p className="text-muted-foreground mt-2">Unlock the ultimate Deriv analysis dashboard</p>
        </div>

        <div className="glass-card rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          <div className="p-8 text-center border-b border-white/5 bg-white/[0.02]">
            <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase mb-4 border border-primary/20">
              Lifetime License
            </span>
            <div className="flex items-center justify-center gap-1">
              <span className="text-3xl font-bold text-muted-foreground">$</span>
              <span className="text-6xl font-black text-white tracking-tighter">100</span>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">One-time payment. No recurring fees.</p>
          </div>
          
          <div className="p-8 space-y-6">
            <ul className="space-y-4">
              {[
                "Lifetime access to PrimeAnalysisTool",
                "Real-time R_100 market data stream",
                "Algorithmic probability heatmaps",
                "Automated confidence signal engine",
                "Mobile-optimized dark dashboard",
              ].map((feat, i) => (
                <li key={i} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-gray-300">{feat}</span>
                </li>
              ))}
            </ul>

            <a 
              href="https://wa.me/254743765104?text=Hello%20PrimeAnalysisTool,%20how%20do%20I%20pay%20for%20login%20credentials?" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full"
            >
              <Button className="w-full h-14 bg-gradient-to-r from-primary to-[#0055ff] border-none text-white text-base font-semibold shadow-[0_0_20px_rgba(0,198,255,0.3)] hover:shadow-[0_0_30px_rgba(0,198,255,0.5)] transition-all flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Pay & Get Access via WhatsApp
              </Button>
            </a>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login">
            <span className="text-primary hover:text-primary/80 font-medium cursor-pointer">Login here</span>
          </Link>
        </div>
      </div>
    </div>
  );
}