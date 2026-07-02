/**
 * Server-side session access (Server Components, Server Actions, routes).
 * Reads the signed cookie and returns the current user, or null.
 */

import { cookies } from "next/headers";
import { readSessionToken, SESSION_COOKIE, type SessionUser } from "./auth";

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return readSessionToken(token, Math.floor(Date.now() / 1000));
}
