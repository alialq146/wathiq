"use client";

import React from "react";
import { Button, Icon } from "@/components/ds";
import { saveRequirement, type RequirementInput } from "@/app/actions";
import type { Requirement } from "@/lib/data";
import type { PriorityLevel } from "@/components/ds";
import { useWorkspaceData } from "./WorkspaceDataContext";

const TYPE_OPTIONS: { v: string; l: string }[] = [
  { v: "", l: "— غير محدد —" },
  { v: "وظيفي", l: "وظيفي (Functional)" },
  { v: "غير وظيفي", l: "غير وظيفي (Non-Functional)" },
  { v: "قاعدة عمل", l: "قاعدة عمل (Business Rule)" },
  { v: "قيد", l: "قيد (Constraint)" },
  { v: "أخرى", l: "أخرى (Other)" },
];

const SOURCE_OPTIONS: { v: string; l: string }[] = [
  { v: "", l: "— غير محدد —" },
  { v: "عميل", l: "عميل" },
  { v: "اجتماع", l: "اجتماع" },
  { v: "وثيقة", l: "وثيقة" },
  { v: "بريد", l: "بريد" },
  { v: "ورشة عمل", l: "ورشة عمل" },
  { v: "أخرى", l: "أخرى" },
];

const PRIORITY_OPTIONS: { v: PriorityLevel; l: string }[] = [
  { v: "critical", l: "حرجة" },
  { v: "high", l: "عالية" },
  { v: "medium", l: "متوسطة" },
  { v: "low", l: "منخفضة" },
];

const ERR: Record<string, string> = {
  conflict: "تم تعديل هذا المتطلب منذ فتحه. راجع النسخة الأحدث قبل الحفظ.",
  "no-db": "التعديل يتطلب قاعدة بيانات — يعمل على الموقع المنشور فقط.",
  "duplicate-id": "رقم المتطلب مستخدم مسبقًا، اختر رقمًا آخر.",
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
  const { requirements, activeProject, modules } = useWorkspaceData();
  const [form, setForm] = React.useState<RequirementInput>(() => blank());
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // اقتراح رقم تلقائي منظم للمتطلب الجديد — قابل للتعديل دائمًا.
  // الصيغة: <كود المشروع>-REQ-001 (أو REQ-001 بلا كود)، والرقم التالي يُشتق
  // من أكبر لاحقة رقمية في متطلبات المشروع الظاهرة.
  const suggestedId = React.useMemo(() => {
    const prefix = activeProject?.code?.trim() ? `${activeProject.code.trim()}-REQ-` : "REQ-";
    let maxN = 0;
    for (const r of requirements) {
      const m = r.id.match(/(\d+)\s*$/);
      if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
    }
    return `${prefix}${String(maxN + 1).padStart(3, "0")}`;
  }, [requirements, activeProject]);

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
        type: initial.type ?? null,
        confidence: initial.confidence,
        criteria: initial.criteria,
        openQuestions: initial.openQuestions,
        module: initial.module,
        stakeholders: initial.stakeholders,
        notes: initial.notes ?? null,
        source: initial.source ?? null,
        assignee: initial.assignee ?? null,
        version: initial.version ?? 1,
        moduleId: initial.moduleId ?? null,
      });
    } else {
      // متطلب جديد: نملأ الرقم بالاقتراح التلقائي — يبقى قابلًا للتعديل.
      setForm({ ...blank(), id: suggestedId });
    }
  }, [open, mode, initial, suggestedId]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = <K extends keyof RequirementInput>(k: K, v: RequirementInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    setError(null);
    const payload = mode === "edit" ? { ...form, expectedUpdatedAt: initial?.updatedAt ?? null } : form;
    const res = await saveRequirement(payload, mode === "edit" ? initial?.id : undefined);
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
              <label style={fieldLabel}>النوع</label>
              <select
                value={form.type ?? ""}
                onChange={(e) => set("type", e.target.value || null)}
                style={fieldBox}
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.v} value={o.v}>{o.l}</option>
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
                  <option key={o.v} value={o.v}>{o.l}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 84px", gap: 12 }}>
            <div>
              <label style={fieldLabel}>المصدر</label>
              <select
                value={form.source ?? ""}
                onChange={(e) => set("source", e.target.value || null)}
                style={fieldBox}
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.v} value={o.v}>{o.l}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={fieldLabel}>المسؤول (اختياري)</label>
              <input
                value={form.assignee ?? ""}
                onChange={(e) => set("assignee", e.target.value || null)}
                placeholder="اسم المالك"
                style={fieldBox}
              />
            </div>
            <div>
              <label style={fieldLabel}>الإصدار</label>
              <input
                type="number"
                min={1}
                value={form.version ?? 1}
                onChange={(e) => set("version", Math.max(1, Number(e.target.value) || 1))}
                dir="ltr"
                style={fieldBox}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={fieldLabel}>الوحدة (اختياري)</label>
              <select
                value={form.moduleId ?? ""}
                onChange={(e) => {
                  const id = e.target.value || null;
                  const mod = modules.find((m) => m.id === id);
                  // نزامن الاسم النصي القديم (module) مع الوحدة المختارة —
                  // وعند «بدون وحدة» نُبقي النص القديم كما هو (توافق خلفي).
                  setForm((f) => ({ ...f, moduleId: id, module: mod ? mod.name : f.module }));
                }}
                style={fieldBox}
              >
                <option value="">— بدون وحدة —</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              {modules.length === 0 && (
                <div style={{ font: "11px/1.6 var(--font-sans)", color: "var(--text-subtle)", marginTop: 5 }}>
                  يمكنك إضافة وحدات من صفحة المشروع لتنظيم المتطلبات.
                </div>
              )}
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

          <div>
            <label style={fieldLabel}>ملاحظات (اختياري)</label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="أي سياق أو قيود إضافية تساعد التحليل…"
              rows={2}
              style={{ ...fieldBox, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--teal-50)", border: "1px solid var(--teal-100)" }}>
            <Icon name="sparkles" size={15} color="var(--teal-600)" style={{ marginTop: 1 }} />
            <span style={{ font: "12px/1.6 var(--font-sans)", color: "var(--teal-700)" }}>
              المتطلب يعمل بالكامل بدون تحليل. وعند الحاجة، يقترح «مساعد وثّق» معايير قبول وأسئلة ومؤشر جودة — اختياريًا بعد الحفظ.
            </span>
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
    type: null,
    confidence: null,
    criteria: 0,
    openQuestions: 0,
    module: "",
    stakeholders: [],
    notes: null,
    source: null,
    assignee: null,
    version: 1,
  };
}
