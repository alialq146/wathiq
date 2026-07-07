"use client";

import React from "react";
import Image from "next/image";
import { Button, Icon } from "@/components/ds";

// أمان: رسالة واحدة عامة دائمًا — لا نكشف هل البريد مسجل أم لا.
const GENERIC_MSG = "إذا كان البريد مسجلًا لدينا، ستصلك رسالة استعادة كلمة المرور.";

const field: React.CSSProperties = {
  width: "100%",
  height: 42,
  padding: "0 12px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  background: "var(--surface-card)",
  font: "14px var(--font-sans)",
  color: "var(--text-strong)",
  outline: "none",
};

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [netError, setNetError] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setNetError(false);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      setNetError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      style={{
        width: "100%",
        maxWidth: 380,
        background: "var(--surface-card)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        padding: 28,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Image src="/assets/wathiq-mark.png" alt="Wathiq" width={44} height={44} style={{ borderRadius: 10 }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ font: "var(--weight-bold) 20px/1.4 var(--font-sans)", color: "var(--navy-900)" }}>استعادة كلمة المرور</div>
          <div style={{ font: "12px/1.6 var(--font-sans)", color: "var(--text-muted)", marginTop: 6 }}>
            أدخل بريدك الإلكتروني وسنرسل لك رابط تعيين كلمة مرور جديدة.
          </div>
        </div>
      </div>

      {sent ? (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "12px 13px",
            borderRadius: "var(--radius-md)",
            background: "var(--status-success-bg)",
            color: "var(--status-success-fg)",
            font: "13px/1.7 var(--font-sans)",
          }}
        >
          <Icon name="mail-check" size={16} style={{ marginTop: 2 }} />
          <span>{GENERIC_MSG}</span>
        </div>
      ) : (
        <>
          <div>
            <label style={{ font: "var(--weight-medium) 12px/1 var(--font-sans)", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              autoComplete="username"
              placeholder="you@example.com"
              required
              style={{ ...field, textAlign: "start" }}
            />
          </div>

          {netError && (
            <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", borderRadius: "var(--radius-md)", background: "var(--status-danger-bg)", color: "var(--status-danger-fg)", font: "12px/1.5 var(--font-sans)" }}>
              <Icon name="alert-circle" size={15} />
              <span>تعذّر الاتصال بالخادم. تحقّق من الشبكة وحاول مرة أخرى.</span>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={loading}
            iconStart={
              <Icon
                name={loading ? "loader-circle" : "mail"}
                size={16}
                style={loading ? { animation: "wq-spin 0.7s linear infinite" } : undefined}
              />
            }
          >
            {loading ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}
          </Button>
        </>
      )}

      <div style={{ textAlign: "center", font: "13px var(--font-sans)", color: "var(--text-muted)" }}>
        تذكرت كلمة المرور؟{" "}
        <a href="/login" style={{ color: "var(--text-link)", textDecoration: "none", fontWeight: 600 }}>
          تسجيل الدخول
        </a>
      </div>
    </form>
  );
}
