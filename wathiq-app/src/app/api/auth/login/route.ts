import { NextResponse } from "next/server";
import { prisma, hasDatabase } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import {
  authEnabled,
  verifyOwnerCredentials,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  type SessionUser,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!authEnabled()) {
    return NextResponse.json({ ok: false, error: "not-configured" });
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return NextResponse.json({ ok: false, error: "invalid" });

  let sessionUser: SessionUser | null = null;

  // 1) Accounts mode: check the User table.
  if (hasDatabase()) {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (user && verifyPassword(password, user.passwordHash)) {
        sessionUser = { uid: user.id, name: user.name, email: user.email };
      }
    } catch (err) {
      console.error("[/api/auth/login] db lookup failed", err);
      return NextResponse.json({ ok: false, error: "server" });
    }
  }

  // 2) Owner mode (legacy env credentials) as a fallback.
  if (!sessionUser && verifyOwnerCredentials(email, password)) {
    sessionUser = { uid: "owner", name: email.split("@")[0], email };
  }

  if (!sessionUser) {
    return NextResponse.json({ ok: false, error: "invalid" });
  }

  const token = await createSessionToken(sessionUser, Math.floor(Date.now() / 1000));
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
