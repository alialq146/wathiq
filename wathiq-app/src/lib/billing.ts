/**
 * نواة الفوترة والاشتراكات (v2.0) — كل منطق الاشتراك في مكان واحد،
 * لا يتكرر في API routes.
 *
 * قرارات موثقة:
 * - User.plan يبقى مصدر الحقيقة لقرارات الحصة وتوجيه النماذج (منطق v1.9.7
 *   لا يُمس). Subscription هو السجل المالي والزمني، والتفعيل/التجديد يحدّث
 *   User.plan داخل نفس المعاملة — لا تعارض ممكن بين الاثنين.
 * - عند انتهاء الاشتراك: يعود المستخدم إلى FREE (تتوقف مزايا الخطة المدفوعة
 *   فقط)، وكل بياناته (مشاريع/متطلبات/فواتير) تبقى كما هي.
 * - limitOverride للأدمن يتقدم دائمًا: التجديد لا يلمس analysisLimit إذا
 *   كان التجاوز اليدوي مفعّلًا.
 * - المبالغ Decimal في القاعدة وتُمرَّر للواجهة كنصوص مُنسّقة.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { analysisLimitFor } from "./plans";
import { trackEvent } from "./track";

export const SUBSCRIPTION_STATUSES = ["TRIAL", "ACTIVE", "EXPIRED", "CANCELED", "SUSPENDED"] as const;
export const BILLING_CYCLES = ["MONTHLY", "YEARLY", "CUSTOM"] as const;
export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "MANUAL", "CARD", "PAYMENT_GATEWAY", "OTHER"] as const;
export const INVOICE_STATUSES = ["DRAFT", "PENDING", "PAID", "OVERDUE", "CANCELED", "REFUNDED"] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/* ---------------- تسميات عربية موحّدة (تُستخدم في الواجهات) ---------------- */

export const SUB_STATUS_AR: Record<string, string> = {
  TRIAL: "تجريبي",
  ACTIVE: "نشط",
  EXPIRED: "منتهي",
  CANCELED: "ملغي",
  SUSPENDED: "موقوف",
};
export const CYCLE_AR: Record<string, string> = { MONTHLY: "شهري", YEARLY: "سنوي", CUSTOM: "مدة مخصصة" };
export const INVOICE_STATUS_AR: Record<string, string> = {
  DRAFT: "مسودة",
  PENDING: "بانتظار الدفع",
  PAID: "مدفوعة",
  OVERDUE: "متأخرة",
  CANCELED: "ملغاة",
  REFUNDED: "مستردة",
};
export const PAY_METHOD_AR: Record<string, string> = {
  CASH: "نقدي",
  BANK_TRANSFER: "تحويل بنكي",
  MANUAL: "دفع يدوي",
  CARD: "بطاقة",
  PAYMENT_GATEWAY: "بوابة دفع",
  OTHER: "أخرى",
};
export const PLAN_AR: Record<string, string> = { FREE: "الأساسية", PRO: "الاحترافية", ENTERPRISE: "الأعمال" };

/* ---------------- أدوات ---------------- */

export function daysLeft(endDate: Date, now = new Date()): number {
  return Math.ceil((endDate.getTime() - now.getTime()) / DAY_MS);
}

