// v2.5: صفحة 404 عربية موحّدة الطابع (RTL + الوضعين) بدل صفحة Next الافتراضية.
export default function NotFound() {
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
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <div style={{ fontSize: 44, fontWeight: 800, color: "var(--text-strong)", marginBottom: 8 }}>
          ٤٠٤
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-strong)", margin: "0 0 8px" }}>
          الصفحة غير موجودة
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-muted)", lineHeight: 1.7, margin: "0 0 20px" }}>
          الرابط الذي فتحته غير صحيح أو أن الصفحة نُقلت. تأكد من العنوان أو عد إلى الصفحة الرئيسية.
        </p>
        <a
          href="/"
          style={{
            display: "inline-block",
            background: "var(--primary)",
            color: "var(--text-on-brand)",
            border: "none",
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
  );
}
