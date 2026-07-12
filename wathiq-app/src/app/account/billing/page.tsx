import { redirect } from "next/navigation";
import { prisma, hasDatabase } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { isAccountActive } from "@/lib/account";
import { getPlan, projectLimitFor } from "@/lib/plans";
import { toCustomerInvoiceSummary } from "@/lib/billing";
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

  const [user, subscription, invoices, profile, projectCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.uid },
      select: { id: true, name: true, email: true, plan: true, analysisCount: true, analysisLimit: true, resetDate: true, limitOverride: true },
    }),
    prisma.subscription.findUnique({ where: { userId: session.uid } }),
    prisma.invoice.findMany({
      where: { userId: session.uid },
      orderBy: { issueDate: "desc" },
      take: 50,
      select: {
        id: true, invoiceNumber: true, status: true, issueDate: true, total: true,
        currency: true, billingPeriodStart: true, billingPeriodEnd: true,
      },
    }),
    prisma.customerBillingProfile.findUnique({ where: { userId: session.uid } }),
    prisma.project.count({ where: { ownerId: session.uid } }),
  ]);
  if (!user) redirect("/login");

  await trackEvent({ eventName: "billing_page_viewed", userId: user.id, plan: user.plan });

  const plan = getPlan(user.plan);
  const analysisLimit = user.limitOverride ? user.analysisLimit : plan.analysisLimit;

  return (
    <BillingClient
      user={{ name: user.name, email: user.email, plan: user.plan, planName: plan.name }}
      subscription={
        subscription
          ? {
              plan: subscription.plan,
              status: subscription.status,
              billingCycle: subscription.billingCycle,
              startDate: subscription.startDate.toISOString(),
              endDate: subscription.endDate.toISOString(),
              price: Number(subscription.price).toLocaleString("en-US", { minimumFractionDigits: 2 }),
              currency: subscription.currency,
              autoRenew: subscription.autoRenew,
            }
          : null
      }
      usage={{
        analysisCount: user.analysisCount,
        analysisLimit: analysisLimit ?? null,
        resetDate: user.resetDate?.toISOString() ?? null,
        projectCount,
        projectLimit: projectLimitFor(user.plan),
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
