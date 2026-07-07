"use client";

/**
 * نافذة «إرسال ملاحظة» (v1.9.11) — قناة المستخدم المسجل لإبلاغنا بمشكلة أو
 * اقتراح من داخل المنصة. نموذج قصير عمدًا: نوع + رسالة + أهمية، والسياق
 * (الصفحة/المشروع/الخطة/المتصفح) يُلتقط تلقائيًا في الخادم بلا أسرار.
 */

import React from "react";
import { Button, Icon } from "@/components/ds";
import { submitFeedback } from "@/app/actions";

const FEEDBACK_TYPES = ["مشكلة", "اقتراح", "صعوبة في الاستخدام", "طلب ميزة", "أخرى"];
const SEVERITIES = ["عادي", "مهم", "عاجل"];

const fieldLabel: React.CSSProperties = {
  font: "var(--weight-semibold) 12.5px/1 var(--font-sans)",
  color: "var(--text-strong)",
  marginBottom: 7,
  display: "block",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  height: 38,
  padding: "0 12px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  background: "var(--surface-card)",
  font: "13.5px var(--font-sans)",
  color: "var(--text-strong)",
  outline: "none",
};

export function FeedbackDialog({
  open,
  onClose,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  onSent: (msg: string) => void;
}) {
  const [type, setType] = React.useState(FEEDBACK_TYPES[0]);
  const [severity, setSeverity] = React.useState(SEVERITIES[0]);
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!open) return null;

  const send = async () => {
    if (sending) return; // منع الضغط المزدوج
    if (!message.trim()) {
      setError("اكتب ملاحظتك أولًا — الرسالة لا يمكن أن تكون فارغة.");
      return;
    }
    setSending(true);
    setError(null);
    const res = await submitFeedback({
      type,
      severity,
      message,
      currentPath: typeof window !== "undefined" ? window.location.pathname : null,
    });
    setSending(false);
    if (res.ok) {
      setMessage("");
      setType(FEEDBACK_TYPES[0]);
      setSeverity(SEVERITIES[0]);
      onClose();
      onSent("تم إرسال ملاحظتك، شكرًا لمساعدتك في تحسين وثّق.");
    } else {
      setError("تعذر إرسال الملاحظة الآن. حاول مرة أخرى.");
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "var(--surface-overlay)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "48px 20px", zIndex: 60, overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="إرسال ملاحظة"
        style={{
          width: "100%", maxWidth: 480, background: "var(--surface-card)",
          borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)",
          display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 96px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <Icon name="message-circle" size={17} color="var(--teal-600)" />
          <span style={{ font: "var(--weight-bold) 15px/1 var(--font-sans)", color: "var(--text-strong)", flex: 1 }}>
            إرسال ملاحظة
          </span>
          <button onClick={onClose} aria-label="إغلاق" style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}>
            <Icon name="x" size={16} color="var(--text-subtle)" />
          </button>
        </div>

        <div style={{ padding: "18px 20px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ font: "12.5px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>
            ملاحظتك تصل لفريق وثّق مباشرة وتساعدنا على التحسين بسرعة. تُلتقط الصفحة الحالية تلقائيًا.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={fieldLabel} htmlFor="fb-type">نوع الملاحظة</label>
              <select id="fb-type" style={selectStyle} value={type} onChange={(e) => setType(e.target.value)}>
                {FEEDBACK_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={fieldLabel} htmlFor="fb-severity">مستوى الأهمية</label>
              <select id="fb-severity" style={selectStyle} value={severity} onChange={(e) => setSeverity(e.target.value)}>
                {SEVERITIES.map((sv) => (
                  <option key={sv} value={sv}>{sv}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={fieldLabel} htmlFor="fb-message">الرسالة</label>
            <textarea
              id="fb-message"
              rows={5}
              maxLength={2000}
              placeholder="اكتب ملاحظتك هنا، مثل مشكلة واجهتك أو اقتراح لتحسين وثّق."
              value={message}
              onChange={(e) => { setMessage(e.target.value); if (error) setError(null); }}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: "var(--radius-md)",
                border: `1px solid ${error ? "var(--red-400)" : "var(--border-default)"}`,
                background: "var(--surface-card)", font: "13.5px/1.7 var(--font-sans)",
                color: "var(--text-strong)", outline: "none", resize: "vertical",
              }}
            />
            {error && (
              <div style={{ font: "12px/1.5 var(--font-sans)", color: "var(--red-600)", marginTop: 6 }}>{error}</div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 20px", borderTop: "1px solid var(--border-subtle)" }}>
          <Button variant="ghost" onClick={onClose} disabled={sending}>إلغاء</Button>
          <Button variant="primary" onClick={send} disabled={sending} iconStart={<Icon name="send" size={14} />}>
            {sending ? "جارٍ الإرسال…" : "إرسال الملاحظة"}
          </Button>
        </div>
      </div>
    </div>
  );
}
