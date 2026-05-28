import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { toast } from "sonner";

const APP_ID = import.meta.env.VITE_DERIV_APP_ID || "1089";

export interface DerivAccount {
  loginid: string;
  balance: number;
  currency: string;
  email: string;
  fullname: string;
  isVirtual: boolean;
}

interface DerivAuthContextValue {
  derivToken: string | null;
  account: DerivAccount | null;
  isDerivAuthed: boolean;
  isAuthorizing: boolean;
  loginWithDeriv: () => void;
  logoutDeriv: () => void;
  setBalance: (balance: number) => void;
  appId: string;
}

const DerivAuthContext = createContext<DerivAuthContextValue | null>(null);
const TOKEN_KEY = "deriv_oauth_token";

function buildOAuthUrl(): string {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
  const redirectUri = encodeURIComponent(`${window.location.origin}${base}/callback`);
  return `https://oauth.deriv.com/oauth2/authorize?app_id=${APP_ID}&l=EN&brand=deriv&redirect_uri=${redirectUri}`;
}

export function DerivAuthProvider({ children }: { children: ReactNode }) {
  const [derivToken, setDerivToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY)
  );
  const [account, setAccount] = useState<DerivAccount | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  const logoutDeriv = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setDerivToken(null);
    setAccount(null);
    toast("Logged out from Deriv");
  }, []);

  const loginWithDeriv = useCallback(() => {
    window.location.href = buildOAuthUrl();
  }, []);

  const setBalance = useCallback((balance: number) => {
    setAccount(prev => prev ? { ...prev, balance } : prev);
  }, []);

  useEffect(() => {
    if (!derivToken) return;
    setIsAuthorizing(true);

    const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ authorize: derivToken }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.error) {
        toast.error(`Deriv auth failed: ${data.error.message}`);
        logoutDeriv();
        setIsAuthorizing(false);
        ws.close();
        return;
      }

      if (data.authorize) {
        const { balance, currency, email, fullname, loginid, account_list } = data.authorize;
        const isVirtual = account_list?.[0]?.is_virtual === 1;
        setAccount({ loginid, balance, currency, email, fullname, isVirtual });
        setIsAuthorizing(false);
        toast.success(`Welcome, ${fullname || loginid}`);
        ws.close();
      }
    };

    ws.onerror = () => {
      setIsAuthorizing(false);
      ws.close();
    };

    return () => {
      ws.onclose = null;
      ws.close();
    };
  }, [derivToken, logoutDeriv]);

  return (
    <DerivAuthContext.Provider value={{
      derivToken,
      account,
      isDerivAuthed: !!account,
      isAuthorizing,
      loginWithDeriv,
      logoutDeriv,
      setBalance,
      appId: APP_ID,
    }}>
      {children}
    </DerivAuthContext.Provider>
  );
}

export function useDerivAuth() {
  const ctx = useContext(DerivAuthContext);
  if (!ctx) throw new Error("useDerivAuth must be inside DerivAuthProvider");
  return ctx;
}

export function extractOAuthTokens(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("token1");
}

export const TOKEN_STORAGE_KEY = TOKEN_KEY;
