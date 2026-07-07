"use client";

/**
 * سياق المشروع + وحدات المشروع (v1.9.9) — قسمان اختياريان بالكامل داخل
 * «نظرة عامة»: لا يُجبَر المستخدم على تعبئة شيء، والمشاريع الصغيرة تبقى
 * بسيطة. كل عمليات الكتابة تمر بـ Server Actions تتحقق من الملكية.
 */

import React from "react";
import { useRouter } from "next/navigation";
import { Button, Icon } from "@/components/ds";
import { useWorkspaceData } from "./WorkspaceDataContext";
import {
  saveProjectContext,
  createProjectModule,
  updateProjectModule,
  deleteProjectModule,
  type ProjectContextInput,
} from "@/app/actions";
import type { ProjectModule } from "@/lib/data";
import { arReqCount } from "@/lib/arabic";

const GENERIC_ERR = "تعذّر الحفظ. حاول مرة أخرى.";

const CTX_FIELDS: Array<{ key: keyof ProjectContextInput; label: string; placeholder: string }> = [
  { key: "projectIdea", label: "فكرة المشروع", placeholder: "مثال: منصة لإدارة طلبات العملاء واستقبال البيانات عبر واتساب وأتمتة إرسال بيانات الدخول." },
  { key: "projectGoal", label: "هدف المشروع", placeholder: "مثال: تقليل العمل اليدوي، تسريع معالجة الطلبات، وتحسين متابعة حالة كل طلب." },
  { key: "targetUsers", label: "المستخدمون المستهدفون", placeholder: "مثال: موظف العمليات، مدير النظام، العميل النهائي، فريق الدعم." },
  { key: "projectScope", label: "نطاق المشروع", placeholder: "مثال: استقبال الطلبات، التحقق من البيانات، إرسال بيانات الدخول، متابعة حالة الطلب، وإصدار التقارير." },
  { key: "outOfScope", label: "خارج النطاق", placeholder: "مثال: الدفع الإلكتروني، تطبيق الجوال، التكامل مع أنظمة خارجية في المرحلة الحالية." },
  { key: "relatedSystems", label: "الأنظمة أو القنوات المرتبطة", placeholder: "مثال: واتساب، البريد الإلكتروني، نظام CRM، بوابة داخلية، نظام ERP." },
  { key: "constraints", label: "القيود أو الملاحظات", placeholder: "مثال: يجب حماية بيانات المستخدمين، الالتزام بسياسات الجهة، وعدم إرسال بيانات حساسة عبر قنوات غير معتمدة." },
];

const CTX_LABELS: Record<string, string> = Object.fromEntries(CTX_FIELDS.map((f) => [f.key, f.label]));

const cardStyle: React.CSSProperties = {
  background: "var(--surface-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-lg)",
  padding: "18px 20px",
  boxShadow: "var(--shadow-sm)",
};

const fieldLabel: React.CSSProperties = {
  font: "var(--weight-medium) 12px/1 var(--font-sans)",
  color: "var(--text-muted)",
  marginBottom: 6,
  display: "block",
};

const areaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 64,
  padding: "9px 11px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  background: "var(--surface-card)",
  font: "13.5px/1.7 var(--font-sans)",
  color: "var(--text-strong)",
  outline: "none",
  resize: "vertical",
};

const overlayStyle: React.CSSProperties = {
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
};

const dialogStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 560,
  background: "var(--surface-card)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-lg)",
  display: "flex",
  flexDirection: "column",
  maxHeight: "calc(100vh - 96px)",
};

const secTitle = (icon: string, title: string) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
    <Icon name={icon} size={16} color="var(--teal-600)" />
    <span style={{ font: "var(--weight-bold) 15px/1.4 var(--font-sans)", color: "var(--text-strong)" }}>{title}</span>
  </div>
);

/* ---------------- سياق المشروع ---------------- */

function ContextDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { activeProject } = useWorkspaceData();
  const [form, setForm] = React.useState<ProjectContextInput>({});
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open || !activeProject) return;
    setError(null);
    setForm({
      projectIdea: activeProject.projectIdea ?? "",
      projectGoal: activeProject.projectGoal ?? "",
      targetUsers: activeProject.targetUsers ?? "",
      projectScope: activeProject.projectScope ?? "",
      outOfScope: activeProject.outOfScope ?? "",
      relatedSystems: activeProject.relatedSystems ?? "",
      constraints: activeProject.constraints ?? "",
    });
  }, [open, activeProject]);

  if (!open || !activeProject) return null;

  const submit = async () => {
    setSaving(true);
    setError(null);
    const res = await saveProjectContext(activeProject.id, form);
    setSaving(false);
    if (res.ok) onSaved();
    else setError(GENERIC_ERR);
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <Icon name="compass" size={17} color="var(--teal-600)" />
          <span style={{ font: "var(--weight-bold) 15px/1 var(--font-sans)", color: "var(--text-strong)", flex: 1 }}>سياق المشروع</span>
          <button onClick={onClose} aria-label="إغلاق" style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-subtle)", display: "inline-flex" }}>
            <Icon name="x" size={17} />
          </button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
          <p style={{ margin: 0, font: "12.5px/1.7 var(--font-sans)", color: "var(--text-muted)" }}>
            كل الحقول اختيارية — عبّئ ما يناسبك الآن وأكمل الباقي لاحقًا. السياق يساعد مساعد وثّق والوثائق على فهم مشروعك بدقة أعلى.
          </p>
          {CTX_FIELDS.map((f) => (
            <div key={f.key}>
              <label style={fieldLabel}>{f.label}</label>
              <textarea
                value={(form[f.key] as string) ?? ""}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={areaStyle}
              />
            </div>
          ))}
          {error && <span style={{ font: "12px var(--font-sans)", color: "var(--status-danger-fg)" }}>{error}</span>}
        </div>
        <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderTop: "1px solid var(--border-subtle)" }}>
          <Button variant="primary" disabled={saving} iconStart={<Icon name={saving ? "loader-circle" : "check"} size={15} style={saving ? { animation: "wq-spin 0.7s linear infinite" } : undefined} />} onClick={submit}>
            {saving ? "جارٍ الحفظ…" : "حفظ السياق"}
          </Button>
          <Button variant="ghost" disabled={saving} onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- وحدة: نافذة إضافة/تعديل ---------------- */

function ModuleDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: ProjectModule | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { activeProject } = useWorkspaceData();
  const [name, setName] = React.useState("");
  const [desc, setDesc] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setName(initial?.name ?? "");
    setDesc(initial?.description ?? "");
  }, [open, initial]);

  if (!open || !activeProject) return null;

  const submit = async () => {
    if (!name.trim()) {
      setError("أدخل اسم الوحدة.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = initial
      ? await updateProjectModule(initial.id, name, desc)
      : await createProjectModule(activeProject.id, name, desc);
    setSaving(false);
    if (res.ok) onSaved();
    else setError(GENERIC_ERR);
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...dialogStyle, maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <Icon name="boxes" size={17} color="var(--teal-600)" />
          <span style={{ font: "var(--weight-bold) 15px/1 var(--font-sans)", color: "var(--text-strong)", flex: 1 }}>
            {initial ? "تعديل الوحدة" : "إضافة وحدة"}
          </span>
          <button onClick={onClose} aria-label="إغلاق" style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-subtle)", display: "inline-flex" }}>
            <Icon name="x" size={17} />
          </button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={fieldLabel}>اسم الوحدة</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: إدارة المستخدمين، الشات، المهام، التقارير، الصلاحيات"
              style={{ ...areaStyle, minHeight: 0, height: 42, resize: "none" } as React.CSSProperties}
            />
          </div>
          <div>
            <label style={fieldLabel}>وصف الوحدة (اختياري)</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="مثال: تختص هذه الوحدة بإنشاء المستخدمين، إدارة الحسابات، تفعيل الحسابات، وتعطيلها."
              style={areaStyle}
            />
          </div>
          {error && <span style={{ font: "12px var(--font-sans)", color: "var(--status-danger-fg)" }}>{error}</span>}
        </div>
        <div style={{ display: "flex", gap: 10, padding: "14px 20px", borderTop: "1px solid var(--border-subtle)" }}>
          <Button variant="primary" disabled={saving} iconStart={<Icon name={saving ? "loader-circle" : "check"} size={15} style={saving ? { animation: "wq-spin 0.7s linear infinite" } : undefined} />} onClick={submit}>
            {saving ? "جارٍ الحفظ…" : initial ? "حفظ التعديلات" : "إضافة الوحدة"}
          </Button>
          <Button variant="ghost" disabled={saving} onClick={onClose}>إلغاء</Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- القسم الرئيسي ---------------- */

export function ProjectContextSection() {
  const router = useRouter();
  const { activeProject, modules, requirements, source } = useWorkspaceData();
  const connected = source === "database";

  const [ctxOpen, setCtxOpen] = React.useState(false);
  const [modOpen, setModOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ProjectModule | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  if (!activeProject || !connected) return null;

  const ctxEntries = CTX_FIELDS
    .map((f) => [f.key, (activeProject[f.key as keyof typeof activeProject] as string | null) ?? ""] as const)
    .filter(([, v]) => v.trim());
  const hasContext = ctxEntries.length > 0;

  const countFor = (moduleId: string) => requirements.filter((r) => r.moduleId === moduleId).length;

  const removeModule = async (m: ProjectModule) => {
    setNotice(null);
    if (countFor(m.id) > 0) {
      setNotice("لا يمكن حذف هذه الوحدة لأنها مرتبطة بمتطلبات. انقل المتطلبات أولًا أو غيّر وحدتها.");
      return;
    }
    setBusyId(m.id);
    const res = await deleteProjectModule(m.id);
    setBusyId(null);
    if (res.ok) router.refresh();
    else setNotice(res.error === "module-linked" ? "لا يمكن حذف هذه الوحدة لأنها مرتبطة بمتطلبات. انقل المتطلبات أولًا أو غيّر وحدتها." : GENERIC_ERR);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
      {/* ---- سياق المشروع ---- */}
      <div style={cardStyle}>
        {secTitle("compass", "سياق المشروع")}
        <p style={{ margin: "0 0 12px", font: "12.5px/1.7 var(--font-sans)", color: "var(--text-muted)" }}>
          إضافة سياق المشروع تساعد مساعد وثّق على فهم المتطلبات وتحليلها بدقة أعلى. يمكنك تعبئته الآن أو لاحقًا — اختياري بالكامل.
        </p>
        {hasContext ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {ctxEntries.slice(0, 4).map(([k, v]) => (
                <div key={k} style={{ font: "12.5px/1.6 var(--font-sans)", color: "var(--text-body)" }}>
                  <span style={{ color: "var(--text-subtle)", fontWeight: 600 }}>{CTX_LABELS[k]}: </span>
                  {v.length > 120 ? v.slice(0, 120) + "…" : v}
                </div>
              ))}
              {ctxEntries.length > 4 && (
                <span style={{ font: "11.5px var(--font-sans)", color: "var(--text-subtle)" }}>
                  +{ctxEntries.length - 4} حقول أخرى معبأة
                </span>
              )}
            </div>
            <Button variant="secondary" size="sm" iconStart={<Icon name="pencil" size={14} />} onClick={() => setCtxOpen(true)}>
              تعديل سياق المشروع
            </Button>
          </>
        ) : (
          <>
            <div style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--slate-50)", border: "1px dashed var(--border-strong)", marginBottom: 12 }}>
              <div style={{ font: "var(--weight-medium) 12.5px/1.6 var(--font-sans)", color: "var(--text-body)" }}>لم يتم إضافة سياق للمشروع بعد.</div>
              <div style={{ font: "12px/1.7 var(--font-sans)", color: "var(--text-muted)", marginTop: 3 }}>
                يمكنك إضافة فكرة المشروع وأهدافه والمستخدمين المستهدفين لتحسين دقة التحليل.
              </div>
            </div>
            <Button variant="secondary" size="sm" iconStart={<Icon name="plus" size={14} />} onClick={() => setCtxOpen(true)}>
              إضافة سياق المشروع
            </Button>
          </>
        )}
      </div>

      {/* ---- وحدات المشروع ---- */}
      <div style={cardStyle}>
        {secTitle("boxes", "وحدات المشروع")}
        <p style={{ margin: "0 0 12px", font: "12.5px/1.7 var(--font-sans)", color: "var(--text-muted)" }}>
          قسّم المشروع الكبير إلى وحدات لتنظيم المتطلبات — اختياري، والمتطلبات تعمل طبيعيًا بدون وحدات.
        </p>
        {modules.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {modules.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "9px 11px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", background: "var(--slate-50)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    <span style={{ font: "var(--weight-semibold) 13px var(--font-sans)", color: "var(--text-strong)" }}>{m.name}</span>
                    <span style={{ font: "10.5px/1 var(--font-sans)", color: "var(--teal-700)", background: "var(--teal-50)", border: "1px solid var(--teal-100)", padding: "3px 8px", borderRadius: "var(--radius-pill)" }}>
                      {arReqCount(countFor(m.id))}
                    </span>
                  </div>
                  {m.description && (
                    <div style={{ font: "11.5px/1.6 var(--font-sans)", color: "var(--text-muted)", marginTop: 3 }}>{m.description}</div>
                  )}
                </div>
                <button onClick={() => { setEditing(m); setModOpen(true); }} aria-label={`تعديل ${m.name}`} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-subtle)", display: "inline-flex", padding: 3 }}>
                  <Icon name="pencil" size={14} />
                </button>
                <button onClick={() => removeModule(m)} aria-label={`حذف ${m.name}`} disabled={busyId === m.id} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--red-500)", display: "inline-flex", padding: 3 }}>
                  <Icon name={busyId === m.id ? "loader-circle" : "trash-2"} size={14} style={busyId === m.id ? { animation: "wq-spin 0.7s linear infinite" } : undefined} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--slate-50)", border: "1px dashed var(--border-strong)", marginBottom: 12 }}>
            <div style={{ font: "var(--weight-medium) 12.5px/1.6 var(--font-sans)", color: "var(--text-body)" }}>لم يتم إضافة وحدات للمشروع بعد.</div>
            <div style={{ font: "12px/1.7 var(--font-sans)", color: "var(--text-muted)", marginTop: 3 }}>
              يمكنك تقسيم المشروع إلى وحدات مثل: إدارة المستخدمين، الشات، المهام، التقارير.
            </div>
          </div>
        )}
        {notice && (
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 11px", borderRadius: "var(--radius-md)", background: "var(--amber-50)", border: "1px solid var(--amber-100)", font: "12px/1.6 var(--font-sans)", color: "var(--amber-700, #92600a)", marginBottom: 10 }}>
            <Icon name="alert-triangle" size={14} />
            {notice}
          </div>
        )}
        <Button variant="secondary" size="sm" iconStart={<Icon name="plus" size={14} />} onClick={() => { setEditing(null); setModOpen(true); }}>
          إضافة وحدة
        </Button>
      </div>

      <ContextDialog open={ctxOpen} onClose={() => setCtxOpen(false)} onSaved={() => { setCtxOpen(false); router.refresh(); }} />
      <ModuleDialog open={modOpen} initial={editing} onClose={() => setModOpen(false)} onSaved={() => { setModOpen(false); router.refresh(); }} />
    </div>
  );
}
