import { NextRequest, NextResponse } from "next/server";
import { authEnabled, verifySessionToken, SESSION_COOKIE } from "@/lib/auth";

/**
 * Gate the app behind a session cookie — but only when auth is enabled
 * (a database is configured for accounts, or legacy owner credentials are
 * set). Otherwise every request passes through untouched, so the app keeps
 * working out of the box.
 */
// الطبقة الأولى من الحماية: أي مسار غير عام يتطلب كوكي جلسة مُوقَّعًا.
// التحقق من الأدوار (كالأدمن) يتم لاحقًا في الخادم لأن الـ Edge لا يصل للقاعدة.
export async function middleware(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;

  // Always-allow: the public landing page ("/" branches to a marketing page
  // for guests and the workspace for signed-in users), auth pages, auth
  // endpoints, and the health check. Mutations are still guarded server-side.
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms") ||
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
  // Run on everything except Next internals, static assets, and the
  // file-based metadata routes (favicon, OpenGraph/Twitter images) — those
  // must stay public so browsers and social crawlers can fetch them.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|opengraph-image.png|twitter-image.png|assets/).*)",
  ],
};
