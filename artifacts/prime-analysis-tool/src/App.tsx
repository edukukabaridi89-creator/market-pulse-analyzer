import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import Analysis from "@/pages/Analysis";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import Trade from "@/pages/Trade";

import { TickProvider, useTick } from "@/contexts/TickContext";
import { DerivAuthProvider, extractOAuthTokens, TOKEN_STORAGE_KEY } from "@/contexts/DerivAuthContext";
import { AlertSystem } from "@/components/AlertSystem";

const queryClient = new QueryClient();

if (typeof document !== "undefined") {
  document.documentElement.classList.add("dark");
}

function OAuthCallback() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const token = extractOAuthTokens();
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
      window.history.replaceState({}, document.title, window.location.pathname);
      setLocation("/trade");
    } else {
      setLocation("/trade");
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-muted-foreground font-mono text-sm uppercase tracking-widest">Authorizing with Deriv...</span>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/analysis" component={Analysis} />
      <Route path="/history" component={History} />
      <Route path="/settings" component={Settings} />
      <Route path="/trade" component={Trade} />
      <Route path="/callback" component={OAuthCallback} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Global alert system reads from TickContext — must be inside TickProvider
function GlobalAlerts() {
  const { tickMap, allMarketsMode, analysisType, barrier } = useTick();
  return (
    <AlertSystem
      tickMap={tickMap}
      analysisType={analysisType}
      barrier={barrier}
      enabled={allMarketsMode && Object.keys(tickMap).length > 0}
    />
  );
}

function App() {
  useEffect(() => {
    const redirect = () => {
      window.location.href =
        "https://www.google.com/search?q=hauna+skills+za+kuhack+hii+go+better+yourself+then+comeback";
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      redirect();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (e.key === "F12") {
        e.preventDefault();
        redirect();
        return;
      }

      if (e.ctrlKey && e.shiftKey) {
        if (["i", "j", "c"].includes(key)) {
          e.preventDefault();
          redirect();
          return;
        }
      }

      if (e.ctrlKey && key === "u") {
        e.preventDefault();
        redirect();
        return;
      }

      if (e.metaKey && e.altKey) {
        if (["i", "j", "c"].includes(key)) {
          e.preventDefault();
          redirect();
          return;
        }
      }

      if (e.metaKey && key === "u") {
        e.preventDefault();
        redirect();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DerivAuthProvider>
          <TickProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <GlobalAlerts />
          </TickProvider>
        </DerivAuthProvider>
        <ShadcnToaster />
        <SonnerToaster theme="dark" position="bottom-right" />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
