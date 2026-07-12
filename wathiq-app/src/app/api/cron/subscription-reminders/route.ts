import { NextResponse } from "next/server";
import { processSubscriptionLifecycle } from "@/lib/billing";

export const dynamic = "force-dynamic";

/**
 * نقطة Cron مستقبلية لمعالجة دورة حياة الاشتراكات (انتهاء/تذكيرات/متأخرات).
 *
 * أمان: بدون CRON_SECRET في البيئة تُرفض كل الطلبات (403) — لا تشغيل عام
 * إطلاقًا قبل تهيئة السر. عند التفعيل لاحقًا: أضف CRON_SECRET في Vercel
 * ومرره في ترويسة Authorization: Bearer <secret> من جدولة Vercel Cron.
 * حاليًا نفس المعالجة تعمل تلقائيًا عند فتح لوحة الأدمن.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "cron-disabled" }, { status: 403 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  const result = await processSubscriptionLifecycle();
  return NextResponse.json({ ok: true, ...result });
}