const money = (d: Prisma.Decimal | number | string) => {
  const n = typeof d === "object" ? Number(d) : Number(d);
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
export { money as formatMoney };

async function billingAudit(
  tx: Prisma.TransactionClient,
  entry: { actorId?: string | null; userId: string; entityType: string; entityId?: string | null; action: string; metadata?: Record<string, unknown> }
) {
  await tx.billingAuditLog.create({
    data: {
      actorId: entry.actorId ?? null,
      userId: entry.userId,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      action: entry.action,
      metadata: (entry.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

/* ---------------- رقم الفاتورة ---------------- */

/**
 * INV-<سنة>-<تسلسل 6 خانات> — increment ذري على صف العدّاد داخل المعاملة
 * نفسها؛ upsert على مفتاح السنة يضمن التفرد حتى مع طلبات متزامنة.
 */
export async function nextInvoiceNumber(tx: Prisma.TransactionClient, now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const counter = await tx.invoiceCounter.upsert({
    where: { year },
    create: { year, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `INV-${year}-${String(counter.value).padStart(6, "0")}`;
}

/* ---------------- التفعيل / التجديد الذري ---------------- */

export interface ActivateSubscriptionInput {
  adminId: string;
  userId: string;
  plan: "FREE" | "PRO" | "ENTERPRISE";
  billingCycle: (typeof BILLING_CYCLES)[number];
  startDate: Date;
  endDate: Date;
  price: number; // SAR بالافتراض
  currency?: string;
  paymentMethod: (typeof PAYMENT_METHODS)[number];
  paidAt?: Date;
  referenceNumber?: string | null;
  internalNote?: string | null;
  createInvoice: boolean;
  markInvoicePaid: boolean;
  resetUsage: boolean;
  itemDescription?: string | null;
}

export interface ActivateResult {
  ok: true;
  subscriptionId: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  paymentId: string;
}
export type ActivateError = { ok: false; error: string };

/**
 * تفعيل أو تجديد اشتراك — معاملة واحدة ذرية:
 * اشتراك + دفعة + (فاتورة وبنودها اختياريًا) + مزامنة User.plan والحدود
 * + سجل تدقيق. فشل أي جزء = تراجع كامل؛ لا اشتراك بلا دفعة ولا فاتورة ناقصة.
 */
export async function activateOrRenewSubscription(
  input: ActivateSubscriptionInput
): Promise<ActivateResult | ActivateError> {
  // تحقق خادمي صارم — لا نثق بأي قيمة من الواجهة.
  if (!["FREE", "PRO", "ENTERPRISE"].includes(input.plan)) return { ok: false, error: "invalid-plan" };
  if (!BILLING_CYCLES.includes(input.billingCycle)) return { ok: false, error: "invalid-cycle" };
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) return { ok: false, error: "invalid-method" };
  if (!(input.startDate instanceof Date) || isNaN(input.startDate.getTime())) return { ok: false, error: "invalid-start" };
  if (!(input.endDate instanceof Date) || isNaN(input.endDate.getTime())) return { ok: false, error: "invalid-end" };
  if (input.endDate.getTime() <= input.startDate.getTime()) return { ok: false, error: "end-before-start" };
  if (!Number.isFinite(input.price) || input.price < 0 || input.price > 1_000_000) return { ok: false, error: "invalid-price" };

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, name: true, email: true, plan: true, limitOverride: true },
  });
  if (!user) return { ok: false, error: "user-not-found" };

  const currency = (input.currency ?? "SAR").slice(0, 8);
  const paidAt = input.paidAt ?? new Date();
  const isRenewal = Boolean(await prisma.subscription.findUnique({ where: { userId: user.id }, select: { id: true } }));

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1) الاشتراك — صف واحد لكل مستخدم يُحدَّث عند التجديد (التاريخ في السجلات المالية).
      const sub = await tx.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          plan: input.plan,
          status: "ACTIVE",
          billingCycle: input.billingCycle,
          startDate: input.startDate,
          endDate: input.endDate,
          price: new Prisma.Decimal(input.price.toFixed(2)),
          currency,
          createdByAdminId: input.adminId,
        },
        update: {
          plan: input.plan,
          status: "ACTIVE",
          billingCycle: input.billingCycle,
          startDate: input.startDate,
          endDate: input.endDate,
          price: new Prisma.Decimal(input.price.toFixed(2)),
          currency,
          canceledAt: null,
          cancellationReason: null,
          createdByAdminId: input.adminId,
        },
      });

      // 2) فاتورة اختيارية مع snapshot بيانات العميل وقت الإصدار.
      let invoiceId: string | null = null;
      let invoiceNumber: string | null = null;
      if (input.createInvoice) {
        const profile = await tx.customerBillingProfile.findUnique({ where: { userId: user.id } });
        invoiceNumber = await nextInvoiceNumber(tx);
        const amount = new Prisma.Decimal(input.price.toFixed(2));
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            userId: user.id,
            subscriptionId: sub.id,
            status: input.markInvoicePaid ? "PAID" : "PENDING",
            issueDate: new Date(),
            dueDate: input.markInvoicePaid ? null : new Date(Date.now() + 7 * DAY_MS),
            paidAt: input.markInvoicePaid ? paidAt : null,
            subtotal: amount,
            discount: new Prisma.Decimal(0),
            taxAmount: new Prisma.Decimal(0), // الضريبة قابلة للتهيئة لاحقًا — لا نفترض قيمة
            total: amount,
            currency,
            billingPeriodStart: input.startDate,
            billingPeriodEnd: input.endDate,
            customerNameSnapshot: profile?.legalName || user.name,
            customerEmailSnapshot: profile?.billingEmail || user.email,
            customerOrganizationSnapshot: profile?.organizationName ?? null,
            internalNote: input.internalNote ?? null,
            createdByAdminId: input.adminId,
          },
        });
        invoiceId = invoice.id;
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            description:
              input.itemDescription ||
              `${isRenewal ? "تجديد اشتراك" : "اشتراك"} وثّق ${PLAN_AR[input.plan] ?? input.plan} — ${CYCLE_AR[input.billingCycle]}`,
            quantity: 1,
            unitPrice: amount,
            total: amount,
          },
        });
      }

      // 3) الدفعة — نقدي/تحويل/يدوي = مكتملة فورًا.
      const payment = await tx.payment.create({
        data: {
          userId: user.id,
          invoiceId,
          subscriptionId: sub.id,
          amount: new Prisma.Decimal(input.price.toFixed(2)),
          currency,
          method: input.paymentMethod,
          status: "COMPLETED",
          paidAt,
          referenceNumber: input.referenceNumber?.slice(0, 120) ?? null,
          receivedByAdminId: input.adminId,
          notes: input.internalNote?.slice(0, 500) ?? null,
        },
      });

      // 4) مزامنة User.plan والحدود داخل نفس المعاملة — لا تعارض ممكن.
      //    limitOverride اليدوي يتقدم: لا نلمس الحد إذا كان مفعّلًا.
      const userData: Prisma.UserUpdateInput = { plan: input.plan, subscriptionStatus: "ACTIVE" };
      if (!user.limitOverride) {
        const lim = analysisLimitFor(input.plan);
        userData.analysisLimit = lim === null ? 999_999 : lim;
      }
      if (input.resetUsage) {
        userData.analysisCount = 0;
        // resetDate = شهر من بداية الفترة الجديدة (نفس منطق الدورة الشهرية الحالي).
        const next = new Date(input.startDate);
        next.setMonth(next.getMonth() + 1);
        userData.resetDate = next;
      }
      await tx.user.update({ where: { id: user.id }, data: userData });

      // 5) سجل التدقيق المالي.
      await billingAudit(tx, {
        actorId: input.adminId,
        userId: user.id,
        entityType: "SUBSCRIPTION",
        entityId: sub.id,
        action: isRenewal ? "SUBSCRIPTION_RENEWED" : "SUBSCRIPTION_CREATED",
        metadata: {
          plan: input.plan,
          cycle: input.billingCycle,
          amount: input.price,
          method: input.paymentMethod,
          invoice: invoiceNumber,
          note: isRenewal
            ? `تم تسجيل دفع ${PAY_METHOD_AR[input.paymentMethod]} وتجديد الاشتراك يدويًا بواسطة الأدمن.`
            : `تم إنشاء الاشتراك وتسجيل دفع ${PAY_METHOD_AR[input.paymentMethod]} بواسطة الأدمن.`,
        },
      });
      if (invoiceId) {
        await billingAudit(tx, {
          actorId: input.adminId, userId: user.id, entityType: "INVOICE", entityId: invoiceId,
          action: input.markInvoicePaid ? "INVOICE_MARKED_PAID" : "INVOICE_CREATED",
          metadata: { invoice: invoiceNumber, amount: input.price },
        });
      }
      await billingAudit(tx, {
        actorId: input.adminId, userId: user.id, entityType: "PAYMENT", entityId: payment.id,
        action: "PAYMENT_RECORDED", metadata: { method: input.paymentMethod, amount: input.price },
      });

      return { subscriptionId: sub.id, invoiceId, invoiceNumber, paymentId: payment.id };
    });

    // الأحداث خارج المعاملة — آمنة الفشل ولا تؤثر على العملية.
    await trackEvent({
      eventName: (isRenewal ? "subscription_renewed" : "subscription_created"),
      userId: user.id,
      plan: input.plan,
      metadata: { cycle: input.billingCycle, method: input.paymentMethod },
    });
    if (result.invoiceId) {
      await trackEvent({ eventName: "invoice_created", userId: user.id, plan: input.plan });
      if (input.markInvoicePaid) await trackEvent({ eventName: "invoice_marked_paid", userId: user.id });
    }
    await trackEvent({ eventName: "payment_recorded", userId: user.id, metadata: { method: input.paymentMethod } });

    return { ok: true, ...result };
  } catch (err) {
    console.error("[activateOrRenewSubscription]", err instanceof Error ? err.message : "error");
    return { ok: false, error: "transaction-failed" };
  }
}

