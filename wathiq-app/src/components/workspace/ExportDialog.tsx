"use client";

import React from "react";
import { Button, Icon } from "@/components/ds";
import { useWorkspaceData } from "./WorkspaceDataContext";
import { arReqCount } from "@/lib/arabic";
import {
  exportCSV,
  exportDocumentPDF,
  exportDocumentWord,
  buildReportBody,
  projectSlug,
  DEFAULT_SECTIONS,
  type ReportContext,
  type ReportOptions,
  type ReportSections,
} from "@/lib/export";
import { buildBRDBody, buildSRSBody } from "@/lib/documents";
import { DOC_TYPES, type DocType } from "@/lib/report-config";

export interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  /** Ids currently visible after search/filters — enables «النتائج الحالية فقط». */
  filteredIds?: string[] | null;
}

type Fmt = "pdf" | "word" | "csv";
type Scope = "all" | "filtered";

const SECTION_LABELS: Array<{ k: keyof ReportSections; l: string }> = [
  { k: "summary", l: "الملخص التنفيذي" },
  { k: "table", l: "جدول المتطلبات" },
  { k: "details", l: "تفاصيل المتطلبات" },
  { k: "criteria", l: "معايير القبول" },
  { k: "questions", l: "الأسئلة المفتوحة" },
  { k: "ambiguity", l: "نقاط الغموض" },
  { k: "assistant", l: "توصيات مساعد وثّق" },
];

const opt: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 11px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  background: "var(--surface-card)",
  cursor: "pointer",
  font: "var(--weight-medium) 13px var(--font-sans)",
  color: "var(--text-strong)",
};
const optActive: React.CSSProperties = {
  ...opt,
  borderColor: "var(--blue-400)",
  background: "var(--blue-50)",
  color: "var(--blue-700)",
};
const groupLabel: React.CSSProperties = {
  font: "var(--weight-semibold) 12px/1 var(--font-sans)",
  color: "var(--text-muted)",
  margin: "4px 0 8px",
};

