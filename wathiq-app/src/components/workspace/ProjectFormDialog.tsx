"use client";

import React from "react";
import { Button, Icon } from "@/components/ds";
import { createProject, updateProject, type ProjectInput , trackClientEvent } from "@/app/actions";
import { whatsappUpgradeLink } from "@/lib/plans";
import { useWorkspaceData } from "./WorkspaceDataContext";
import type { Project } from "@/lib/data";

const STATUS_OPTIONS = [
  { v: "draft", l: "مسودة" },
  { v: "active", l: "نشط" },
  { v: "completed", l: "مكتمل" },
];

const COLORS = ["#2B57E0", "#0E7B75", "#16A35C", "#B36F05", "#6C4FE0", "#0C2566", "#D92D45"];

const ERR: Record<string, string> = {
  "missing-name": "أدخل اسم المشروع.",
  "no-db": "الإنشاء يتطلب قاعدة بيانات — يعمل على الموقع المنشور فقط.",
  server: "تعذّر الحفظ. حاول مرة أخرى.",
};

const label: React.CSSProperties = { font: "var(--weight-medium) 12px/1 var(--font-sans)", color: "var(--text-muted)", marginBottom: 6, display: "block" };
const box: React.CSSProperties = {
  width: "100%", padding: "9px 11px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)",
  background: "var(--surface-card)", font: "14px var(--font-sans)", color: "var(--text-strong)", outline: "none",
};

function blank(): ProjectInput {
  return { name: "", code: "", description: "", domain: "", client: "", status: "active", color: COLORS[0], icon: "" };
}

export interface ProjectFormDialogProps {
  open: boolean;
  mode: "create" | "edit";
  initial: Project | null;
  onClose: () => void;
  onSaved: () => void;
}

