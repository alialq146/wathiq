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
 * - v2.6: التفعيل/التجديد يمنح رصيد نقاط الخطة (aiCreditsGranted)؛ تجاوز
 *   المستخدم (aiCreditsOverride) يتقدّم دائمًا على منحة الخطة.
 * - المبالغ Decimal في القاعدة وتُمرَّر للواجهة كنصوص مُنسّقة.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { getResolvedPlan, getNotificationSettings, reminderOffsets } from "@/lib/settings";

/** منحة نقاط الذكاء لهذه الخطة (يتقدّم تجاوز المستخدم) — للمزامنة عند التفعيل/التجديد. */
async function creditGrantFor(plan: string, override: number | null | undefined): Promise<number> {
  if (typeof override === "number" && override >= 0) return override;
  return (await getResolvedPlan(plan)).monthlyCredits;
}
function plusOneMonth(from: Date): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1);
  return d;
}
import { trackEvent } from "./track";

export const SUBSCRIPTION_STATUSES = ["TRIAL", "SCHEDULED", "ACTIVE", "EXPIRED", "CANCELED", "SUSPENDED", "SUPERSEDED"] as const;
export const SUBSCRIPTION_SOURCES = ["MANUAL", "PAYMENT_GATEWAY", "ADMIN_GRANT", "TRIAL", "MIGRATED"] as const;
export const BILLING_CYCLES = ["MONTHLY", "YEARLY", "CUSTOM"] as const;
export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "MANUAL", "CARD", "PAYMENT_GATEWAY", "OTHER"] as const;
export const INVOICE_STATUSES = ["DRAFT", "PENDING", "PAID", "OVERDUE", "CANCELED", "REFUNDED"] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/* ---------------- تسميات عربية موحّدة (تُستخدم في الواجهات) ---------------- */

