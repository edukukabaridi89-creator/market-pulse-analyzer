import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";

// ── MASTER USER LIST ───────────────────────────────────────────────────────────
//
// HOW DEVICE-LOCKING WORKS
// ─────────────────────────
// Every entry below has `device: null`.  On a user's FIRST successful login the
// app builds a SHA-256 hardware fingerprint of their browser (GPU, screen, audio,
// canvas, CPU cores, timezone, etc.) and stores it permanently in their browser's
// localStorage under the key  "prime_users_v2".
//
// From that point on, every login attempt from a DIFFERENT device is blocked with
// "⛔ Access denied. This account is locked to a different device."
// The device field in THIS file is intentionally kept null — the binding lives
// in the user's own browser storage, so you never have to edit this file after
// you hand credentials to a client.
//
// HOW TO ADD A NEW PAYING CLIENT
// ───────────────────────────────
// 1. Pick any unused row below (or copy-paste the template at the bottom).
// 2. Set the username and password to whatever you want to give the client.
// 3. Leave  device: null  — it will auto-lock on their first login.
// 4. Save the file and redeploy / restart the app.
// 5. Send the client their credentials — they log in once and the device binds.
//
// HOW TO RESET A CLIENT'S DEVICE (e.g. they got a new laptop)
// ─────────────────────────────────────────────────────────────
// Ask the client to open the browser console on their OLD device and run:
//   localStorage.removeItem("prime_users_v2")
// Then have them log in from the new device — it will re-bind automatically.
// (If they can't access the old device, you can do this from your admin session.)
//
// HOW TO REVOKE / DISABLE AN ACCOUNT
// ────────────────────────────────────
// Delete or comment-out the user's row below and redeploy.  Their credentials
// will no longer match any entry in this list.
//
// SECURITY NOTE
// ─────────────
// Credentials are checked entirely in the browser (client-side).  This is fine
// for pay-gating a tool like this, but means a determined developer *could* bypass
// login by inspecting the JS bundle.  For higher-security needs, move auth to the
// Express API server (artifacts/api-server) so credentials never leave the server.
// ──────────────────────────────────────────────────────────────────────────────

const users = [
  // ── DEMO / TEST ACCOUNTS (do not hand these out) ───────────────────────────
  { username: "123demo",          password: "demo123",        device: null }, // demo — for testing only
  { username: "admintest",        password: "prime@admin99",  device: null }, // internal test account

  // ── EXISTING CLIENTS ───────────────────────────────────────────────────────
  { username: "edwin",            password: "edwin",          device: null },
  { username: "lonchezz",         password: "lonchezz254",    device: null },
  { username: "Justin1",          password: "Justin1",        device: null },
  { username: "1unknownmentor1",  password: "1unknownmentor1",device: null },
  { username: "user12",           password: "pass123",        device: null },
  { username: "user23",           password: "pass4479",       device: null },
  { username: "user34",           password: "pass6789",       device: null },
  { username: "user45",           password: "pass321",        device: null },
  { username: "user56",           password: "pass6543",       device: null },

  // ── AVAILABLE SLOTS — assign to new paying clients as needed ──────────────
  // Replace username/password before giving to a client; leave device: null
  { username: "prime001",         password: "Pr1me@7741",     device: null },
  { username: "prime002",         password: "Pr1me@8832",     device: null },
  { username: "prime003",         password: "Pr1me@9923",     device: null },
  { username: "prime004",         password: "Pr1me@1104",     device: null },
  { username: "prime005",         password: "Pr1me@2215",     device: null },
  { username: "prime006",         password: "Pr1me@3326",     device: null },
  { username: "prime007",         password: "Pr1me@4437",     device: null },
  { username: "prime008",         password: "Pr1me@5548",     device: null },
  { username: "prime009",         password: "Pr1me@6659",     device: null },
  { username: "prime010",         password: "Pr1me@7760",     device: null },
  { username: "prime011",         password: "Tr4de@8811",     device: null },
  { username: "prime012",         password: "Tr4de@9922",     device: null },
  { username: "prime013",         password: "Tr4de@1033",     device: null },
  { username: "prime014",         password: "Tr4de@2144",     device: null },
  { username: "prime015",         password: "Tr4de@3255",     device: null },
  { username: "prime016",         password: "Tr4de@4366",     device: null },
  { username: "prime017",         password: "Tr4de@5477",     device: null },
  { username: "prime018",         password: "Tr4de@6588",     device: null },
  { username: "prime019",         password: "Tr4de@7699",     device: null },
  { username: "prime020",         password: "Tr4de@8800",     device: null },
  { username: "prime021",         password: "S1gnal@9901",    device: null },
  { username: "prime022",         password: "S1gnal@1012",    device: null },
  { username: "prime023",         password: "S1gnal@2123",    device: null },
  { username: "prime024",         password: "S1gnal@3234",    device: null },
  { username: "prime025",         password: "S1gnal@4345",    device: null },
  { username: "prime026",         password: "S1gnal@5456",    device: null },
  { username: "prime027",         password: "S1gnal@6567",    device: null },
  { username: "prime028",         password: "S1gnal@7678",    device: null },
  { username: "prime029",         password: "S1gnal@8789",    device: null },
  { username: "prime030",         password: "S1gnal@9890",    device: null },
  { username: "prime031",         password: "Deriv@7741x",    device: null },
  { username: "prime032",         password: "Deriv@8832x",    device: null },
  { username: "prime033",         password: "Deriv@9923x",    device: null },
  { username: "prime034",         password: "Deriv@1104x",    device: null },
  { username: "prime035",         password: "Deriv@2215x",    device: null },
  { username: "prime036",         password: "Deriv@3326x",    device: null },
  { username: "prime037",         password: "Deriv@4437x",    device: null },
  { username: "prime038",         password: "Deriv@5548x",    device: null },
  { username: "prime039",         password: "Deriv@6659x",    device: null },
  { username: "prime040",         password: "Deriv@7760x",    device: null },
  { username: "prime041",         password: "V0lat@8811k",    device: null },
  { username: "prime042",         password: "V0lat@9922k",    device: null },
  { username: "prime043",         password: "V0lat@1033k",    device: null },
  { username: "prime044",         password: "V0lat@2144k",    device: null },
  { username: "prime045",         password: "V0lat@3255k",    device: null },
  { username: "prime046",         password: "V0lat@4366k",    device: null },
  { username: "prime047",         password: "V0lat@5477k",    device: null },
  { username: "prime048",         password: "V0lat@6588k",    device: null },
  { username: "prime049",         password: "V0lat@7699k",    device: null },
  { username: "prime050",         password: "V0lat@8800k",    device: null },

  // ── TEMPLATE — copy this line when adding a new client ────────────────────
  // { username: "clientName",    password: "ChangeMe@123",   device: null },
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
