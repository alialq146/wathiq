"use client";

/**
 * عرض الفاتورة للعميل — قالب رسمي قابل للطباعة (A4, RTL) بنفس آلية
 * window.print المستخدمة في تقارير وثّق؛ أزرار الواجهة تختفي عند الطباعة.
 * لا نستخدم عبارة «فاتورة ضريبية» — يتطلب ذلك اعتمادًا صريحًا لاحقًا.
 */

import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ds";
import { trackClientEvent } from "@/app/actions";
import { INVOICE_STATUS_AR, PAY_METHOD_AR, PLAN_AR } from "@/lib/billing";

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" }) : "—";

interface InvoiceData {
  invoiceNumber: string; status: string; issueDate: string; dueDate: string | null; paidAt: string | null;
  subtotal: string; discount: string; taxAmount: string; total: string; currency: string;
  periodStart: string | null; periodEnd: string | null;
  customerName: string; customerEmail: string; customerOrganization: string | null;
  notes: string | null; plan: string | null;
  // snapshot الجهة المصدرة والإعدادات وقت الإصدار (v2.1) — الفاتورة التاريخية ثابتة.
  issuerName: string | null; issuerLegalName: string | null; issuerEmail: string | null;
  issuerPhone: string | null; issuerAddress: string | null; issuerTaxNumber: string | null;
  issuerCr: string | null; footerText: string | null; paymentInstructions: string | null;
  taxLabel: string | null; taxRate: number | null;
}
interface ItemRow { id: string; description: string; quantity: number; unitPrice: string; total: string }

const STATUS_UI: Record<string, { bg: string; fg: string }> = {
  PAID: { bg: "var(--green-50)", fg: "var(--green-600)" },
  PENDING: { bg: "var(--amber-50)", fg: "var(--amber-600)" },
  OVERDUE: { bg: "var(--red-50)", fg: "var(--red-600)" },
  DRAFT: { bg: "var(--slate-100)", fg: "var(--text-muted)" },
  CANCELED: { bg: "var(--slate-100)", fg: "var(--text-muted)" },
  REFUNDED: { bg: "var(--violet-50)", fg: "var(--violet-500)" },
};