/* ---------------- إلغاء / تعليق ---------------- */

export async function setSubscriptionStatus(
  adminId: string,
  userId: string,
  status: "CANCELED" | "SUSPENDED" | "ACTIVE",
  reason?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) return { ok: false, error: "no-subscription" };
  try {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { userId },
        data: {
          status,
          canceledAt: status === "CANCELED" ? new Date() : null,
          cancellationReason: status === "CANCELED" ? (reason?.slice(0, 300) ?? null) : null,
        },
      });
      // التعليق يوقف مزايا الخطة فورًا (العودة إلى FREE مع بقاء كل البيانات).
      // الإلغاء يترك الخطة حتى نهاية المدة — المعالجة الدورية تنزلها عند الانتهاء.
      if (status === "SUSPENDED") {
        await tx.user.update({ where: { id: userId }, data: { plan: "FREE", subscriptionStatus: "INACTIVE" } });
      }
      if (status === "ACTIVE") {
        await tx.user.update({ where: { id: userId }, data: { plan: sub.plan, subscriptionStatus: "ACTIVE" } });
      }
      await billingAudit(tx, {
        actorId: adminId, userId, entityType: "SUBSCRIPTION", entityId: sub.id,
        action: status === "CANCELED" ? "SUBSCRIPTION_CANCELED" : status === "SUSPENDED" ? "SUBSCRIPTION_SUSPENDED" : "SUBSCRIPTION_REACTIVATED",
        metadata: { reason: reason?.slice(0, 200) ?? null },
      });
    });
    await trackEvent({
      eventName: (status === "CANCELED" ? "subscription_canceled" : "subscription_updated"),
      userId,
    });
    return { ok: true };
  } catch (err) {
    console.error("[setSubscriptionStatus]", err instanceof Error ? err.message : "error");
    return { ok: false, error: "transaction-failed" };
  }
}