export const SUB_STATUS_AR: Record<string, string> = {
  TRIAL: "تجريبي",
  SCHEDULED: "مجدول",
  ACTIVE: "نشط",
  EXPIRED: "منتهي",
  CANCELED: "ملغي",
  SUSPENDED: "موقوف",
  SUPERSEDED: "مستبدل",
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

/* ---------------- إعدادات الفوترة (v2.1) ---------------- */

export interface ResolvedBillingSettings {
  issuerName: string; issuerLegalName: string | null; issuerEmail: string | null;
  issuerPhone: string | null; issuerAddress: string | null; issuerCity: string | null;
  issuerCountry: string | null; issuerTaxNumber: string | null; issuerCommercialRegistration: string | null;
  logoUrl: string | null; defaultCurrency: string; taxEnabled: boolean; defaultTaxRate: number;
  taxLabel: string; invoicePrefix: string; invoiceFooterText: string; invoiceNotes: string | null;
  defaultDueDays: number; paymentInstructions: string | null; showPaymentMethod: boolean;
  showReferenceNumber: boolean; supportEmail: string | null; supportPhone: string | null;
}

/** يقرأ صف الإعدادات (singleton) أو يُرجع القيم الافتراضية الآمنة إن لم يُنشأ بعد. */
export async function getBillingSettings(): Promise<ResolvedBillingSettings> {
  const row = await prisma.billingSettings.findUnique({ where: { id: "singleton" } });
  return {
    issuerName: row?.issuerName ?? "وثّق",
    issuerLegalName: row?.issuerLegalName ?? null,
    issuerEmail: row?.issuerEmail ?? null,
    issuerPhone: row?.issuerPhone ?? null,
    issuerAddress: row?.issuerAddress ?? null,
    issuerCity: row?.issuerCity ?? null,
    issuerCountry: row?.issuerCountry ?? null,
    issuerTaxNumber: row?.issuerTaxNumber ?? null,
    issuerCommercialRegistration: row?.issuerCommercialRegistration ?? null,
    logoUrl: row?.logoUrl ?? null,
    defaultCurrency: row?.defaultCurrency ?? "SAR",
    taxEnabled: row?.taxEnabled ?? false,
    defaultTaxRate: row ? Number(row.defaultTaxRate) : 0,
    taxLabel: row?.taxLabel ?? "ضريبة القيمة المضافة",
    invoicePrefix: row?.invoicePrefix ?? "INV",
    invoiceFooterText: row?.invoiceFooterText ?? "شكرًا لاستخدامك وثّق.",
    invoiceNotes: row?.invoiceNotes ?? null,
    defaultDueDays: row?.defaultDueDays ?? 0,
    paymentInstructions: row?.paymentInstructions ?? null,
    showPaymentMethod: row?.showPaymentMethod ?? true,
    showReferenceNumber: row?.showReferenceNumber ?? true,
    supportEmail: row?.supportEmail ?? null,
    supportPhone: row?.supportPhone ?? null,
  };
}

/* ---------------- الاشتراك الحالي + مزامنة الحالات (v2.1) ---------------- */

/**
 * الاشتراك الحالي = أحدث صف حالته ACTIVE يشمل تاريخ اليوم. لا يُخزَّن بل
 * يُحسب دائمًا — مصدر واحد للحقيقة الزمنية. (يُستدعى بعد syncSubscriptionStatuses.)
 */
export async function getCurrentSubscription(userId: string, now = new Date()) {
  return prisma.subscription.findFirst({
    where: { userId, status: "ACTIVE", startDate: { lte: now }, endDate: { gte: now } },
    orderBy: { startDate: "desc" },
  });
}

/**
 * مزامنة حالات اشتراكات مستخدم واحد (idempotent) — تُستدعى عند فتح صفحة
 * الفوترة/لوحة الأدمن/الـ Cron وأي عملية حساسة، بلا تكرار أثر:
 * 1) ACTIVE انتهت مدته → EXPIRED + عودة الخطة إلى FREE.
 * 2) SCHEDULED حان تاريخ بدايته → ACTIVE + استبدال أي ACTIVE سابق (لا اشتراكان
 *    نشطان معًا) + مزامنة User.plan.
 * تضمن دائمًا وجود اشتراك ACTIVE واحد كحد أقصى.
 */
export async function syncSubscriptionStatuses(userId: string, now = new Date()): Promise<void> {
  const subs = await prisma.subscription.findMany({
    where: { userId, status: { in: ["ACTIVE", "SCHEDULED"] } },
    orderBy: { startDate: "asc" },
  });
  if (subs.length === 0) return;

  const toExpire = subs.filter((s) => s.status === "ACTIVE" && s.endDate.getTime() < now.getTime());
  const toActivate = subs.filter((s) => s.status === "SCHEDULED" && s.startDate.getTime() <= now.getTime());

  if (toExpire.length === 0 && toActivate.length === 0) return;

  try {
    await prisma.$transaction(async (tx) => {
      for (const s of toExpire) {
        await tx.subscription.update({ where: { id: s.id }, data: { status: "EXPIRED" } });
        await billingAudit(tx, { userId, entityType: "SUBSCRIPTION", entityId: s.id, action: "SUBSCRIPTION_EXPIRED", metadata: { plan: s.plan } });
      }
      // فعّل أحدث مجدول حان وقته فقط (والباقي يبقى مجدولًا حتى دوره).
      const activate = toActivate[toActivate.length - 1];
      if (activate) {
        // استبدل أي ACTIVE ما زال قائمًا (نادر — لكن نضمن عدم وجود اثنين).
        await tx.subscription.updateMany({
          where: { userId, status: "ACTIVE", id: { not: activate.id } },
          data: { status: "SUPERSEDED", supersededAt: now, cancellationReason: "استُبدل تلقائيًا ببدء الاشتراك المجدول." },
        });
        await tx.subscription.update({ where: { id: activate.id }, data: { status: "ACTIVE" } });
        const u = await tx.user.findUnique({ where: { id: userId }, select: { aiCreditsOverride: true } });
        // بدء اشتراك مجدول = دورة نقاط جديدة (منحة الخطة + تصفير الاستهلاك).
        const grant = await creditGrantFor(activate.plan, u?.aiCreditsOverride);
        await tx.user.update({
          where: { id: userId },
          data: {
            plan: activate.plan, subscriptionStatus: "ACTIVE",
            aiCreditsGranted: grant, aiCreditsUsed: 0, aiCreditsPeriodEnd: plusOneMonth(now),
          },
        });
        await billingAudit(tx, { userId, entityType: "SUBSCRIPTION", entityId: activate.id, action: "SCHEDULED_ACTIVATED", metadata: { plan: activate.plan } });
      } else if (toExpire.length > 0) {
        // انتهت مدة نشط ولا يوجد مجدول يخلفه → عودة إلى FREE.
        const stillActive = await tx.subscription.count({ where: { userId, status: "ACTIVE" } });
        if (stillActive === 0) {
          const u = await tx.user.findUnique({ where: { id: userId }, select: { aiCreditsOverride: true } });
          const grant = await creditGrantFor("FREE", u?.aiCreditsOverride);
          await tx.user.update({
            where: { id: userId },
            data: {
              plan: "FREE", subscriptionStatus: "INACTIVE",
              aiCreditsGranted: grant, aiCreditsUsed: 0, aiCreditsPeriodEnd: plusOneMonth(now),
            },
          });
        }
      }
    });
  } catch (err) {
    console.error("[syncSubscriptionStatuses]", err instanceof Error ? err.message : "error");
  }
}

/* ---------------- رقم الفاتورة ---------------- */

/**
 * INV-<سنة>-<تسلسل 6 خانات> — increment ذري على صف العدّاد داخل المعاملة
 * نفسها؛ upsert على مفتاح السنة يضمن التفرد حتى مع طلبات متزامنة.
 */
export async function nextInvoiceNumber(tx: Prisma.TransactionClient, prefix = "INV", now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const counter = await tx.invoiceCounter.upsert({
    where: { year },
    create: { year, value: 1 },
    update: { value: { increment: 1 } },
  });
  const safePrefix = (prefix || "INV").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 8) || "INV";
  return `${safePrefix}-${year}-${String(counter.value).padStart(6, "0")}`;
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
  /** true (افتراضي): يبدأ الآن ويستبدل النشط الحالي. false: يُجدول للمستقبل. */
  startImmediate?: boolean;
}

