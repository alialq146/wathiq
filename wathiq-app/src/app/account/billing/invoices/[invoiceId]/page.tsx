import { redirect, notFound } from "next/navigation";
import { prisma, hasDatabase } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { isAccountActive } from "@/lib/account";
import { trackEvent } from "@/lib/track";
import { formatMoney } from "@/lib/billing";
import { InvoiceView } from "./InvoiceView";

export const metadata = { title: "فاتورة · وثّق" };
export const dynamic = "force-dynamic";

/**
 * فاتورة العميل — أمان: findFirst مشروط بـ userId من الجلسة؛ فاتورة مستخدم
 * آخر = 404 دائمًا. internalNote ومعرفات الأدمن لا تصل إلى هذه الصفحة.
 */
export default async function CustomerInvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  if (!hasDatabase()) redirect("/");
  const session = await getSessionUser();
  if (!session || session.uid === "owner") redirect("/login?next=/account/billing");
  if (!(await isAccountActive(session.uid))) redirect("/login?err=disabled");

  const { invoiceId } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, userId: session.uid },
    select: {
      id: true, invoiceNumber: true, status: true, issueDate: true, dueDate: true, paidAt: true,
      subtotal: true, discount: true, taxAmount: true, total: true, currency: true,
      billingPeriodStart: true, billingPeriodEnd: true,
      customerNameSnapshot: true, customerEmailSnapshot: true, customerOrganizationSnapshot: true,
      issuerNameSnapshot: true, issuerLegalNameSnapshot: true, issuerEmailSnapshot: true,
      issuerPhoneSnapshot: true, issuerAddressSnapshot: true, issuerTaxNumberSnapshot: true,
      issuerCrSnapshot: true, footerTextSnapshot: true, paymentInstructionsSnapshot: true,
      taxLabelSnapshot: true, taxRateSnapshot: true,
      notes: true, subscriptionId: true,
    },
  });
  if (!invoice) notFound();

  const [items, payment, subscription] = await Promise.all([
    prisma.invoiceItem.findMany({ where: { invoiceId: invoice.id }, orderBy: { createdAt: "asc" } }),
    prisma.payment.findFirst({
      where: { invoiceId: invoice.id, userId: session.uid, status: "COMPLETED" },
      select: { method: true, paidAt: true, referenceNumber: true },
    }),
    invoice.subscriptionId
      ? prisma.subscription.findFirst({ where: { id: invoice.subscriptionId, userId: session.uid }, select: { plan: true } })
      : null,
  ]);

  await trackEvent({ eventName: "invoice_viewed", userId: session.uid });

  return (
    <InvoiceView
      invoice={{
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        issueDate: invoice.issueDate.toISOString(),
        dueDate: invoice.dueDate?.toISOString() ?? null,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        subtotal: formatMoney(invoice.subtotal),
        discount: formatMoney(invoice.discount),
        taxAmount: formatMoney(invoice.taxAmount),
        total: formatMoney(invoice.total),
        currency: invoice.currency,
        periodStart: invoice.billingPeriodStart?.toISOString() ?? null,
        periodEnd: invoice.billingPeriodEnd?.toISOString() ?? null,
        customerName: invoice.customerNameSnapshot,
        customerEmail: invoice.customerEmailSnapshot,
        customerOrganization: invoice.customerOrganizationSnapshot,
        notes: invoice.notes,
        plan: subscription?.plan ?? null,
        issuerName: invoice.issuerNameSnapshot,
        issuerLegalName: invoice.issuerLegalNameSnapshot,
        issuerEmail: invoice.issuerEmailSnapshot,
        issuerPhone: invoice.issuerPhoneSnapshot,
        issuerAddress: invoice.issuerAddressSnapshot,
        issuerTaxNumber: invoice.issuerTaxNumberSnapshot,
        issuerCr: invoice.issuerCrSnapshot,
        footerText: invoice.footerTextSnapshot,
        paymentInstructions: invoice.paymentInstructionsSnapshot,
        taxLabel: invoice.taxLabelSnapshot,
        taxRate: invoice.taxRateSnapshot != null ? Number(invoice.taxRateSnapshot) : null,
      }}
      items={items.map((it) => ({
        id: it.id,
        description: it.description,
        quantity: it.quantity,
        unitPrice: formatMoney(it.unitPrice),
        total: formatMoney(it.total),
      }))}
      payment={
        payment
          ? { method: payment.method, paidAt: payment.paidAt.toISOString(), referenceNumber: payment.referenceNumber }
          : null
      }
    />
  );
}
