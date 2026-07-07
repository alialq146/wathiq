"use client";

import React from "react";
import Image from "next/image";
import { Button, Icon } from "@/components/ds";

const ERR: Record<string, string> = {
  invalid: "تعذر تسجيل الدخول. تأكد من البريد الإلكتروني وكلمة المرور ثم حاول مرة أخرى.",
  disabled: "تم إيقاف هذا الحساب مؤقتًا. يرجى التواصل مع فريق وثّق للمساعدة.",
  "bad-request": "حدثت مشكلة غير متوقعة. حاول مرة أخرى بعد قليل.",
  server: "حدثت مشكلة غير متوقعة. حاول مرة أخرى بعد قليل.",
  "not-configured": "المصادقة غير مُفعّلة على الخادم.",
  network: "تعذّر الاتصال بالخادم. تحقّق من الشبكة وحاول مرة أخرى.",
};

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

export function LoginForm({
  next,
  showSignup = false,
  initialError,
}: {
  next: string;
  showSignup?: boolean;
  initialError?: string;
}) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(initialError ?? null);
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.ok) {
        // Full navigation so the middleware re-evaluates with the new cookie.
        window.location.assign(next || "/");
        return;
      }
      setError(ERR[data.error] || ERR.invalid);
    } catch {
      setError(ERR.network);
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
      {/* Brand */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <Image src="/assets/wathiq-mark.png" alt="Wathiq" width={44} height={44} style={{ borderRadius: 10 }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ font: "var(--weight-bold) 20px/1.4 var(--font-sans)", color: "var(--navy-900)" }}>مرحبًا بعودتك إلى وثّق</div>
          <div style={{ font: "12px/1.6 var(--font-sans)", color: "var(--text-muted)", marginTop: 6 }}>
            سجّل دخولك لمتابعة تحليل المتطلبات وإدارة مشاريعك.
          </div>
        </div>
      </div>

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

      <div>
        <label style={{ font: "var(--weight-medium) 12px/1 var(--font-sans)", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
          كلمة المرور
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          dir="ltr"
          autoComplete="current-password"
          placeholder="••••••••"
          required
          style={{ ...field, textAlign: "start" }}
        />
        <div style={{ textAlign: "start", marginTop: 7 }}>
          <a href="/forgot-password" style={{ color: "var(--text-link)", textDecoration: "none", font: "12.5px var(--font-sans)" }}>
            نسيت كلمة المرور؟
          </a>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 11px",
            borderRadius: "var(--radius-md)",
            background: "var(--status-danger-bg)",
            color: "var(--status-danger-fg)",
            font: "12px/1.5 var(--font-sans)",
          }}
        >
          <Icon name="alert-circle" size={15} />
          <span>{error}</span>
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        fullWidth
        disabled={loading}
        iconStart={
          <Icon
            name={loading ? "loader-circle" : "log-in"}
            size={16}
            style={loading ? { animation: "wq-spin 0.7s linear infinite" } : undefined}
          />
        }
      >
        {loading ? "جاري التحقق من بياناتك..." : "تسجيل الدخول"}
      </Button>

      {showSignup && (
        <div style={{ textAlign: "center", font: "13px var(--font-sans)", color: "var(--text-muted)" }}>
          ليس لديك حساب في وثّق؟{" "}
          <a href="/signup" style={{ color: "var(--text-link)", textDecoration: "none", fontWeight: 600 }}>
            أنشئ حسابًا مجانيًا
          </a>
        </div>
      )}
    </form>
  );
}
