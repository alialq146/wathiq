"use client";

import React from "react";
import Image from "next/image";
import { Button, Icon } from "@/components/ds";

const ERR: Record<string, string> = {
  "bad-name": "اكتب اسمك (حرفان على الأقل).",
  "bad-email": "أدخل بريدًا إلكترونيًا صحيحًا.",
  "weak-password": "كلمة المرور قصيرة — ٨ أحرف على الأقل.",
  "email-taken": "هذا البريد مسجّل بالفعل. جرّب تسجيل الدخول.",
  "no-db": "قاعدة البيانات غير متصلة — لا يمكن إنشاء حسابات حاليًا.",
  "bad-request": "طلب غير صالح. حاول مرة أخرى.",
  mismatch: "كلمتا المرور غير متطابقتين.",
  server: "تعذّر إنشاء الحساب. حاول مرة أخرى.",
  network: "تعذّر الاتصال بالخادم. تحقّق من الشبكة.",
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

const label: React.CSSProperties = {
  font: "var(--weight-medium) 12px/1 var(--font-sans)",
  color: "var(--text-muted)",
  display: "block",
  marginBottom: 6,
};

export function SignupForm() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (password !== confirm) {
      setError(ERR.mismatch);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (data.ok) {
        // Full navigation so the middleware re-evaluates with the new cookie.
        window.location.assign("/");
        return;
      }
      setError(ERR[data.error] || ERR.server);
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
          <div style={{ font: "var(--weight-bold) 20px/1 var(--font-sans)", color: "var(--navy-900)" }}>وثّق</div>
          <div style={{ font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)", marginTop: 6 }}>
            أنشئ حسابك وابدأ توثيق متطلباتك
          </div>
        </div>
      </div>

      <div>
        <label style={label}>الاسم</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoComplete="name"
          placeholder="مثال: سارة العتيبي"
          required
          minLength={2}
          style={field}
        />
      </div>

      <div>
        <label style={label}>البريد الإلكتروني</label>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={label}>كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            dir="ltr"
            autoComplete="new-password"
            placeholder="٨ أحرف فأكثر"
            required
            minLength={8}
            style={{ ...field, textAlign: "start" }}
          />
        </div>
        <div>
          <label style={label}>تأكيد كلمة المرور</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            dir="ltr"
            autoComplete="new-password"
            placeholder="••••••••"
            required
            minLength={8}
            style={{ ...field, textAlign: "start" }}
          />
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
            name={loading ? "loader-circle" : "user-plus"}
            size={16}
            style={loading ? { animation: "wq-spin 0.7s linear infinite" } : undefined}
          />
        }
      >
        {loading ? "جارٍ إنشاء الحساب…" : "إنشاء حساب"}
      </Button>

      <div style={{ textAlign: "center", font: "13px var(--font-sans)", color: "var(--text-muted)" }}>
        لديك حساب بالفعل؟{" "}
        <a href="/login" style={{ color: "var(--text-link)", textDecoration: "none", fontWeight: 600 }}>
          تسجيل الدخول
        </a>
      </div>
    </form>
  );
}
