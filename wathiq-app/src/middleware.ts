import { NextRequest, NextResponse } from "next/server";
import { authConfigured, verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

/**
 * Gate the app behind a session cookie — but only when auth is configured.
 * When no credentials are set in the environment, every request passes
 * through untouched, so the deployed site keeps working out of the box.
 */
export async function middleware(req: NextRequest) {
  if (!authConfigured()) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Always-allow: the login page, auth endpoints, and the health check.
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/health"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const valid = await verifySessionToken(token, Math.floor(Date.now() / 1000));
  if (valid) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  // Preserve where the user was headed, to return there after sign-in.
  if (pathname && pathname !== "/") url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/).*)"],
};
