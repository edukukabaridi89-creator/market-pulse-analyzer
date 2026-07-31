import { useCallback } from "react";
import { useLocation } from "wouter";

// Auth is bypassed — all users are treated as authenticated guests.
// The market analyser works without any login.

export function useAuth() {
  const [, setLocation] = useLocation();

  const login = useCallback(async (_username: string, _password: string) => {
    return { success: true, message: "" };
  }, []);

  const logout = useCallback(() => {
    setLocation("/");
  }, [setLocation]);

  return {
    user: { username: "guest" },
    isLoading: false,
    login,
    logout,
  };
}
