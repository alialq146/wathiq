/**
 * Minimal, self-contained authentication for Wathiq.
 *
 * Design goals:
 * - **Safe by default:** if no credentials are configured via environment
 *   variables, auth is DISABLED and the app stays fully open (current
 *   behaviour). It can never lock out the deployed site by accident.
 * - **Edge-compatible:** uses only Web Crypto / TextEncoder / base64, so the
 *   exact same code runs in `middleware.ts` (Edge runtime) and in Node route
 *   handlers.
 * - **Stateless sessions:** an HMAC-signed cookie token, no session store.
 *
 * Configure by setting these environment variables (e.g. in Vercel):
 *   WATHIQ_AUTH_EMAIL     — the sign-in email
 *   WATHIQ_AUTH_PASSWORD  — the sign-in password
 *   WATHIQ_SESSION_SECRET — (optional) signing secret; falls back to the password
 */

export const SESSION_COOKIE = "wathiq_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** Auth is only active when both an email and a password are configured. */
export function authConfigured(): boolean {
  return Boolean(env("WATHIQ_AUTH_EMAIL") && env("WATHIQ_AUTH_PASSWORD"));
}

function sessionSecret(): string {
  return env("WATHIQ_SESSION_SECRET") || env("WATHIQ_AUTH_PASSWORD");
}

/* ---------------- encoding helpers ---------------- */

const encoder = new TextEncoder();

function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlEncodeStr(s: string): string {
  return b64urlEncode(encoder.encode(s));
}

function b64urlDecodeStr(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** Constant-time string comparison. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return b64urlEncode(sig);
}

/* ---------------- credentials ---------------- */

/** Verify a submitted email + password against the configured values. */
export function verifyCredentials(email: string, password: string): boolean {
  if (!authConfigured()) return false;
  const okEmail = safeEqual(email.trim().toLowerCase(), env("WATHIQ_AUTH_EMAIL").toLowerCase());
  const okPass = safeEqual(password, env("WATHIQ_AUTH_PASSWORD"));
  return okEmail && okPass;
}

/* ---------------- session tokens ---------------- */

interface SessionPayload {
  sub: string; // email
  iat: number; // issued-at (epoch seconds)
  exp: number; // expiry (epoch seconds)
}

/** Create a signed session token for the given subject. */
export async function createSessionToken(sub: string, nowSeconds: number): Promise<string> {
  const payload: SessionPayload = {
    sub,
    iat: nowSeconds,
    exp: nowSeconds + SESSION_TTL_SECONDS,
  };
  const body = b64urlEncodeStr(JSON.stringify(payload));
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

/**
 * Verify a session token's signature and expiry.
 * `nowSeconds` is passed in so the caller controls the clock (Edge-safe).
 */
export async function verifySessionToken(
  token: string | undefined,
  nowSeconds: number
): Promise<boolean> {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(body);
  if (!safeEqual(sig, expected)) return false;
  try {
    const payload = JSON.parse(b64urlDecodeStr(body)) as SessionPayload;
    return typeof payload.exp === "number" && payload.exp > nowSeconds;
  } catch {
    return false;
  }
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
