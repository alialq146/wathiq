import { NextResponse } from "next/server";
import { analyzeDocument, analyzePdf, hasAnthropicKey } from "@/lib/ai";
import { prisma, hasDatabase } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { authEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";
// Allow the model call time to run on Vercel.
export const maxDuration = 60;

// Base64 cap (~4.4MB of base64 ≈ a ~3.3MB PDF) — stays under Vercel's request limit.
const MAX_PDF_BASE64 = 4_400_000;

export async function POST(req: Request) {
  if (!hasAnthropicKey()) {
    return NextResponse.json({ ok: false, error: "no-key" });
  }

  // --- account gating + plan quota (only in accounts mode) ---
  let quotaUserId: string | null = null;
  if (authEnabled()) {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "unauthorized" });
    }
    // "owner" (legacy env credential) is unlimited; real accounts are metered.
    if (user.uid !== "owner" && hasDatabase()) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.uid },
          select: { analysisCount: true, analysisLimit: true },
        });
        const limit = dbUser?.analysisLimit ?? 3;
        if ((dbUser?.analysisCount ?? 0) >= limit) {
          return NextResponse.json({ ok: false, error: "limit", limit });
        }
        quotaUserId = user.uid;
      } catch (err) {
        console.error("[/api/analyze] quota check failed", err);
      }
    }
  }

  let body: { text?: unknown; pdf?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" });
  }

  try {
    let result;

    // PDF path
    if (typeof body?.pdf === "string" && body.pdf.length > 0) {
      const base64 = body.pdf;
      if (base64.length > MAX_PDF_BASE64) {
        return NextResponse.json({ ok: false, error: "too-large" });
      }
      result = await analyzePdf(base64);
    } else {
      // Text path
      const text = typeof body?.text === "string" ? body.text : "";
      if (text.trim().length < 20) {
        return NextResponse.json({ ok: false, error: "too-short" });
      }
      result = await analyzeDocument(text);
    }

    // Count this successful analysis against the user's free quota.
    if (quotaUserId) {
      await prisma.user
        .update({ where: { id: quotaUserId }, data: { analysisCount: { increment: 1 } } })
        .catch((err) => console.error("[/api/analyze] quota increment failed", err));
    }

    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[/api/analyze]", err);
    return NextResponse.json({ ok: false, error: "failed" });
  }
}
