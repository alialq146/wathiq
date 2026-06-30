import { NextResponse } from "next/server";
import { analyzeDocument, hasAnthropicKey } from "@/lib/ai";

export const dynamic = "force-dynamic";
// Allow the model call time to run on Vercel.
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!hasAnthropicKey()) {
    return NextResponse.json({ ok: false, error: "no-key" });
  }

  let text = "";
  try {
    const body = await req.json();
    text = typeof body?.text === "string" ? body.text : "";
  } catch {
    return NextResponse.json({ ok: false, error: "bad-request" });
  }

  if (text.trim().length < 20) {
    return NextResponse.json({ ok: false, error: "too-short" });
  }

  try {
    const result = await analyzeDocument(text);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[/api/analyze]", err);
    return NextResponse.json({ ok: false, error: "failed" });
  }
}
