import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

const users = [
  { username: "demo", password: "demo123", device: null },
  { username: "user1", password: "pass123", device: null },
  { username: "user2", password: "pass4479", device: null },
  { username: "user3", password: "pass789", device: null },
  { username: "user4", password: "pass321", device: null },
  { username: "user5", password: "pass654", device: null },
  { username: "unknownmentor", password: "unknownmentor1", device: null },
];

export function useAuth() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const authData = localStorage.getItem("prime_auth");
        if (authData) {
          const parsed = JSON.parse(authData);
          if (parsed.loggedIn) {
            setUser({ username: parsed.username });
          }
        }
      } catch (e) {
        console.error("Auth parse error", e);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const generateDeviceFingerprint = () => {
    return btoa(navigator.userAgent + window.screen.width + window.screen.height);
  };

  const login = async (username?: string, password?: string) => {
    return new Promise<{ success: boolean; message?: string }>((resolve) => {
      setTimeout(() => {
        const matchedUser = users.find(u => u.username === username && u.password === password);
        
        if (!matchedUser) {
          return resolve({ success: false, message: "Invalid username or password." });
        }

        const currentDevice = generateDeviceFingerprint();
        
        // Load persisted users to check bindings
        let persistedUsers = [];
        try {
          const stored = localStorage.getItem("prime_users");
          if (stored) {
            persistedUsers = JSON.parse(stored);
          } else {
            // First time ever initializing
            persistedUsers = [...users];
            localStorage.setItem("prime_users", JSON.stringify(persistedUsers));
          }
        } catch (e) {
          persistedUsers = [...users];
        }

        const dbUser = persistedUsers.find(u => u.username === username);

        if (!dbUser) {
           return resolve({ success: false, message: "User not found in db." });
        }

        if (dbUser.device === null) {
          // First login for this user, bind device
          dbUser.device = currentDevice;
          localStorage.setItem("prime_users", JSON.stringify(persistedUsers));
        } else if (dbUser.device !== currentDevice) {
          // Device mismatch
          return resolve({ success: false, message: "This account is locked to another device." });
        }

        // Success
        localStorage.setItem("prime_auth", JSON.stringify({ username, loggedIn: true }));
        setUser({ username });
        resolve({ success: true });
      }, 500); // fake network delay
    });
  };

  const logout = useCallback(() => {
    localStorage.removeItem("prime_auth");
    setUser(null);
    setLocation("/login");
  }, [setLocation]);

  return { user, isLoading, login, logout };
}
