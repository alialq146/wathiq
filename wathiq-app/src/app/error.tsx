"use client";

// v2.5: حدّ خطأ عام على مستوى التطبيق. يمنع ظهور شاشة بيضاء أو أثر تقني للمستخدم
// عند أي استثناء غير متوقَّع في مكوّن خادم/عميل. الرسالة عربية عامة (لا تفاصيل
// داخلية)، مع زر «إعادة المحاولة» يستدعي reset() و RTL والوضعين معًا.
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // سجل تقني في الخادم/الكونسول فقط — لا يُعرض للمستخدم.
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-app)",
        color: "var(--text-body)",
        padding: "24px",
        fontFamily: "inherit",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>⚠️</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 8px" }}>
          حدث خطأ غير متوقع
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-muted)", lineHeight: 1.7, margin: "0 0 20px" }}>
          نعتذر عن ذلك. حدثت مشكلة أثناء تنفيذ طلبك. يمكنك إعادة المحاولة، وإن استمر الأمر عد لاحقًا.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => reset()}
            style={{
              background: "var(--primary)",
              color: "var(--text-on-brand)",
              border: "none",
              borderRadius: 10,
              padding: "10px 20px",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            إعادة المحاولة
          </button>
          <a
            href="/"
            style={{
              background: "var(--surface-card)",
              color: "var(--text-body)",
              border: "1px solid var(--border-default)",
              borderRadius: 10,
              padding: "10px 20px",
              fontSize: 15,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            العودة للرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}
