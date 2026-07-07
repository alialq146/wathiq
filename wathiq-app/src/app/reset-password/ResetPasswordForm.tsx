"use client";

import React from "react";
import Image from "next/image";
import { Button, Icon } from "@/components/ds";

const INVALID_MSG = "رابط الاستعادة غير صالح أو انتهت صلاحيته.";

const ERR: Record<string, string> = {
  "invalid-token": INVALID_MSG,
  "weak-password": "كلمة المرور قصيرة جدًا — استخدم ٨ أحرف على الأقل.",
  "bad-request": "حدثت مشكلة غير متوقعة. حاول مرة أخرى بعد قليل.",
  server: "حدثت مشكلة غير متوقعة. حاول مرة أخرى بعد قليل.",
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

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (password.length < 8) {
      setError(ERR["weak-password"]);
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين — تأكد من كتابتهما بنفس الشكل.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.ok) setDone(true);
      else setError(ERR[data.error] || ERR.server);
    } catch {
      setError("تعذّر الاتصال بالخادم. تحقّق من الشبكة وحاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const card: React.CSSProperties = {
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
  };

  const brand = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginBottom: 4 }}>
      <Image src="/assets/wathiq-mark.png" alt="Wathiq" width={44} height={44} style={{ borderRadius: 10 }} />
      <div style={{ font: "var(--weight-bold) 20px/1.4 var(--font-sans)", color: "var(--navy-900)", textAlign: "center" }}>
        تعيين كلمة مرور جديدة
      </div>
    </div>
  );

  // لا token في الرابط إطلاقًا → نفس رسالة الرابط غير الصالح.
  if (!token) {
    return (
      <div style={card}>
        {brand}
        <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 13px", borderRadius: "var(--radius-md)", background: "var(--status-danger-bg)", color: "var(--status-danger-fg)", font: "13px/1.6 var(--font-sans)" }}>
          <Icon name="alert-circle" size={16} />
          <span>{INVALID_MSG}</span>
        </div>
        <a href="/forgot-password" style={{ textAlign: "center", color: "var(--text-link)", textDecoration: "none", font: "var(--weight-semibold) 13px var(--font-sans)" }}>
          طلب رابط استعادة جديد
        </a>
      </div>
    );
  }

  if (done) {
    return (
      <div style={card}>
        {brand}
        <div role="status" style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "12px 13px", borderRadius: "var(--radius-md)", background: "var(--status-success-bg)", color: "var(--status-success-fg)", font: "13px/1.7 var(--font-sans)" }}>
          <Icon name="check-circle" size={16} style={{ marginTop: 2 }} />
          <span>تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.</span>
        </div>
        <Button variant="primary" fullWidth iconStart={<Icon name="log-in" size={16} />} onClick={() => window.location.assign("/login")}>
          الانتقال لتسجيل الدخول
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={card}>
      {brand}

      <div>
        <label style={{ font: "var(--weight-medium) 12px/1 var(--font-sans)", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
          كلمة المرور الجديدة
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          dir="ltr"
          autoComplete="new-password"
          placeholder="••••••••"
          required
          minLength={8}
          style={{ ...field, textAlign: "start" }}
        />
        <div style={{ font: "11px/1.6 var(--font-sans)", color: "var(--text-subtle)", marginTop: 5 }}>٨ أحرف على الأقل.</div>
      </div>

      <div>
        <label style={{ font: "var(--weight-medium) 12px/1 var(--font-sans)", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
          تأكيد كلمة المرور
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          dir="ltr"
          autoComplete="new-password"
          placeholder="••••••••"
          required
          style={{ ...field, textAlign: "start" }}
        />
      </div>

      {error && (
        <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 11px", borderRadius: "var(--radius-md)", background: "var(--status-danger-bg)", color: "var(--status-danger-fg)", font: "12px/1.5 var(--font-sans)" }}>
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
            name={loading ? "loader-circle" : "key-round"}
            size={16}
            style={loading ? { animation: "wq-spin 0.7s linear infinite" } : undefined}
          />
        }
      >
        {loading ? "جاري التحديث..." : "تحديث كلمة المرور"}
      </Button>
    </form>
  );
}
