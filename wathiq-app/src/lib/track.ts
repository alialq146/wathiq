/**
 * تسجيل أحداث استخدام المنتج (v1.9.11) — تخزين داخلي في ProductEvent فقط،
 * بلا أي أداة خارجية وبلا أي استدعاء ذكاء اصطناعي.
 *
 * قاعدة صارمة: فشل التسجيل لا يكسر تجربة المستخدم أبدًا — كل الأخطاء تُبتلع
 * (مع سجل خادم صامت) لأن الحدث معلومة ثانوية والعملية الأصلية هي الأهم.
 * metadata خفيفة فقط: نوع مهمة/تصدير، خطة، عدادات — لا نصوص متطلبات ولا وثائق.
 */

import { prisma, hasDatabase } from "./db";

export type ProductEventName =
  | "signup_completed"
  | "login_completed"
  | "project_created"
  | "project_context_updated"
  | "module_created"
  | "module_updated"
  | "module_deleted"
  | "requirement_created"
  | "requirement_updated"
  | "assistant_task_started"
  | "assistant_task_succeeded"
  | "assistant_task_failed"
  | "export_report_created"
  | "export_brd_created"
  | "export_srs_created"
  | "quota_limit_reached"
  | "feedback_submitted"
  | "upgrade_clicked"
  // فوترة (v2.0)
  | "subscription_created"
  | "subscription_renewed"
  | "subscription_canceled"
  | "subscription_updated"
  | "subscription_expiring"
  | "subscription_expired"
  | "invoice_created"
  | "invoice_viewed"
  | "invoice_downloaded"
  | "invoice_marked_paid"
  | "payment_recorded"
  | "billing_page_viewed"
  | "renewal_clicked"
  | "billing_email_sent"
  | "billing_email_failed";

export interface TrackInput {
  eventName: ProductEventName;
  userId?: string | null;
  plan?: string | null;
  projectId?: string | null;
  requirementId?: string | null;
  /** خفيفة فقط — تُقص أي قيمة نصية طويلة احتياطًا. */
  metadata?: Record<string, string | number | boolean | null> | null;
}

const META_VALUE_MAX = 200;

function sanitizeMeta(
  meta: TrackInput["metadata"]
): Record<string, string | number | boolean | null> | undefined {
  if (!meta) return undefined;
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = typeof v === "string" && v.length > META_VALUE_MAX ? v.slice(0, META_VALUE_MAX) : v;
  }
  return out;
}

export async function trackEvent(input: TrackInput): Promise<void> {
  if (!hasDatabase()) return;
  try {
    await prisma.productEvent.create({
      data: {
        eventName: input.eventName,
        userId: input.userId ?? null,
        plan: input.plan ?? null,
        projectId: input.projectId ?? null,
        requirementId: input.requirementId ?? null,
        metadata: sanitizeMeta(input.metadata),
      },
    });
  } catch (err) {
    // صامت للمستخدم — سطر خادم واحد يكفي للتشخيص.
    console.error("[trackEvent]", input.eventName, err instanceof Error ? err.message : "error");
  }
}