export function ExportDialog({ open, onClose, filteredIds }: ExportDialogProps) {
  const { requirements, acceptanceCriteria, businessRules, openQuestions, activeProject, modules, user } =
    useWorkspaceData();

  const [docType, setDocType] = React.useState<DocType>("report");
  const [detailed, setDetailed] = React.useState(true);
  const [phase, setPhase] = React.useState<"idle" | "working" | "done">("idle");
  const [fmt, setFmt] = React.useState<Fmt>("pdf");
  const [scope, setScope] = React.useState<Scope>("all");
  const [sections, setSections] = React.useState<ReportSections>({ ...DEFAULT_SECTIONS });

  // «النتائج الحالية» تظهر فقط عندما تكون هناك فلترة فعلية تُنقص القائمة.
  const filterActive =
    filteredIds != null && filteredIds.length > 0 && filteredIds.length < requirements.length;

  React.useEffect(() => {
    if (!open) return;
    setScope(filterActive ? "filtered" : "all");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, filterActive]);

  if (!open) return null;

  const scopedReqs =
    scope === "filtered" && filteredIds
      ? requirements.filter((r) => filteredIds.includes(r.id))
      : requirements;
  const scopedIds = new Set(scopedReqs.map((r) => r.id));

  const run = () => {
    // البيانات مصدرها سياق مساحة العمل المُرشَّح في الخادم لمالكها —
    // لا يمكن أن تصل أي وثيقة لبيانات مستخدم أو مشروع آخر.
    setPhase("working");
    const ctx: ReportContext = {
      project: activeProject,
      userName: user?.name ?? null,
      requirements: scopedReqs,
      acceptanceCriteria: acceptanceCriteria.filter((c) => c.requirementId && scopedIds.has(c.requirementId)),
      businessRules: businessRules.filter((b) => b.requirementId && scopedIds.has(b.requirementId)),
      openQuestions: openQuestions.filter((q) => q.requirementId && scopedIds.has(q.requirementId)),
      modules,
    };
    const scopeLabel =
      scope === "filtered" ? `النتائج المفلترة (${scopedReqs.length} من ${requirements.length})` : null;

    // نُبنى الوثيقة حسب النوع — كلها تعمل بدون ذكاء اصطناعي.
    setTimeout(() => {
      if (fmt === "csv") {
        exportCSV(ctx);
      } else {
        const body =
          docType === "brd"
            ? buildBRDBody(ctx, { detailed, scopeLabel })
            : docType === "srs"
              ? buildSRSBody(ctx, { detailed, scopeLabel })
              : buildReportBody(ctx, { detailed, sections, scopeLabel } as ReportOptions);
        const title = DOC_TYPES[docType].title;
        if (fmt === "pdf") exportDocumentPDF(title, body);
        else exportDocumentWord(title, body, `${DOC_TYPES[docType].filePrefix}-${projectSlug(ctx)}.doc`);
      }
      setPhase("done");
      setTimeout(() => {
        setPhase("idle");
        onClose();
      }, 900);
    }, 150);
  };

  const toggleSection = (k: keyof ReportSections) =>
    setSections((s) => ({ ...s, [k]: !s[k] }));

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "var(--surface-overlay)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "48px 20px",
        zIndex: 50, overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520, background: "var(--surface-card)",
          borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xl)",
          border: "1px solid var(--border-default)", overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <span style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", background: "var(--blue-50)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 30px" }}>
            <Icon name="download" size={16} color="var(--blue-600)" />
          </span>
          <span style={{ font: "var(--weight-semibold) 16px var(--font-sans)", color: "var(--text-strong)" }}>
            تصدير التقرير
          </span>
          <button onClick={onClose} aria-label="إغلاق" style={{ marginInlineStart: "auto", border: "none", background: "transparent", cursor: "pointer", color: "var(--text-subtle)", display: "inline-flex" }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* نوع المستند */}
          <div>
            <div style={groupLabel}>نوع المستند</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(Object.keys(DOC_TYPES) as DocType[]).map((t) => {
                const on = docType === t;
                return (
                  <button
                    key={t}
                    onClick={() => setDocType(t)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10, textAlign: "start",
                      padding: "10px 12px", borderRadius: "var(--radius-md)",
                      border: `1px solid ${on ? "var(--blue-400)" : "var(--border-default)"}`,
                      background: on ? "var(--blue-50)" : "var(--surface-card)",
                      cursor: "pointer",
                    }}
                  >
                    <Icon name={t === "report" ? "gauge" : t === "brd" ? "briefcase" : "file-code"} size={17} color={on ? "var(--blue-600)" : "var(--text-subtle)"} style={{ marginTop: 2 }} />
                    <span>
                      <span style={{ display: "block", font: "var(--weight-semibold) 13.5px/1.4 var(--font-sans)", color: on ? "var(--blue-700)" : "var(--text-strong)" }}>
                        {DOC_TYPES[t].title}
                      </span>
                      <span style={{ display: "block", font: "11.5px/1.6 var(--font-sans)", color: "var(--text-muted)", marginTop: 2 }}>
                        {DOC_TYPES[t].desc}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* النطاق */}
          {filterActive && (
            <div>
              <div style={groupLabel}>نطاق التقرير</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={scope === "filtered" ? optActive : opt} onClick={() => setScope("filtered")}>
                  <Icon name="filter" size={14} /> النتائج الحالية فقط ({filteredIds!.length})
                </button>
                <button style={scope === "all" ? optActive : opt} onClick={() => setScope("all")}>
                  كل المتطلبات ({requirements.length})
                </button>
              </div>
            </div>
          )}

          {/* نوع التقرير */}
          <div>
            <div style={groupLabel}>نوع التقرير</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={detailed ? optActive : opt} onClick={() => setDetailed(true)}>
                <Icon name="file-text" size={14} /> تفصيلي
              </button>
              <button style={!detailed ? optActive : opt} onClick={() => setDetailed(false)}>
                <Icon name="file" size={14} /> مختصر
              </button>
            </div>
          </div>

          {/* الصيغة */}
          <div>
            <div style={groupLabel}>الصيغة</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={fmt === "pdf" ? optActive : opt} onClick={() => setFmt("pdf")}>PDF</button>
              <button style={fmt === "word" ? optActive : opt} onClick={() => setFmt("word")}>Word (قابل للتعديل)</button>
              {docType === "report" && (
                <button style={fmt === "csv" ? optActive : opt} onClick={() => setFmt("csv")}>Excel (CSV)</button>
              )}
            </div>
            {fmt === "pdf" && (
              <div style={{ font: "11.5px/1.6 var(--font-sans)", color: "var(--text-subtle)", marginTop: 6 }}>
                تُفتح نافذة الطباعة — اختر «حفظ كـ PDF».
              </div>
            )}
          </div>

          {/* المحتويات — خاصة بتقرير التحليل؛ BRD/SRS أقسامهما قياسية */}
          {fmt !== "csv" && docType === "report" && (
            <div>
              <div style={groupLabel}>محتويات التقرير</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {SECTION_LABELS.map(({ k, l }) => {
                  const sub = k !== "summary" && k !== "table" && k !== "details";
                  const disabled = (sub && !sections.details) || (!detailed && (k === "details" || sub));
                  const on = sections[k] && !disabled;
                  return (
                    <label
                      key={k}
                      style={{
                        display: "flex", alignItems: "center", gap: 7,
                        font: "13px var(--font-sans)",
                        color: disabled ? "var(--text-subtle)" : "var(--text-body)",
                        cursor: disabled ? "not-allowed" : "pointer",
                        paddingInlineStart: sub ? 14 : 0,
                      }}
                    >
                      <input type="checkbox" checked={on} disabled={disabled} onChange={() => toggleSection(k)} />
                      {l}
                    </label>
                  );
                })}
              </div>
              {!detailed && (
                <div style={{ font: "11.5px/1.6 var(--font-sans)", color: "var(--text-subtle)", marginTop: 6 }}>
                  التقرير المختصر يشمل الغلاف والملخص والجدول والتوصيات.
                </div>
              )}
            </div>
          )}

          <div style={{ font: "12px/1.6 var(--font-sans)", color: "var(--text-muted)", padding: "8px 12px", background: "var(--slate-50)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
            سيشمل المستند <b style={{ color: "var(--text-body)" }}>{arReqCount(scopedReqs.length)}</b> من مشروع «{activeProject?.name ?? "مساحة العمل"}».
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 20px", borderTop: "1px solid var(--border-subtle)", background: "var(--slate-25)" }}>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button
            variant="primary"
            onClick={run}
            disabled={scopedReqs.length === 0 || phase === "working"}
            iconStart={<Icon name={phase === "working" ? "loader-circle" : phase === "done" ? "check" : "download"} size={15} style={phase === "working" ? { animation: "wq-spin 0.7s linear infinite" } : undefined} />}
          >
            {phase === "working" ? "جاري تجهيز المستند..." : phase === "done" ? "تم تجهيز المستند بنجاح" : "إنشاء المستند"}
          </Button>
        </div>
      </div>
    </div>
  );
}
