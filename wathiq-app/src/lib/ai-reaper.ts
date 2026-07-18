/**
 * منظّف الحجوزات اليتيمة (v2.6.1) — استرجاع النقاط المحجوزة العالقة.
 *
 * المشكلة: عملية `RESERVED` خُصمت نقاطها لكنها لم تُثبَّت (COMMITTED) ولا
 * تُسترجع (REFUNDED/FAILED) — يحدث إذا تعطّل الخادم/انقطع التنفيذ بين الحجز
 * والنتيجة. تبقى النقاط خاصمةً للرصيد إلى الأبد. هذا المنظّف يجد الحجوزات
 * الأقدم من مهلة قابلة للتعديل ويسترجعها بأمان.
 *
 * ضمانات السلامة:
 *  - يعيد استخدام `refundCredits` (معاملة + حارس `status === "RESERVED"`)، فلا
 *    يلمس عمليةً مثبَّتة/مسترجعة/فاشلة أبدًا، وآمن للتشغيل المتكرر والمتزامن:
 *    عند تسابق منظّفَين على نفس العملية تنجح أول معاملة فقط (تُعيد true)
 *    والأخرى تراها نهائيةً (تُعيد false) — لا استرجاع مزدوج.
 *  - المهلة مقيّدة بحدٍّ أدنى 10 دقائق (في محلّل الإعدادات) — أعلى بأمان من
 *    أقصى مهلة طلب (5 دقائق) + إعادات المحاولة، فلا يُسترجع حجزٌ قيد التنفيذ.
 *  - معالجة على دفعات (batch) بسقف صارم — تشغيل واحد لا يفتح استعلامًا ضخمًا.
 *  - سجلّات منظّمة بلا أي أسرار أو محتوى prompt — أعداد وأزمنة فقط.
 */

import { prisma } from "@/lib/db";
import { refundCredits } from "@/lib/ai-credits";
import { getResolvedAiSettings } from "@/lib/settings";

export const ORPHAN_REASON = "orphaned-reservation-timeout";

export interface ReaperResult {
  scanned: number; // عدد الحجوزات اليتيمة التي فُحصت هذه الدفعة
  refunded: number; // عدد ما استُرجع فعلًا
  skipped: number; // ما صار نهائيًا قبل معالجته (تزامن)
  cutoffMinutes: number; // المهلة المطبَّقة
  batchSize: number; // سقف الدفعة المطبَّق
  mayHaveMore: boolean; // امتلأت الدفعة → قد تبقى حجوزات لتشغيل لاحق
  durationMs: number;
}

/**
 * يفحص ويسترجع دفعةً واحدة من الحجوزات اليتيمة. آمن للتشغيل عدة مرات: كل
 * تشغيل يلتقط الدفعة التالية. `now` قابل للحقن للاختبار الحتمي.
 */
export async function reapOrphanedReservations(now: Date = new Date()): Promise<ReaperResult> {
  const startedAtMs = now.getTime();
  const ai = await getResolvedAiSettings();
  const cutoffMinutes = ai.reservationTimeoutMinutes;
  const batchSize = ai.reservationCleanupBatchSize;
  const cutoff = new Date(startedAtMs - cutoffMinutes * 60_000);

  // أقدم أولًا — نعالج الأكثر تعليقًا قبل غيره.
  const orphans = await prisma.aiOperation.findMany({
    where: { status: "RESERVED", startedAt: { lt: cutoff } },
    orderBy: { startedAt: "asc" },
    take: batchSize,
    select: { id: true },
  });

  let refunded = 0;
  let skipped = 0;
  for (const o of orphans) {
    // كل استرجاع في معاملته المستقلة — فشل واحد لا يُسقط الدفعة كلها.
    try {
      const acted = await refundCredits(o.id, ORPHAN_REASON);
      if (acted) refunded++;
      else skipped++; // صار نهائيًا بين الفحص والاسترجاع (تزامن)
    } catch (e) {
      skipped++;
      console.warn(JSON.stringify({ event: "ai_reaper_refund_error", operationId: o.id, error: (e as Error).message?.slice(0, 120) }));
    }
  }

  const result: ReaperResult = {
    scanned: orphans.length,
    refunded,
    skipped,
    cutoffMinutes,
    batchSize,
    mayHaveMore: orphans.length === batchSize,
    durationMs: Date.now() - startedAtMs,
  };
  // سجلّ منظّم بلا أسرار/محتوى — أعداد فقط.
  console.log(JSON.stringify({ event: "ai_reaper_run", ...result }));
  return result;
}
