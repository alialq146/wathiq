"use client";

import React from "react";
import Image from "next/image";
import { Button, Icon } from "@/components/ds";
import { REPORT_CSS, exportDocumentWord } from "@/lib/export";

/**
 * غلاف عرض نماذج الوثائق العامة — يعرض جسم الوثيقة المبني في الخادم بنفس
 * هوية التقارير (REPORT_CSS)، مع طباعة/حفظ PDF وتحميل Word بالآلية الحالية.
 * لا قاعدة بيانات ولا ذكاء اصطناعي — محتوى ثابت بالكامل.
 */
export function SampleDocShell({
  title,
  bodyHtml,
  filename,
  otherHref,
  otherLabel,
}: {
  title: string;
  bodyHtml: string;
  filename: string;
  otherHref: string;
  otherLabel: string;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-app)" }}>
      {/* شريط علوي — يختفي في الطباعة */}
      <header
        className="no-print"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          padding: "10px 18px",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--surface-card)",
        }}
      >
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
          <Image src="/assets/wathiq-mark.png" alt="Wathiq" width={28} height={28} style={{ borderRadius: 7 }} />
          <span style={{ font: "var(--weight-bold) 15px/1 var(--font-sans)", color: "var(--navy-900)" }}>وثّق</span>
        </a>
        <span
          style={{
            font: "var(--weight-medium) 11.5px/1 var(--font-sans)",
            color: "var(--amber-700, #92600a)",
            background: "var(--amber-50, #fdf6e7)",
            border: "1px solid var(--amber-100, #f5e6c4)",
            padding: "5px 10px",
            borderRadius: "var(--radius-pill)",
          }}
        >
          نموذج تجريبي صادر من منصة وثّق — بيانات توضيحية فقط
        </span>
        <div style={{ marginInlineStart: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a
            href={otherHref}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", color: "var(--text-body)", font: "13px var(--font-sans)", textDecoration: "none" }}
          >
            {otherLabel}
          </a>
          <Button size="sm" variant="secondary" iconStart={<Icon name="file-down" size={15} />} onClick={() => exportDocumentWord(title, bodyHtml, filename)}>
            تحميل Word
          </Button>
          <Button size="sm" variant="primary" iconStart={<Icon name="printer" size={15} />} onClick={() => window.print()}>
            طباعة / حفظ PDF
          </Button>
          <a
            href="/signup"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 14px", borderRadius: "var(--radius-pill)", background: "var(--primary)", color: "#fff", font: "var(--weight-semibold) 13px var(--font-sans)", textDecoration: "none" }}
          >
            أنشئ وثيقتك من مشروعك <Icon name="arrow-left" size={14} />
          </a>
        </div>
      </header>

      {/* جسم الوثيقة بنفس CSS التقارير (RTL + طباعة) */}
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "26px 18px 60px" }}>
        <style dangerouslySetInnerHTML={{ __html: REPORT_CSS }} />
        {/* على الشاشات الصغيرة: الجداول العريضة تتمرر داخل الوثيقة نفسها
            بدل كسر عرض الصفحة — الطباعة لا تتأثر. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .wq-sample-doc { overflow-x: auto; max-width: 100%; }
              @media (max-width: 640px) {
                .wq-sample-doc { padding: 18px 14px !important; }
                .wq-sample-doc table { display: block; overflow-x: auto; max-width: 100%; }
              }
            `,
          }}
        />
        <div
          style={{ background: "#fff", borderRadius: 12, border: "1px solid var(--border-subtle)", padding: "28px 30px", boxShadow: "var(--shadow-sm)" }}
          className="wq-sample-doc"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      </main>
    </div>
  );
}