export function ProjectFormDialog({ open, mode, initial, onClose, onSaved }: ProjectFormDialogProps) {
  const { publicSettings } = useWorkspaceData();
  const [form, setForm] = React.useState<ProjectInput>(() => blank());
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [planBlocked, setPlanBlocked] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setPlanBlocked(false);
    if (mode === "edit" && initial) {
      setForm({
        name: initial.name, code: initial.code, description: initial.description ?? "",
        domain: initial.domain ?? "", client: initial.client ?? "", status: initial.status,
        color: initial.color ?? COLORS[0], icon: initial.icon ?? "",
      });
    } else {
      setForm(blank());
    }
  }, [open, mode, initial]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const set = <K extends keyof ProjectInput>(k: K, v: ProjectInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true);
    setError(null);
    const res = mode === "edit" && initial
      ? await updateProject(initial.id, form)
      : await createProject(form);
    setSaving(false);
    if (res.ok) {
      onSaved();
    } else if (res.error === "plan-limit") {
      setPlanBlocked(true);
    } else {
      setError(ERR[res.error] || ERR.server);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "var(--surface-overlay)", backdropFilter: "blur(2px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 20px", zIndex: 50, overflowY: "auto" }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "var(--surface-card)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xl)", border: "1px solid var(--border-default)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <span style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", background: "var(--blue-50)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 30px" }}>
            <Icon name={mode === "edit" ? "pencil" : "folder-plus"} size={16} color="var(--blue-600)" />
          </span>
          <span style={{ font: "var(--weight-semibold) 16px var(--font-sans)", color: "var(--text-strong)" }}>
            {mode === "edit" ? "تعديل المشروع" : "مشروع جديد"}
          </span>
          <button onClick={onClose} aria-label="إغلاق" style={{ marginInlineStart: "auto", border: "none", background: "transparent", cursor: "pointer", color: "var(--text-subtle)", display: "inline-flex" }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        {planBlocked ? (
          <div style={{ padding: 28, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
            <span style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "linear-gradient(150deg, var(--teal-50), var(--blue-50))", border: "1px solid var(--teal-100)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="folders" size={24} color="var(--teal-600)" />
            </span>
            <div style={{ font: "var(--weight-bold) 18px/1.4 var(--font-sans)", color: "var(--text-strong)" }}>
              خطتك الحالية تتيح مشروعًا واحدًا
            </div>
            <p style={{ font: "14px/1.7 var(--font-sans)", color: "var(--text-muted)", maxWidth: 400, margin: 0 }}>
              للعمل على أكثر من مشروع، يمكنك الترقية للحصول على مشاريع متعددة ومساحة أكبر للتحليلات.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 10 }}>
              <a href="/pricing" onClick={() => void trackClientEvent("upgrade_clicked", { from: "project_limit" })} style={{ display: "inline-flex", alignItems: "center", height: 44, padding: "0 20px", borderRadius: "var(--radius-pill)", background: "var(--primary)", color: "#fff", font: "var(--weight-bold) 15px var(--font-sans)", textDecoration: "none" }}>
                عرض الباقات
              </a>
              <a href={whatsappUpgradeLink("الخطة الاحترافية — مشاريع متعددة", { number: publicSettings.whatsappNumber, template: publicSettings.upgradeMessageText })} onClick={() => void trackClientEvent("upgrade_clicked", { from: "project_limit_whatsapp" })} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 44, padding: "0 20px", borderRadius: "var(--radius-pill)", background: "#25D366", color: "#06231A", font: "var(--weight-bold) 15px var(--font-sans)", textDecoration: "none" }}>
                <Icon name="message-circle" size={18} color="#06231A" /> التواصل للترقية
              </a>
            </div>
            <div style={{ font: "11.5px/1.6 var(--font-sans)", color: "var(--text-subtle)" }}>
              {publicSettings.activationTimeText}
            </div>
          </div>
        ) : (
          <>
            {/* Body */}
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={label}>اسم المشروع</label>
                <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="مثال: منصة المدفوعات المؤسسية" style={box} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={label}>كود المشروع</label>
                  <input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="PRJ-0001" dir="ltr" style={{ ...box, fontFamily: "var(--font-mono)" }} />
                </div>
                <div>
                  <label style={label}>الاختصار</label>
                  <input value={form.icon} onChange={(e) => set("icon", e.target.value.slice(0, 4))} placeholder="EPP" dir="ltr" maxLength={4} style={{ ...box, fontFamily: "var(--font-mono)" }} />
                </div>
              </div>

              <div>
                <label style={label}>وصف مختصر</label>
                <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="نبذة عن المشروع…" rows={2} style={{ ...box, resize: "vertical", lineHeight: 1.6 }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={label}>المجال / النوع</label>
                  <input value={form.domain} onChange={(e) => set("domain", e.target.value)} placeholder="مالي، حكومي، صحي…" style={box} />
                </div>
                <div>
                  <label style={label}>الجهة / العميل</label>
                  <input value={form.client} onChange={(e) => set("client", e.target.value)} placeholder="اسم الجهة" style={box} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 12 }}>
                <div>
                  <label style={label}>الحالة</label>
                  <select value={form.status} onChange={(e) => set("status", e.target.value)} style={box}>
                    {STATUS_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={label}>لون المشروع</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", height: 38 }}>
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => set("color", c)}
                        aria-label={`لون ${c}`}
                        style={{
                          width: 24, height: 24, borderRadius: "50%", background: c, cursor: "pointer",
                          border: form.color === c ? "2px solid var(--text-strong)" : "2px solid transparent",
                          boxShadow: "inset 0 0 0 1px rgba(0,0,0,.1)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--red-50)", border: "1px solid var(--red-100)", font: "13px var(--font-sans)", color: "var(--red-600)" }}>
                  <Icon name="alert-triangle" size={15} color="var(--red-500)" /> {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 20px", borderTop: "1px solid var(--border-subtle)", background: "var(--slate-25)" }}>
              <Button variant="secondary" onClick={onClose} disabled={saving}>إلغاء</Button>
              <Button variant="primary" onClick={submit} disabled={saving} iconStart={<Icon name={saving ? "loader-circle" : "check"} size={15} style={saving ? { animation: "wq-spin 0.7s linear infinite" } : undefined} />}>
                {saving ? "جارٍ الحفظ…" : mode === "edit" ? "حفظ التغييرات" : "إنشاء المشروع"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
