import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { Hexagon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await login(username, password);
    if (res.success) {
      setLocation("/dashboard");
    } else {
      setError(res.message || "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative">
      <div className="absolute top-0 left-0 w-full h-[500px] bg-primary/10 blur-[150px] pointer-events-none opacity-50" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center">
          <Hexagon className="w-12 h-12 text-primary fill-primary/20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white tracking-tight">Terminal Access</h1>
          <p className="text-muted-foreground mt-2">Enter your credentials to connect</p>
        </div>

        <div className="glass-card p-8 rounded-2xl shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="bg-black/50 border-white/10 h-12 focus-visible:ring-primary/50"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-black/50 border-white/10 h-12 focus-visible:ring-primary/50"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm font-medium">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-base shadow-[0_0_15px_rgba(0,198,255,0.2)]"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authenticate"}
            </Button>
          </form>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Don't have access?{" "}
          <Link href="/signup">
            <span className="text-primary hover:text-primary/80 font-medium cursor-pointer">Get Premium</span>
          </Link>
        </div>
      </div>
    </div>
  );
}