/* ---------------- حالة الفاتورة ---------------- */

export async function updateInvoiceStatus(
  adminId: string,
  invoiceId: string,
  status: (typeof INVOICE_STATUSES)[number],
  internalNote?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const inv = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) return { ok: false, error: "not-found" };
  // الفاتورة المدفوعة لا تُحذف ولا تعود مسودة — إلغاء أو استرداد فقط، وبسجل تدقيق.
  if (inv.status === "PAID" && !["CANCELED", "REFUNDED", "PAID"].includes(status)) {
    return { ok: false, error: "paid-invoice-locked" };
  }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status,
          paidAt: status === "PAID" ? (inv.paidAt ?? new Date()) : inv.paidAt,
          ...(internalNote !== undefined ? { internalNote: internalNote?.slice(0, 1000) ?? null } : {}),
        },
      });
      await billingAudit(tx, {
        actorId: adminId, userId: inv.userId, entityType: "INVOICE", entityId: invoiceId,
        action: status === "PAID" ? "INVOICE_MARKED_PAID" : status === "CANCELED" ? "INVOICE_CANCELED" : `INVOICE_STATUS_${status}`,
        metadata: { invoice: inv.invoiceNumber, from: inv.status, to: status },
      });
    });
    if (status === "PAID") await trackEvent({ eventName: "invoice_marked_paid", userId: inv.userId });
    return { ok: true };
  } catch {
    return { ok: false, error: "transaction-failed" };
  }
}

/* ---------------- دورة الحياة: الانتهاء + التذكيرات + المتأخرات ---------------- */

const REMINDER_OFFSETS: Array<{ type: string; days: number }> = [
  { type: "EXPIRY_7_DAYS", days: 7 },
  { type: "EXPIRY_3_DAYS", days: 3 },
  { type: "EXPIRY_1_DAY", days: 1 },
  { type: "EXPIRED", days: 0 },
];

/**
 * معالجة دورية آمنة التكرار (idempotent) — تُستدعى عند فتح لوحة الأدمن
 * الآن، وجاهزة للتشغيل عبر Cron لاحقًا:
 * 1) الاشتراكات النشطة المنتهية → EXPIRED + عودة المستخدم إلى FREE
 *    (البيانات تبقى؛ مزايا الخطة المدفوعة فقط تتوقف).
 * 2) توليد تذكيرات 7/3/1/انتهاء بلا تكرار (قيد فريد على الفترة).
 * 3) الفواتير المعلقة المتجاوزة للاستحقاق → OVERDUE.
 */