export interface ActivateResult {
  ok: true;
  subscriptionId: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  paymentId: string;
  scheduled: boolean;
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
    select: { id: true, name: true, email: true, plan: true, aiCreditsOverride: true },
  });
  if (!user) return { ok: false, error: "user-not-found" };

  const currency = (input.currency ?? "SAR").slice(0, 8);
  const paidAt = input.paidAt ?? new Date();
  const now = new Date();
  // البدء الفوري افتراضي؛ إن كانت البداية مستقبلية والأدمن اختار الجدولة → SCHEDULED.
  const startImmediate = input.startImmediate !== false && input.startDate.getTime() <= now.getTime() + DAY_MS;
  const scheduled = !startImmediate && input.startDate.getTime() > now.getTime();

  // آخر اشتراك للمستخدم (لسلسلة renewedFrom/previous) — سجل تاريخي، لا صف وحيد.
  const prev = await prisma.subscription.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  const isRenewal = Boolean(prev);

  const settings = await getBillingSettings();
  const profile = await prisma.customerBillingProfile.findUnique({ where: { userId: user.id } });

  // الضريبة من الإعدادات — تُطبَّق على الجديد فقط، وصفر إن كانت معطّلة.
  const taxRate = settings.taxEnabled ? settings.defaultTaxRate : 0;
  const subtotalN = Number(input.price.toFixed(2));
  const taxN = Math.round(subtotalN * (taxRate / 100) * 100) / 100;
  const totalN = Math.round((subtotalN + taxN) * 100) / 100;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1) إنشاء صف اشتراك جديد (لا كتابة فوق السابق) — سجل تاريخي.
      //    فوري → ACTIVE ويستبدل النشط الحالي؛ مجدول → SCHEDULED بلا لمس الخطة.
      if (startImmediate) {
        await tx.subscription.updateMany({
          where: { userId: user.id, status: "ACTIVE" },
          data: { status: "SUPERSEDED", supersededAt: now, cancellationReason: "استُبدل بتفعيل اشتراك جديد فوري." },
        });
      }
      const sub = await tx.subscription.create({
        data: {
          userId: user.id,
          plan: input.plan,
          status: startImmediate ? "ACTIVE" : "SCHEDULED",
          billingCycle: input.billingCycle,
          startDate: input.startDate,
          endDate: input.endDate,
          price: new Prisma.Decimal(subtotalN.toFixed(2)),
          currency,
          source: "MANUAL",
          previousSubscriptionId: prev?.id ?? null,
          renewedFromId: prev?.id ?? null,
          createdByAdminId: input.adminId,
        },
      });

      // 2) فاتورة اختيارية — snapshot لبيانات العميل والجهة المصدرة والضريبة.
      let invoiceId: string | null = null;
      let invoiceNumber: string | null = null;
      if (input.createInvoice) {
        invoiceNumber = await nextInvoiceNumber(tx, settings.invoicePrefix);
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            userId: user.id,
            subscriptionId: sub.id,
            status: input.markInvoicePaid ? "PAID" : "PENDING",
            issueDate: new Date(),
            dueDate: input.markInvoicePaid ? null : new Date(Date.now() + Math.max(0, settings.defaultDueDays) * DAY_MS),
            paidAt: input.markInvoicePaid ? paidAt : null,
            subtotal: new Prisma.Decimal(subtotalN.toFixed(2)),
            discount: new Prisma.Decimal(0),
            taxAmount: new Prisma.Decimal(taxN.toFixed(2)),
            total: new Prisma.Decimal(totalN.toFixed(2)),
            currency,
            billingPeriodStart: input.startDate,
            billingPeriodEnd: input.endDate,
            customerNameSnapshot: profile?.legalName || user.name,
            customerEmailSnapshot: profile?.billingEmail || user.email,
            customerOrganizationSnapshot: profile?.organizationName ?? null,
            // snapshot الجهة المصدرة والإعدادات — الفاتورة التاريخية ثابتة.
            issuerNameSnapshot: settings.issuerName,
            issuerLegalNameSnapshot: settings.issuerLegalName,
            issuerEmailSnapshot: settings.issuerEmail,
            issuerPhoneSnapshot: settings.issuerPhone,
            issuerAddressSnapshot: settings.issuerAddress,
            issuerTaxNumberSnapshot: settings.issuerTaxNumber,
            issuerCrSnapshot: settings.issuerCommercialRegistration,
            footerTextSnapshot: settings.invoiceFooterText,
            paymentInstructionsSnapshot: settings.paymentInstructions,
            taxLabelSnapshot: taxRate > 0 ? settings.taxLabel : null,
            taxRateSnapshot: new Prisma.Decimal(taxRate.toFixed(2)),
            notes: settings.invoiceNotes ?? null,
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
            unitPrice: new Prisma.Decimal(subtotalN.toFixed(2)),
            total: new Prisma.Decimal(subtotalN.toFixed(2)),
          },
        });
      }

      // 3) الدفعة — مكتملة فورًا.
      const payment = await tx.payment.create({
        data: {
          userId: user.id, invoiceId, subscriptionId: sub.id,
          amount: new Prisma.Decimal(totalN.toFixed(2)), currency,
          method: input.paymentMethod, status: "COMPLETED", paidAt,
          referenceNumber: input.referenceNumber?.slice(0, 120) ?? null,
          receivedByAdminId: input.adminId,
          notes: input.internalNote?.slice(0, 500) ?? null,
        },
      });

      // 4) مزامنة User.plan — للاشتراك الفوري فقط (المجدول لا يغيّر الخطة الآن).
      if (startImmediate) {
        const userData: Prisma.UserUpdateInput = { plan: input.plan, subscriptionStatus: "ACTIVE" };
        // منح رصيد نقاط الخطة عند التفعيل الفوري؛ resetUsage يبدأ دورة نظيفة.
        const grant = await creditGrantFor(input.plan, user.aiCreditsOverride);
        userData.aiCreditsGranted = grant;
        if (input.resetUsage) {
          userData.aiCreditsUsed = 0;
          userData.aiCreditsPeriodEnd = plusOneMonth(new Date(input.startDate));
        }
        await tx.user.update({ where: { id: user.id }, data: userData });
      }

      // 5) سجل التدقيق المالي.
      await billingAudit(tx, {
        actorId: input.adminId, userId: user.id, entityType: "SUBSCRIPTION", entityId: sub.id,
        action: scheduled ? "SUBSCRIPTION_SCHEDULED" : isRenewal ? "SUBSCRIPTION_RENEWED" : "SUBSCRIPTION_CREATED",
        metadata: {
          plan: input.plan, cycle: input.billingCycle, amount: totalN, method: input.paymentMethod,
          invoice: invoiceNumber, renewedFrom: prev?.id ?? null,
          note: scheduled
            ? "تم جدولة تجديد يبدأ تلقائيًا بعد انتهاء الفترة الحالية."
            : isRenewal
              ? `تم تسجيل دفع ${PAY_METHOD_AR[input.paymentMethod]} وتجديد الاشتراك يدويًا بواسطة الأدمن.`
              : `تم إنشاء الاشتراك وتسجيل دفع ${PAY_METHOD_AR[input.paymentMethod]} بواسطة الأدمن.`,
        },
      });
      if (invoiceId) {
        await billingAudit(tx, { actorId: input.adminId, userId: user.id, entityType: "INVOICE", entityId: invoiceId, action: input.markInvoicePaid ? "INVOICE_MARKED_PAID" : "INVOICE_CREATED", metadata: { invoice: invoiceNumber, amount: totalN } });
      }
      await billingAudit(tx, { actorId: input.adminId, userId: user.id, entityType: "PAYMENT", entityId: payment.id, action: "PAYMENT_RECORDED", metadata: { method: input.paymentMethod, amount: totalN } });

      return { subscriptionId: sub.id, invoiceId, invoiceNumber, paymentId: payment.id };
    });

    await trackEvent({
      eventName: isRenewal ? "subscription_renewed" : "subscription_created",
      userId: user.id, plan: input.plan, metadata: { cycle: input.billingCycle, method: input.paymentMethod, scheduled },
    });
    if (result.invoiceId) {
      await trackEvent({ eventName: "invoice_created", userId: user.id, plan: input.plan });
      if (input.markInvoicePaid) await trackEvent({ eventName: "invoice_marked_paid", userId: user.id });
    }
    await trackEvent({ eventName: "payment_recorded", userId: user.id, metadata: { method: input.paymentMethod } });

    return { ok: true, ...result, scheduled };
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
  // يستهدف الاشتراك الحالي/الأحدث (السجل التاريخي قد يحوي عدة صفوف).
  const sub =
    (await prisma.subscription.findFirst({ where: { userId, status: { in: ["ACTIVE", "SCHEDULED", "SUSPENDED"] } }, orderBy: { startDate: "desc" } })) ??
    (await prisma.subscription.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }));
  if (!sub) return { ok: false, error: "no-subscription" };
  try {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
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

// v2.2: أيام التذكير من إعدادات النظام (notificationSettings) —
// الافتراضي يطابق السلوك التاريخي (7/3/1/يوم الانتهاء)، ومنع التكرار
// يبقى بالقيد الفريد في القاعدة مهما تغيّرت الإعدادات.

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

  // 1) توليد التذكيرات — للاشتراكات النشطة الحالية فقط (لا التاريخية ولا
  //    المستبدلة)، وقبل قلب الحالة إلى EXPIRED حتى تُسجَّل تذكيرات الفترة كاملة.
  //    نتخطى من له اشتراك مجدول قادم (لا داعي لتذكير التجديد — مسجَّل أصلًا).
  const notif = await getNotificationSettings();
  const offsets = await reminderOffsets();
  const maxDays = offsets.reduce((m, o) => Math.max(m, o.days), 0);
  const horizon = new Date(now.getTime() + (maxDays + 1) * DAY_MS);
  const activeAll = notif.inAppRemindersEnabled && offsets.length > 0
    ? await prisma.subscription.findMany({
        where: { status: "ACTIVE", endDate: { lte: horizon } },
        select: { id: true, userId: true, endDate: true },
        take: 500,
      })
    : [];
  const scheduledUsers = notif.suppressWhenScheduled
    ? new Set(
        (await prisma.subscription.findMany({ where: { status: "SCHEDULED" }, select: { userId: true } })).map((r) => r.userId)
      )
    : new Set<string>();
  const active = activeAll.filter((s) => !scheduledUsers.has(s.userId));
  for (const sub of active) {
    for (const off of offsets) {
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
  //    نمرّ عبر syncSubscriptionStatuses لكل مستخدم متأثر — يتكفّل بالانتهاء
  //    وتفعيل المجدول القادم (إن وُجد) وعدم الهبوط إلى FREE إذا كان هناك خليفة.
  const affectedUsers = [...new Set(toExpire.map((s) => s.userId))];
  for (const uid of affectedUsers) {
    await syncSubscriptionStatuses(uid, now);
    expired++;
    const s = toExpire.find((x) => x.userId === uid);
    if (s) await trackEvent({ eventName: "subscription_expired", userId: uid, plan: s.plan });
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
export async function estimateMRR(now = new Date()): Promise<{ mrr: number; excludedCustom: number }> {
  // فقط الاشتراكات النشطة الحالية (تشمل تاريخ اليوم) — لا التاريخية ولا المجدولة
  // ولا المستبدلة/المنتهية. صف واحد لكل مستخدم (الأحدث تغطيةً لليوم).
  const rows = await prisma.subscription.findMany({
    where: { status: "ACTIVE", startDate: { lte: now }, endDate: { gte: now } },
    select: { userId: true, billingCycle: true, price: true, startDate: true },
    orderBy: { startDate: "desc" },
  });
  const seen = new Set<string>();
  let mrr = 0;
  let excludedCustom = 0;
  for (const s of rows) {
    if (seen.has(s.userId)) continue; // احتياط: صف واحد لكل مستخدم
    seen.add(s.userId);
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
