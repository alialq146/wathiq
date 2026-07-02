"use client";

import React from "react";
import Image from "next/image";
import { Button, Icon } from "@/components/ds";

const ERR: Record<string, string> = {
  invalid: "البريد أو كلمة المرور غير صحيحة.",
  "bad-request": "طلب غير صالح. حاول مرة أخرى.",
  "not-configured": "المصادقة غير مُفعّلة على الخادم.",
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

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
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
          <div style={{ font: "var(--weight-bold) 20px/1 var(--font-sans)", color: "var(--navy-900)" }}>وثّق</div>
          <div style={{ font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)", marginTop: 6 }}>
            سجّل الدخول للوصول إلى مساحة العمل
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
        {loading ? "جارٍ الدخول…" : "تسجيل الدخول"}
      </Button>
    </form>
  );
}