export function InvoiceView({
  invoice,
  items,
  payment,
}: {
  invoice: InvoiceData;
  items: ItemRow[];
  payment: { method: string; paidAt: string; referenceNumber: string | null } | null;
}) {
  const cur = invoice.currency === "SAR" ? "ريال" : invoice.currency;
  const st = STATUS_UI[invoice.status] ?? STATUS_UI.PENDING;

  const print = () => {
    void trackClientEvent("invoice_downloaded", { invoice: invoice.invoiceNumber });
    window.print();
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      <style>{`
        .inv-sheet { max-width: 820px; margin: 0 auto; padding: 28px 20px 60px; }
        .inv-paper { background: var(--surface-card); border: 1px solid var(--border-default); border-radius: var(--radius-xl); padding: 36px 40px; }
        .inv-items { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .inv-items th { text-align: start; font: var(--weight-semibold) 12px/1 var(--font-sans); color: var(--text-subtle); padding: 10px 12px; border-bottom: 2px solid var(--border-default); }
        .inv-items td { font: 13.5px/1.6 var(--font-sans); color: var(--text-strong); padding: 12px; border-bottom: 1px solid var(--border-subtle); }
        .inv-meta { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; }
        @media (max-width: 600px) { .inv-paper { padding: 24px 18px; } }
        @media print {
          body { background: #fff !important; }
          .inv-noprint { display: none !important; }
          .inv-sheet { padding: 0; max-width: none; }
          .inv-paper { border: none; border-radius: 0; padding: 0; }
          @page { size: A4; margin: 18mm; }
          .inv-items tr { break-inside: avoid; }
        }
      `}</style>

      <div className="inv-sheet">
        <div className="inv-noprint" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <Link href="/account/billing" style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "var(--weight-medium) 13px var(--font-sans)", color: "var(--blue-600)", textDecoration: "none" }}>
            <Icon name="arrow-right" size={15} /> العودة إلى الحساب والاشتراك
          </Link>
          <button
            onClick={print}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 18px", borderRadius: "var(--radius-pill)", border: "none", background: "var(--primary)", color: "#fff", font: "var(--weight-semibold) 13.5px var(--font-sans)", cursor: "pointer" }}
          >
            <Icon name="printer" size={15} color="#fff" /> طباعة / حفظ PDF
          </button>
        </div>

        <div className="inv-paper">
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", borderBottom: "2px solid var(--navy-900)", paddingBottom: 20 }}>
            <div>
              <div style={{ font: "var(--weight-bold) 22px/1.2 var(--font-sans)", color: "var(--navy-900)" }}>{invoice.issuerName || "وثّق"}</div>
              {invoice.issuerLegalName && <div style={{ font: "11.5px/1.5 var(--font-sans)", color: "var(--text-muted)", marginTop: 3 }}>{invoice.issuerLegalName}</div>}
              {invoice.issuerAddress && <div style={{ font: "11px/1.5 var(--font-sans)", color: "var(--text-subtle)", marginTop: 2 }}>{invoice.issuerAddress}</div>}
              {(invoice.issuerEmail || invoice.issuerPhone) && (
                <div style={{ font: "11px/1.5 var(--font-sans)", color: "var(--text-subtle)", direction: "ltr", textAlign: "end", marginTop: 2 }}>
                  {[invoice.issuerEmail, invoice.issuerPhone].filter(Boolean).join(" · ")}
                </div>
              )}
              {invoice.issuerTaxNumber && <div style={{ font: "11px/1.5 var(--font-sans)", color: "var(--text-subtle)", marginTop: 2 }}>الرقم الضريبي: <span style={{ direction: "ltr", display: "inline-block" }}>{invoice.issuerTaxNumber}</span></div>}
              {invoice.issuerCr && <div style={{ font: "11px/1.5 var(--font-sans)", color: "var(--text-subtle)", marginTop: 2 }}>السجل التجاري: <span style={{ direction: "ltr", display: "inline-block" }}>{invoice.issuerCr}</span></div>}
            </div>
            <div style={{ textAlign: "start" }}>
              <div style={{ font: "var(--weight-bold) 19px/1.3 var(--font-sans)", color: "var(--text-strong)" }}>فاتورة</div>
              <div style={{ font: "13px var(--font-mono)", color: "var(--text-muted)", direction: "ltr", marginTop: 4 }}>{invoice.invoiceNumber}</div>
              <span style={{ display: "inline-flex", marginTop: 8, padding: "4px 12px", borderRadius: "var(--radius-pill)", background: st.bg, color: st.fg, font: "var(--weight-semibold) 12px/1 var(--font-sans)" }}>
                {INVOICE_STATUS_AR[invoice.status] ?? invoice.status}
              </span>
            </div>
          </div>

          {/* بيانات العميل والتواريخ */}
          <div className="inv-meta" style={{ margin: "22px 0" }}>
            <div>
              <div style={{ font: "var(--weight-semibold) 11.5px/1 var(--font-sans)", color: "var(--text-subtle)", marginBottom: 7 }}>فاتورة إلى</div>
              <div style={{ font: "var(--weight-semibold) 14px/1.5 var(--font-sans)", color: "var(--text-strong)" }}>{invoice.customerName}</div>
              {invoice.customerOrganization && (
                <div style={{ font: "12.5px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>{invoice.customerOrganization}</div>
              )}
              <div style={{ font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)", direction: "ltr", textAlign: "end" }}>{invoice.customerEmail}</div>
            </div>
            <div>
              <div style={{ font: "var(--weight-semibold) 11.5px/1 var(--font-sans)", color: "var(--text-subtle)", marginBottom: 7 }}>تاريخ الإصدار</div>
              <div style={{ font: "13.5px/1.5 var(--font-sans)", color: "var(--text-strong)" }}>{fmtDate(invoice.issueDate)}</div>
              {invoice.dueDate && invoice.status !== "PAID" && (
                <>
                  <div style={{ font: "var(--weight-semibold) 11.5px/1 var(--font-sans)", color: "var(--text-subtle)", margin: "10px 0 5px" }}>تاريخ الاستحقاق</div>
                  <div style={{ font: "13.5px/1.5 var(--font-sans)", color: "var(--text-strong)" }}>{fmtDate(invoice.dueDate)}</div>
                </>
              )}
            </div>
            <div>
              {invoice.plan && (
                <>
                  <div style={{ font: "var(--weight-semibold) 11.5px/1 var(--font-sans)", color: "var(--text-subtle)", marginBottom: 7 }}>الخطة</div>
                  <div style={{ font: "13.5px/1.5 var(--font-sans)", color: "var(--text-strong)" }}>وثّق {PLAN_AR[invoice.plan] ?? invoice.plan}</div>
                </>
              )}
              {invoice.periodStart && (
                <>
                  <div style={{ font: "var(--weight-semibold) 11.5px/1 var(--font-sans)", color: "var(--text-subtle)", margin: "10px 0 5px" }}>فترة الاشتراك</div>
                  <div style={{ font: "12.5px/1.6 var(--font-sans)", color: "var(--text-strong)" }}>
                    {fmtDate(invoice.periodStart)} — {fmtDate(invoice.periodEnd)}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* البنود */}
          <table className="inv-items">
            <thead>
              <tr>
                <th style={{ width: "50%" }}>البيان</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>{it.description}</td>
                  <td>{it.quantity}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{it.unitPrice} {cur}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{it.total} {cur}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* المجاميع */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
            <div style={{ minWidth: 260 }}>
              {[
                ["المجموع الفرعي", invoice.subtotal],
                ...(Number(invoice.discount.replace(/,/g, "")) > 0 ? [["الخصم", `- ${invoice.discount}`]] : []),
                ...(Number(invoice.taxAmount.replace(/,/g, "")) > 0
                  ? [[`${invoice.taxLabel || "الضريبة"}${invoice.taxRate ? ` (${invoice.taxRate}%)` : ""}`, invoice.taxAmount]]
                  : []),
              ].map(([k, v]) => (
                <div key={k as string} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", font: "13px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
                  <span>{k}</span>
                  <span style={{ whiteSpace: "nowrap" }}>{v} {cur}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "2px solid var(--navy-900)", font: "var(--weight-bold) 15px/1.5 var(--font-sans)", color: "var(--text-strong)" }}>
                <span>الإجمالي المستحق</span>
                <span style={{ whiteSpace: "nowrap" }}>{invoice.total} {cur}</span>
              </div>
            </div>
          </div>

          {/* الدفع */}
          {payment && (
            <div style={{ marginTop: 18, padding: "12px 15px", borderRadius: "var(--radius-md)", background: "var(--green-50)", border: "1px solid var(--green-100)", font: "13px/1.7 var(--font-sans)", color: "var(--text-strong)" }}>
              <b>تم الدفع</b> — {PAY_METHOD_AR[payment.method] ?? payment.method} بتاريخ {fmtDate(payment.paidAt)}
              {payment.referenceNumber ? <> · مرجع: <span style={{ direction: "ltr", display: "inline-block", font: "12px var(--font-mono)" }}>{payment.referenceNumber}</span></> : null}
            </div>
          )}

          {/* تعليمات الدفع (snapshot وقت الإصدار) */}
          {invoice.paymentInstructions && (
            <div style={{ marginTop: 16, padding: "12px 15px", borderRadius: "var(--radius-md)", background: "var(--slate-50)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ font: "var(--weight-semibold) 12px/1 var(--font-sans)", color: "var(--text-subtle)", marginBottom: 6 }}>تعليمات الدفع</div>
              <div style={{ font: "12.5px/1.7 var(--font-sans)", color: "var(--text-strong)", whiteSpace: "pre-wrap" }}>{invoice.paymentInstructions}</div>
            </div>
          )}

          {invoice.notes && (
            <p style={{ font: "12.5px/1.7 var(--font-sans)", color: "var(--text-muted)", marginTop: 16 }}>{invoice.notes}</p>
          )}

          {/* التذييل (snapshot وقت الإصدار) */}
          <div style={{ marginTop: 30, paddingTop: 16, borderTop: "1px solid var(--border-subtle)", font: "11.5px/1.8 var(--font-sans)", color: "var(--text-subtle)", textAlign: "center" }}>
            {invoice.footerText || "شكرًا لاستخدامك وثّق."}
            <br />
            هذه الفاتورة صادرة من نظام {invoice.issuerName || "وثّق"} بناءً على بيانات الاشتراك المسجلة.
          </div>
        </div>
      </div>
    </div>
  );
}
