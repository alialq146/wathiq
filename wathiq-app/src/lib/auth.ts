/**
 * Session-token layer for Wathiq's account system.
 *
 * IMPORTANT: this module is imported by `middleware.ts`, so it must stay
 * **Edge-compatible** — Web Crypto / TextEncoder / base64 only. Anything that
 * needs Node (scrypt password hashing, Prisma) lives in `password.ts` and
 * `session.ts` instead.
 *
 * Enable modes (checked in this order):
 * 1. **Accounts mode** — a database URL is configured → users sign up and
 *    sign in against the `User` table.
 * 2. **Owner mode (legacy)** — no database, but `WATHIQ_AUTH_EMAIL` +
 *    `WATHIQ_AUTH_PASSWORD` are set → single fixed credential.
 * 3. **Open mode** — neither configured → no auth at all; the app stays
 *    public exactly as before. Safe by default.
 */

export const SESSION_COOKIE = "wathiq_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

/** Mirrors resolveDatabaseUrl() in db.ts without importing Prisma (Edge-safe). */
export function hasDatabaseEnv(): boolean {
  return Boolean(
    env("DATABASE_URL") ||
      env("POSTGRES_PRISMA_URL") ||
      env("POSTGRES_URL") ||
      env("DATABASE_URL_UNPOOLED") ||
      env("POSTGRES_URL_NON_POOLING")
  );
}

/** Legacy single-credential mode (kept for DB-less deployments). */
export function ownerModeConfigured(): boolean {
  return Boolean(env("WATHIQ_AUTH_EMAIL") && env("WATHIQ_AUTH_PASSWORD"));
}

/** Whether the app should require sign-in at all. */
export function authEnabled(): boolean {
  return hasDatabaseEnv() || ownerModeConfigured();
}

/**
 * Secret used to sign session cookies. Priority:
 * explicit secret → legacy password → the database URL (always present in
 * accounts mode, unique per deployment, and never sent to clients).
 */
function sessionSecret(): string {
  return (
    env("WATHIQ_SESSION_SECRET") ||
    env("WATHIQ_AUTH_PASSWORD") ||
    env("DATABASE_URL") ||
    env("POSTGRES_PRISMA_URL") ||
    env("POSTGRES_URL") ||
    env("DATABASE_URL_UNPOOLED") ||
    env("POSTGRES_URL_NON_POOLING")
  );
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
export function safeEqual(a: string, b: string): boolean {
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

/* ---------------- owner-mode credentials ---------------- */

/** Verify a submitted email + password against the legacy env credentials. */
export function verifyOwnerCredentials(email: string, password: string): boolean {
  if (!ownerModeConfigured()) return false;
  const okEmail = safeEqual(email.trim().toLowerCase(), env("WATHIQ_AUTH_EMAIL").toLowerCase());
  const okPass = safeEqual(password, env("WATHIQ_AUTH_PASSWORD"));
  return okEmail && okPass;
}

/* ---------------- session tokens ---------------- */

export interface SessionUser {
  /** User id from the database, or "owner" in legacy env-credential mode. */
  uid: string;
  name: string;
  email: string;
}

interface SessionPayload extends SessionUser {
  iat: number;
  exp: number;
}

/** Create a signed session token for the given user. */
export async function createSessionToken(user: SessionUser, nowSeconds: number): Promise<string> {
  const payload: SessionPayload = {
    ...user,
    iat: nowSeconds,
    exp: nowSeconds + SESSION_TTL_SECONDS,
  };
  const body = b64urlEncodeStr(JSON.stringify(payload));
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

/**
 * Verify a token's signature + expiry and return its user, or null.
 * `nowSeconds` is passed in so the caller controls the clock (Edge-safe).
 */
export async function readSessionToken(
  token: string | undefined,
  nowSeconds: number
): Promise<SessionUser | null> {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(body);
  if (!safeEqual(sig, expected)) return null;
  try {
    const p = JSON.parse(b64urlDecodeStr(body)) as SessionPayload;
    if (typeof p.exp !== "number" || p.exp <= nowSeconds) return null;
    if (typeof p.uid !== "string" || !p.uid) return null;
    return { uid: p.uid, name: String(p.name ?? ""), email: String(p.email ?? "") };
  } catch {
    return null;
  }
}

/** Boolean convenience used by the middleware. */
export async function verifySessionToken(
  token: string | undefined,
  nowSeconds: number
): Promise<boolean> {
  return (await readSessionToken(token, nowSeconds)) !== null;
}
