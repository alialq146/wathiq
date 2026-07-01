import { NextResponse } from "next/server";
import { analyzeDocument, analyzePdf, hasAnthropicKey } from "@/lib/ai";

export const dynamic = "force-dynamic";
// Allow the model call time to run on Vercel.
export const maxDuration = 60;

// Base64 cap (~4.4MB of base64 ≈ a ~3.3MB PDF) — stays under Vercel's request limit.
const MAX_PDF_BASE64 = 4_400_000;

export async function POST(req: Request) {
  if (!hasAnthropicKey()) {
    return NextResponse.json({ ok: false, error: "no-key" });
  }

  let body: { text?: unknown; pdf?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" });
  }

  try {
    // PDF path
    if (typeof body?.pdf === "string" && body.pdf.length > 0) {
      const base64 = body.pdf;
      if (base64.length > MAX_PDF_BASE64) {
        return NextResponse.json({ ok: false, error: "too-large" });
      }
      const result = await analyzePdf(base64);
      return NextResponse.json({ ok: true, result });
    }

    // Text path
    const text = typeof body?.text === "string" ? body.text : "";
    if (text.trim().length < 20) {
      return NextResponse.json({ ok: false, error: "too-short" });
    }
    const result = await analyzeDocument(text);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[/api/analyze]", err);
    return NextResponse.json({ ok: false, error: "failed" });
  }
}
