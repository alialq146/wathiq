"use client";

import React from "react";
import { Button, Icon } from "@/components/ds";
import { saveRequirement, type RequirementInput } from "@/app/actions";
import type { Requirement } from "@/lib/data";
import type { RequirementStatus, PriorityLevel } from "@/components/ds";

const STATUS_OPTIONS: { v: RequirementStatus; l: string }[] = [
  { v: "draft", l: "مسودة" },
  { v: "analyzing", l: "قيد التحليل" },
  { v: "review", l: "قيد المراجعة" },
  { v: "needs_info", l: "بحاجة لمعلومات" },
  { v: "approved", l: "معتمد" },
  { v: "blocked", l: "محظور" },
];

const PRIORITY_OPTIONS: { v: PriorityLevel; l: string }[] = [
  { v: "critical", l: "حرجة" },
  { v: "high", l: "عالية" },
  { v: "medium", l: "متوسطة" },
  { v: "low", l: "منخفضة" },
];

const ERR: Record<string, string> = {
  "no-db": "التعديل يتطلب قاعدة بيانات — يعمل على الموقع المنشور فقط.",
  "duplicate-id": "رقم المتطلب مستخدم من قبل. اختر رقمًا آخر.",
  "missing-id": "أدخل رقم المتطلب.",
  "missing-title": "أدخل عنوان المتطلب.",
  server: "تعذّر الحفظ. حاول مرة أخرى.",
};

const fieldLabel: React.CSSProperties = {
  font: "var(--weight-medium) 12px/1 var(--font-sans)",
  color: "var(--text-muted)",
  marginBottom: 6,
  display: "block",
};
const fieldBox: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  background: "var(--surface-card)",
  font: "14px var(--font-sans)",
  color: "var(--text-strong)",
  outline: "none",
};

export interface RequirementFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  initial: Requirement | null;
  onClose: () => void;
  onSaved: () => void;
}

export function RequirementFormDialog({
  open,
  mode,
  initial,
  onClose,
  onSaved,
}: RequirementFormDialogProps) {
  const [form, setForm] = React.useState<RequirementInput>(() => blank());
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && initial) {
      setForm({
        id: initial.id,
        title: initial.title,
        description: initial.description,
        status: initial.status,
        priority: initial.priority,
        confidence: initial.confidence,
        criteria: initial.criteria,
        openQuestions: initial.openQuestions,
        module: initial.module,
        stakeholders: initial.stakeholders,
      });
    } else {
      setForm(blank());
    }
  }, [open, mode, initial]);

  if (!open) return null;

  const set = <K extends keyof RequirementInput>(k: K, v: RequirementInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    setError(null);
    const res = await saveRequirement(form, mode === "edit" ? initial?.id : undefined);
    setSaving(false);
    if (res.ok) {
      onSaved();
    } else {
      setError(ERR[res.error] || ERR.server);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--surface-overlay)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "48px 20px",
        zIndex: 50,
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 560,
          background: "var(--surface-card)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
          border: "1px solid var(--border-default)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: "var(--radius-sm)",
              background: "var(--blue-50)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "0 0 30px",
            }}
          >
            <Icon name={mode === "edit" ? "pencil" : "plus"} size={16} color="var(--blue-600)" />
          </span>
          <span style={{ font: "var(--weight-semibold) 16px var(--font-sans)", color: "var(--text-strong)" }}>
            {mode === "edit" ? "تعديل المتطلب" : "متطلب جديد"}
          </span>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            style={{
              marginInlineStart: "auto",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-subtle)",
              display: "inline-flex",
            }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12 }}>
            <div>
              <label style={fieldLabel}>الرقم</label>
              <input
                value={form.id}
                onChange={(e) => set("id", e.target.value)}
                disabled={mode === "edit"}
                placeholder="FR-050"
                dir="ltr"
                style={{
                  ...fieldBox,
                  fontFamily: "var(--font-mono)",
                  opacity: mode === "edit" ? 0.6 : 1,
                  cursor: mode === "edit" ? "not-allowed" : "text",
                }}
              />
            </div>
            <div>
              <label style={fieldLabel}>العنوان</label>
              <input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="عنوان المتطلب"
                style={fieldBox}
              />
            </div>
          </div>

          <div>
            <label style={fieldLabel}>الوصف</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="وصف تفصيلي للمتطلب…"
              rows={3}
              style={{ ...fieldBox, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={fieldLabel}>الحالة</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as RequirementStatus)}
                style={fieldBox}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={fieldLabel}>الأولوية</label>
              <select
                value={form.priority}
                onChange={(e) => set("priority", e.target.value as PriorityLevel)}
                style={fieldBox}
              >
                {PRIORITY_OPTIONS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.l}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={fieldLabel}>الثقة (٪)</label>
              <input
                value={form.confidence ?? ""}
                onChange={(e) =>
                  set("confidence", e.target.value === "" ? null : Number(e.target.value))
                }
                type="number"
                min={0}
                max={100}
                placeholder="—"
                dir="ltr"
                style={fieldBox}
              />
            </div>
            <div>
              <label style={fieldLabel}>معايير القبول</label>
              <input
                value={form.criteria}
                onChange={(e) => set("criteria", Number(e.target.value))}
                type="number"
                min={0}
                dir="ltr"
                style={fieldBox}
              />
            </div>
            <div>
              <label style={fieldLabel}>أسئلة مفتوحة</label>
              <input
                value={form.openQuestions}
                onChange={(e) => set("openQuestions", Number(e.target.value))}
                type="number"
                min={0}
                dir="ltr"
                style={fieldBox}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={fieldLabel}>الوحدة</label>
              <input
                value={form.module}
                onChange={(e) => set("module", e.target.value)}
                placeholder="المصادقة"
                style={fieldBox}
              />
            </div>
            <div>
              <label style={fieldLabel}>أصحاب المصلحة (افصل بفاصلة)</label>
              <input
                value={form.stakeholders.join("، ")}
                onChange={(e) =>
                  set(
                    "stakeholders",
                    e.target.value.split(/[،,]/).map((s) => s.trim())
                  )
                }
                placeholder="سارة، عمر، ليان"
                style={fieldBox}
              />
            </div>
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                background: "var(--red-50)",
                border: "1px solid var(--red-100)",
                font: "13px var(--font-sans)",
                color: "var(--red-600)",
              }}
            >
              <Icon name="alert-triangle" size={15} color="var(--red-500)" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            padding: "14px 20px",
            borderTop: "1px solid var(--border-subtle)",
            background: "var(--slate-25)",
          }}
        >
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={saving}
            iconStart={<Icon name={saving ? "loader" : "check"} size={15} />}
          >
            {saving ? "جارٍ الحفظ…" : mode === "edit" ? "حفظ التغييرات" : "إضافة المتطلب"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function blank(): RequirementInput {
  return {
    id: "",
    title: "",
    description: "",
    status: "draft",
    priority: "medium",
    confidence: null,
    criteria: 0,
    openQuestions: 0,
    module: "",
    stakeholders: [],
  };
}
