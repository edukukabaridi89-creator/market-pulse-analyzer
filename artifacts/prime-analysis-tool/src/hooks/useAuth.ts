import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

const users = [
  { username: "123demo", password: "demo123", device: null },
  { username: "edwin", password: "edwin", device: null },
  { username: "user12", password: "pass123", device: null },
  { username: "user23", password: "pass4479", device: null },
  { username: "user34", password: "pass6789", device: null },
  { username: "user45", password: "pass321", device: null },
  { username: "user56", password: "pass6543", device: null },
  { username: "lonchezz", password: "lonchezz254", device: null },
  { username: "Justin", password: "Justin641", device: null },
  { username: "1unknownmentor1", password: "1unknownmentor1", device: null },
];

// ── Device Fingerprint ─────────────────────────────────────────────────────────
// Builds a stable, high-entropy fingerprint from multiple browser signals.
// The result is base64-encoded and used as a device ID bound to each account.
async function buildDeviceFingerprint(): Promise<string> {
  const components: string[] = [];

  // Browser/OS signals
  components.push(navigator.userAgent);
  components.push(navigator.language || "");
  components.push((navigator.languages || []).join(","));
  components.push(String(navigator.hardwareConcurrency ?? ""));
  components.push(String((navigator as any).deviceMemory ?? ""));
  components.push(navigator.platform || "");

  // Screen geometry
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  components.push(String(screen.pixelDepth ?? ""));
  components.push(String(window.devicePixelRatio ?? ""));

  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || "");

  // Canvas fingerprint — nearly unique per GPU/driver combo
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px 'Arial'";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText("PrimeAnalysisTool🔒", 2, 15);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText("PrimeAnalysisTool🔒", 4, 17);
      components.push(canvas.toDataURL());
    }
  } catch (_) {}

  // WebGL renderer string — GPU-level uniqueness
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      if (ext) {
        components.push(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || "");
        components.push(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "");
      }
    }
  } catch (_) {}

  // Audio fingerprint — subtle but stable oscillator characteristics
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      const analyser = audioCtx.createAnalyser();
      const oscillator = audioCtx.createOscillator();
      const dynamicsCompressor = audioCtx.createDynamicsCompressor();
      oscillator.connect(dynamicsCompressor);
      dynamicsCompressor.connect(analyser);
      oscillator.start(0);
      oscillator.stop(audioCtx.currentTime + 0.01);
      const buf = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(buf);
      components.push(buf.slice(0, 10).join(","));
      audioCtx.close();
    }
  } catch (_) {}

  // Hash the combined string using Web Crypto (SHA-256)
  const raw = components.join("|||");
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch (_) {
    // Fallback: simple base64
    return btoa(raw.slice(0, 200));
  }
}

// ── Attempt Tracking ───────────────────────────────────────────────────────────
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function getAttemptRecord(username: string): { count: number; lockedUntil: number } {
  try {
    const raw = sessionStorage.getItem(`prime_attempts_${username}`);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { count: 0, lockedUntil: 0 };
}

function recordFailedAttempt(username: string) {
  const rec = getAttemptRecord(username);
  rec.count += 1;
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  sessionStorage.setItem(`prime_attempts_${username}`, JSON.stringify(rec));
}

function clearAttempts(username: string) {
  sessionStorage.removeItem(`prime_attempts_${username}`);
}

// ── useAuth hook ───────────────────────────────────────────────────────────────
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

  const login = async (username?: string, password?: string) => {
    return new Promise<{ success: boolean; message?: string }>(async (resolve) => {
      // ── Brute-force lockout ──
      if (username) {
        const rec = getAttemptRecord(username);
        if (rec.lockedUntil > Date.now()) {
          const mins = Math.ceil((rec.lockedUntil - Date.now()) / 60_000);
          return resolve({
            success: false,
            message: `Too many failed attempts. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.`,
          });
        }
      }

      await new Promise(r => setTimeout(r, 500)); // simulate network

      const matchedUser = users.find(u => u.username === username && u.password === password);

      if (!matchedUser) {
        if (username) recordFailedAttempt(username);
        return resolve({ success: false, message: "Invalid username or password." });
      }

      // ── Build device fingerprint ──
      const currentDevice = await buildDeviceFingerprint();

      // ── Load persisted device bindings ──
      // We always use the canonical `users` array as the source of truth for
      // which accounts exist, and only read device bindings from storage.
      // This prevents "user not found" when storage is stale or partial.
      const deviceBindings: Record<string, string | null> = {};
      try {
        const sources = ["prime_users_v2", "prime_users"];
        for (const key of sources) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed: { username: string; device: string | null }[] = JSON.parse(raw);
            parsed.forEach(u => {
              if (u.username && !(u.username in deviceBindings)) {
                deviceBindings[u.username] = u.device ?? null;
              }
            });
            break;
          }
        }
      } catch (_) { /* ignore, bindings stay empty */ }

      // Rebuild from the canonical list, preserving any stored device binding
      const persistedUsers = users.map(u => ({
        ...u,
        device: (u.username in deviceBindings ? deviceBindings[u.username] : null) as string | null,
      }));

      const dbUser = persistedUsers.find(u => u.username === username)!;
      // dbUser is guaranteed to exist because matchedUser already confirmed the
      // username is in the canonical `users` array.

      // ── Device binding check ──
      if (dbUser.device === null) {
        // First login — bind this device permanently
        dbUser.device = currentDevice;
        localStorage.setItem("prime_users_v2", JSON.stringify(persistedUsers));
      } else if (dbUser.device !== currentDevice) {
        // Device mismatch — BLOCK
        recordFailedAttempt(username!);
        return resolve({
          success: false,
          message:
            "⛔ Access denied. This account is locked to a different device. " +
            "If you believe this is an error, contact support.",
        });
      }

      // ── Success ──
      clearAttempts(username!);
      localStorage.setItem(
        "prime_auth",
        JSON.stringify({ username, loggedIn: true, ts: Date.now() })
      );
      setUser({ username: username! });
      resolve({ success: true });
    });
  };

  const logout = useCallback(() => {
    localStorage.removeItem("prime_auth");
    setUser(null);
    setLocation("/login");
  }, [setLocation]);

  return { user, isLoading, login, logout };
}