export async function processSubscriptionLifecycle(now = new Date()): Promise<{
  expired: number;
  remindersCreated: number;
  overdueMarked: number;
}> {
  let expired = 0;
  let remindersCreated = 0;
  let overdueMarked = 0;

  // 1) توليد التذكيرات — قبل قلب الحالة إلى EXPIRED حتى تُسجَّل تذكيرات
  //    الفترة كاملة (بما فيها تذكير الانتهاء نفسه). (IN_APP الآن؛ EMAIL عند تفعيل البريد لاحقًا)
  const horizon = new Date(now.getTime() + 8 * DAY_MS);
  const active = await prisma.subscription.findMany({
    where: { status: "ACTIVE", endDate: { lte: horizon } },
    select: { id: true, userId: true, endDate: true },
    take: 500,
  });
  for (const sub of active) {
    for (const off of REMINDER_OFFSETS) {
      const scheduledFor = new Date(sub.endDate.getTime() - off.days * DAY_MS);
      if (scheduledFor.getTime() > now.getTime()) continue; // لم يحن وقته
      try {
        await prisma.subscriptionReminder.create({
          data: {
            userId: sub.userId,
            subscriptionId: sub.id,
            type: off.type,
            scheduledFor,
            channel: "IN_APP",
            status: "SENT", // داخل التطبيق: يُعرض مباشرة من endDate — السجل للتتبع والأدمن
            sentAt: now,
          },
        });
        remindersCreated++;
        await trackEvent({ eventName: "subscription_expiring", userId: sub.userId, metadata: { type: off.type } });
      } catch {
        // قيد فريد = التذكير موجود مسبقًا — هذا هو منع التكرار المطلوب.
      }
    }
  }

  // 2) انتهاء الاشتراكات — بعد توليد تذكيراتها
  const toExpire = await prisma.subscription.findMany({
    where: { status: "ACTIVE", endDate: { lt: now } },
    select: { id: true, userId: true, plan: true, endDate: true },
    take: 200,
  });
  for (const sub of toExpire) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({ where: { id: sub.id }, data: { status: "EXPIRED" } });
        await tx.user.update({ where: { id: sub.userId }, data: { plan: "FREE", subscriptionStatus: "INACTIVE" } });
        await billingAudit(tx, {
          userId: sub.userId, entityType: "SUBSCRIPTION", entityId: sub.id,
          action: "SUBSCRIPTION_EXPIRED", metadata: { plan: sub.plan, endDate: sub.endDate.toISOString().slice(0, 10) },
        });
      });
      expired++;
      await trackEvent({ eventName: "subscription_expired", userId: sub.userId, plan: sub.plan });
    } catch (err) {
      console.error("[lifecycle expire]", err instanceof Error ? err.message : "error");
    }
  }

  // 3) الفواتير المتأخرة
  const overdue = await prisma.invoice.updateMany({
    where: { status: "PENDING", dueDate: { lt: now } },
    data: { status: "OVERDUE" },
  });
  overdueMarked = overdue.count;

  return { expired, remindersCreated, overdueMarked };
}

/* ---------------- MRR ---------------- */

/**
 * تقدير الإيراد الشهري: الشهري كما هو، السنوي ÷ 12، والمدة المخصصة
 * مستثناة (موثق) — «تقدير مبني على الاشتراكات المسجلة داخل وثّق».
 */
export async function estimateMRR(): Promise<{ mrr: number; excludedCustom: number }> {
  const subs = await prisma.subscription.findMany({
    where: { status: "ACTIVE" },
    select: { billingCycle: true, price: true },
  });
  let mrr = 0;
  let excludedCustom = 0;
  for (const s of subs) {
    const p = Number(s.price);
    if (s.billingCycle === "MONTHLY") mrr += p;
    else if (s.billingCycle === "YEARLY") mrr += p / 12;
    else excludedCustom++;
  }
  return { mrr: Math.round(mrr * 100) / 100, excludedCustom };
}

/* ---------------- Serializers للعميل (بلا internalNote أو معرفات أدمن) ---------------- */

export interface CustomerInvoiceSummary {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  total: string;
  currency: string;
  periodStart: string | null;
  periodEnd: string | null;
}

export function toCustomerInvoiceSummary(inv: {
  id: string; invoiceNumber: string; status: string; issueDate: Date;
  total: Prisma.Decimal; currency: string; billingPeriodStart: Date | null; billingPeriodEnd: Date | null;
}): CustomerInvoiceSummary {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    status: inv.status,
    issueDate: inv.issueDate.toISOString(),
    total: money(inv.total),
    currency: inv.currency,
    periodStart: inv.billingPeriodStart?.toISOString() ?? null,
    periodEnd: inv.billingPeriodEnd?.toISOString() ?? null,
  };
}
