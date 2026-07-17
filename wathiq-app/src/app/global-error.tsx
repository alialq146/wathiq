"use client";

// v2.5: حدّ خطأ على مستوى الجذر — يلتقط الأخطاء التي تقع داخل RootLayout نفسه،
// حيث لا يعمل error.tsx العادي. يجب أن يُصيّر <html>/<body> بنفسه. رسالة عربية
// ثابتة بدون اعتماد على أي أنماط قد تكون فشلت في التحميل.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html dir="rtl" lang="ar">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0b1220", color: "#e5eaf2" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px" }}>حدث خطأ غير متوقع</h1>
            <p style={{ fontSize: 15, opacity: 0.8, lineHeight: 1.7, margin: "0 0 20px" }}>
              نعتذر عن ذلك. تعذّر تحميل التطبيق. يرجى إعادة المحاولة.
            </p>
            <button
              onClick={() => reset()}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "10px 22px",
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
