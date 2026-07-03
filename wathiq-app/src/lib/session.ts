/**
 * Server-side session access (Server Components, Server Actions, routes).
 * Reads the signed cookie and returns the current user, or null.
 */

import { cookies } from "next/headers";
import { readSessionToken, SESSION_COOKIE, type SessionUser } from "./auth";

export const PROJECT_COOKIE = "wathiq_project";

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return readSessionToken(token, Math.floor(Date.now() / 1000));
}

/** The active project id from the cookie (or null → resolver picks the first). */
export async function getActiveProjectId(): Promise<string | null> {
  const store = await cookies();
  return store.get(PROJECT_COOKIE)?.value ?? null;
}
