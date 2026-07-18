import { redirect } from "next/navigation";
import { prisma, hasDatabase } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { isAccountActive } from "@/lib/account";
import { getPlan } from "@/lib/plans";
import { resolvedProjectLimitFor, getContactSettings, getFeatureSettings } from "@/lib/settings";
import { resolveEntitlements } from "@/lib/entitlements";
import { getCreditWallet } from "@/lib/ai-credits";
import { toCustomerInvoiceSummary, getCurrentSubscription, syncSubscriptionStatuses } from "@/lib/billing";
import { trackEvent } from "@/lib/track";
import { BillingClient } from "./BillingClient";

export const metadata = {
  title: "الحساب والاشتراك · وثّق",
  description: "إدارة خطتك الحالية، متابعة الاستخدام، والاطلاع على الفواتير وسجل المدفوعات.",
};

export const dynamic = "force-dynamic";

/**
 * صفحة «الحساب والاشتراك» — كل البيانات مُرشّحة في الخادم لمالك الجلسة فقط:
 * الاشتراك، الفواتير (بلا internalNote)، الاستخدام، وبيانات الفوترة.
 */
export default async function BillingPage() {
  if (!hasDatabase()) redirect("/");
  const session = await getSessionUser();
  if (!session || session.uid === "owner") redirect("/login?next=/account/billing");
  if (!(await isAccountActive(session.uid))) redirect("/login?err=disabled");

  // v2.2: خاصية الفوترة موقوفة → عودة لمساحة العمل (البيانات لا تُمس).
  if (!(await getFeatureSettings()).billingEnabled) redirect("/");

  // v2.1: مزامنة حالات الاشتراك أولًا (انتهاء/تفعيل المجدول) قبل القراءة.
  await syncSubscriptionStatuses(session.uid);

  const [user, subscription, scheduled, history, invoices, profile, projectCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.uid },
      select: { id: true, name: true, email: true, plan: true, aiCreditsOverride: true },
    }),
    getCurrentSubscription(session.uid),
    prisma.subscription.findFirst({ where: { userId: session.uid, status: "SCHEDULED" }, orderBy: { startDate: "asc" } }),
    prisma.subscription.findMany({ where: { userId: session.uid }, orderBy: { startDate: "desc" }, take: 50 }),
    prisma.invoice.findMany({
      where: { userId: session.uid },
      orderBy: { issueDate: "desc" },
      take: 50,
      select: {
        id: true, invoiceNumber: true, status: true, issueDate: true, total: true,
        currency: true, billingPeriodStart: true, billingPeriodEnd: true, subscriptionId: true,
      },
    }),
    prisma.customerBillingProfile.findUnique({ where: { userId: session.uid } }),
    prisma.project.count({ where: { ownerId: session.uid } }),
  ]);
  if (!user) redirect("/login");

  await trackEvent({ eventName: "billing_page_viewed", userId: user.id, plan: user.plan });

  const plan = getPlan(user.plan);
  const contact = await getContactSettings();
  const ent = await resolveEntitlements({ plan: user.plan, aiCreditsOverride: user.aiCreditsOverride });
  const wallet = await getCreditWallet(user.id, ent.monthlyCredits, ent.dailyCreditLimit);

  // بطاقة الاشتراك الرئيسية: الحالي (ACTIVE) إن وُجد، وإلا آخر سجل ذي معنى
  // (منتهي/ملغي/موقوف) — كي يرى العميل المنتهي بطاقته وتنبيه التجديد كما في v2.0.
  const displaySub =
    subscription ?? history.find((h) => h.status !== "SCHEDULED" && h.status !== "SUPERSEDED") ?? null;

  return (
    <BillingClient
      user={{ name: user.name, email: user.email, plan: user.plan, planName: plan.name }}
      contact={{
        whatsappNumber: contact.whatsappNumber,
        renewalMessageText: contact.renewalMessageText,
        renewalCtaText: contact.renewalCtaText,
      }}
      subscription={
        displaySub
          ? {
              plan: displaySub.plan,
              status: displaySub.status,
              billingCycle: displaySub.billingCycle,
              startDate: displaySub.startDate.toISOString(),
              endDate: displaySub.endDate.toISOString(),
              price: Number(displaySub.price).toLocaleString("en-US", { minimumFractionDigits: 2 }),
              currency: displaySub.currency,
              autoRenew: displaySub.autoRenew,
            }
          : null
      }
      scheduled={
        scheduled
          ? {
              plan: scheduled.plan,
              startDate: scheduled.startDate.toISOString(),
              endDate: scheduled.endDate.toISOString(),
              billingCycle: scheduled.billingCycle,
            }
          : null
      }
      history={history.map((h) => ({
        id: h.id,
        plan: h.plan,
        status: h.status,
        billingCycle: h.billingCycle,
        startDate: h.startDate.toISOString(),
        endDate: h.endDate.toISOString(),
        price: Number(h.price).toLocaleString("en-US", { minimumFractionDigits: 2 }),
        currency: h.currency,
        isCurrent: subscription?.id === h.id,
        invoiceId: invoices.find((inv) => inv.subscriptionId === h.id)?.id ?? null,
      }))}
      usage={{
        creditsUsed: wallet?.used ?? 0,
        creditsGranted: wallet?.granted ?? ent.monthlyCredits,
        creditsBalance: wallet?.balance ?? ent.monthlyCredits,
        periodEnd: wallet?.periodEnd ?? null,
        projectCount,
        projectLimit: await resolvedProjectLimitFor(user.plan),
      }}
      invoices={invoices.map(toCustomerInvoiceSummary)}
      profile={{
        legalName: profile?.legalName ?? "",
        organizationName: profile?.organizationName ?? "",
        taxNumber: profile?.taxNumber ?? "",
        commercialRegistration: profile?.commercialRegistration ?? "",
        address: profile?.address ?? "",
        city: profile?.city ?? "",
        country: profile?.country ?? "",
        billingEmail: profile?.billingEmail ?? "",
        phone: profile?.phone ?? "",
      }}
    />
  );
}
