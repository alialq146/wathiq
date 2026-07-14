"use client";

import React from "react";
import { Button, Icon } from "@/components/ds";
import { useWorkspaceData } from "./WorkspaceDataContext";
import { checkDocumentExportAction, logDocumentExportAction } from "@/app/actions";
import type { ExportCheck } from "@/lib/readiness";
import { arReqCount } from "@/lib/arabic";
import { trackClientEvent } from "@/app/actions";
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
  /** v2.3: نوع مستند مبدئي (يُستخدم عند الفتح من شاشة الجاهزية). */
  initialDocType?: DocType;
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

export function ExportDialog({ open, onClose, filteredIds, initialDocType }: ExportDialogProps) {
  const { requirements, acceptanceCriteria, businessRules, openQuestions, activeProject, modules, user, docSettings, featureFlags } =
    useWorkspaceData();

  const exportDisabled = !featureFlags.documentExportEnabled;
  // v2.3: قابلية تطبيق الوثائق — غير المطلوبة تُخفى من الخيارات (والخادم يرفضها أيضًا).
  const brdApp = activeProject?.brdApplicability ?? "REQUIRED";
  const srsApp = activeProject?.srsApplicability ?? "REQUIRED";
  const docVisible = (t: DocType) =>
    t === "report" ? true : t === "brd" ? brdApp !== "NOT_APPLICABLE" : srsApp !== "NOT_APPLICABLE";
  const [gate, setGate] = React.useState<
    | { phase: "idle" }
    | { phase: "checking" }
    | { phase: "warn"; check: ExportCheck }
    | { phase: "blocked"; check: ExportCheck }
  >({ phase: "idle" });
  const [docType, setDocType] = React.useState<DocType>(initialDocType ?? "report");
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
    if (initialDocType) setDocType(initialDocType);
    setGate({ phase: "idle" });
    setScope(filterActive ? "filtered" : "all");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, filterActive]);

  if (!open) return null;

  // v2.2: خاصية التصدير موقوفة من إعدادات النظام — رسالة واضحة بدل النموذج.
  // (التصدير يُبنى بالكامل في المتصفح من بيانات مملوكة للمستخدم — لا API له،
  // لذا البوابة هنا وفي payload الخادم الذي يمرر العلم.)
  if (exportDisabled) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "var(--surface-overlay)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 60 }} onClick={onClose}>
        <div role="dialog" aria-label="التصدير غير متاح" style={{ maxWidth: 420, background: "var(--surface-card)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-lg)", padding: "30px 26px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>📄</div>
          <div style={{ font: "var(--weight-bold) 15px/1.5 var(--font-sans)", color: "var(--text-strong)", marginBottom: 6 }}>تصدير الوثائق غير متاح حاليًا</div>
          <p style={{ font: "13px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: "0 0 16px" }}>أوقف مسؤول المنصة هذه الخاصية مؤقتًا — بياناتك محفوظة ولن تتأثر.</p>
          <button onClick={onClose} style={{ height: 38, padding: "0 18px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-strong)", font: "var(--weight-medium) 13px var(--font-sans)", cursor: "pointer" }}>إغلاق</button>
        </div>
      </div>
    );
  }

  const scopedReqs =
    scope === "filtered" && filteredIds
      ? requirements.filter((r) => filteredIds.includes(r.id))
      : requirements;
  const scopedIds = new Set(scopedReqs.map((r) => r.id));

  const run = () => {
    // v2.3: BRD/SRS تمر بفحص جاهزية خادمي (قابلية التطبيق + السياسة) قبل البناء —
    // «التصدير رغم ذلك» لا يعيد التحذير في العملية نفسها.
    if ((docType === "brd" || docType === "srs") && activeProject && gate.phase === "idle") {
      setGate({ phase: "checking" });
      void (async () => {
        try {
          const res = await checkDocumentExportAction(activeProject.id, docType === "brd" ? "BRD" : "SRS");
          if (!res.ok || !res.check) { setGate({ phase: "idle" }); doExport(null, false); return; }
          const c = res.check;
          if (!c.ok) { setGate({ phase: "blocked", check: c }); return; }
          if (c.mode === "warn") { setGate({ phase: "warn", check: c }); return; }
          setGate({ phase: "idle" });
          doExport(c, false);
        } catch { setGate({ phase: "idle" }); doExport(null, false); }
      })();
      return;
    }
    doExport(null, false);
  };

  const doExport = (check: ExportCheck | null, withWarnings: boolean) => {
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
            ? buildBRDBody(ctx, { detailed, scopeLabel, docSettings })
            : docType === "srs"
              ? buildSRSBody(ctx, { detailed, scopeLabel, docSettings })
              : buildReportBody(ctx, { detailed, sections, scopeLabel } as ReportOptions);
        const title = DOC_TYPES[docType].title;
        if (fmt === "pdf") exportDocumentPDF(title, body);
        else exportDocumentWord(title, body, `${DOC_TYPES[docType].filePrefix}-${projectSlug(ctx)}.doc`);
      }
      // حدث منتج (v1.9.11): يُسجَّل في الخادم بقائمة بيضاء — فشله لا يؤثر على التصدير.
      const evt = docType === "brd" ? "export_brd_created" : docType === "srs" ? "export_srs_created" : "export_report_created";
      void trackClientEvent(evt, { format: fmt, detailed, count: scopedReqs.length });
      if ((docType === "brd" || docType === "srs") && activeProject) {
        void logDocumentExportAction(activeProject.id, docType === "brd" ? "BRD" : "SRS", {
          withWarnings,
          score: check?.score ?? null,
          criticalCount: check?.criticalCount ?? 0,
        });
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
              {(Object.keys(DOC_TYPES) as DocType[]).filter(docVisible).map((t) => {
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
                        {((t === "brd" && brdApp === "OPTIONAL") || (t === "srs" && srsApp === "OPTIONAL")) && (
                          <span style={{ marginInlineStart: 7, padding: "2px 8px", borderRadius: 999, background: "var(--slate-100)", color: "var(--text-muted)", font: "var(--weight-semibold) 10px var(--font-sans)", verticalAlign: "middle" }}>اختيارية</span>
                        )}
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
            <span style={{ display: "block", marginTop: 4, color: "var(--text-subtle)" }}>
              يمكنك تصدير BRD أو SRS بعد إضافة المتطلبات، حتى لو لم تستخدم المساعد.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 20px", borderTop: "1px solid var(--border-subtle)", background: "var(--slate-25)" }}>
          <Button variant="secondary" onClick={onClose}>إلغاء</Button>
          {gate.phase === "warn" && (
            <div role="alertdialog" aria-label="تحذير الجاهزية" style={{ border: "1px solid var(--amber-100)", background: "var(--amber-50)", borderRadius: "var(--radius-lg)", padding: "14px 16px" }}>
              <div style={{ font: "var(--weight-bold) 13.5px/1.5 var(--font-sans)", color: "var(--text-strong)" }}>
                جاهزية الوثيقة الحالية: {gate.check.score ?? "—"}%
              </div>
              <p style={{ font: "12.5px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: "6px 0 0" }}>
                {gate.check.criticalCount > 0
                  ? `توجد ${gate.check.criticalCount} نواقص جوهرية قد تجعل الوثيقة غير مكتملة.`
                  : "يمكنك التصدير، لكن يُنصح بمراجعة الملاحظات أولًا."}
              </p>
              {gate.check.topIssues.length > 0 && (
                <ul style={{ margin: "8px 0 0", paddingInlineStart: 18, font: "12px/1.7 var(--font-sans)", color: "var(--text-muted)" }}>
                  {gate.check.topIssues.map((i, idx) => <li key={idx}>{i.title}</li>)}
                </ul>
              )}
              {gate.check.applicability === "OPTIONAL" && (
                <p style={{ font: "11.5px/1.6 var(--font-sans)", color: "var(--text-subtle)", margin: "8px 0 0" }}>هذه الوثيقة اختيارية ولا تؤثر على جاهزية المشروع العامة.</p>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <button onClick={() => { const c = gate.check; setGate({ phase: "idle" }); doExport(c, true); }} style={{ height: 34, padding: "0 14px", borderRadius: "var(--radius-pill)", border: "none", background: "var(--primary)", color: "#fff", font: "var(--weight-semibold) 12.5px var(--font-sans)", cursor: "pointer" }}>التصدير رغم ذلك</button>
                <button onClick={() => { setGate({ phase: "idle" }); onClose(); }} style={{ height: 34, padding: "0 14px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-strong)", font: "var(--weight-medium) 12.5px var(--font-sans)", cursor: "pointer" }}>مراجعة النواقص</button>
                <button onClick={() => setGate({ phase: "idle" })} style={{ height: 34, padding: "0 12px", borderRadius: "var(--radius-pill)", border: "none", background: "transparent", color: "var(--text-subtle)", font: "12.5px var(--font-sans)", cursor: "pointer" }}>إلغاء</button>
              </div>
            </div>
          )}
          {gate.phase === "blocked" && (
            <div role="alertdialog" aria-label="التصدير غير متاح" style={{ border: "1px solid var(--red-100)", background: "var(--red-50)", borderRadius: "var(--radius-lg)", padding: "14px 16px" }}>
              <div style={{ font: "var(--weight-bold) 13.5px/1.5 var(--font-sans)", color: "var(--red-600)" }}>
                {gate.check.reason === "not-applicable"
                  ? "هذه الوثيقة غير مفعلة لهذا المشروع."
                  : "لا يمكن إصدار الوثيقة لوجود نواقص حرجة."}
              </div>
              <p style={{ font: "12.5px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: "6px 0 0" }}>
                {gate.check.reason === "not-applicable"
                  ? "يمكنك تفعيلها من إعدادات الوثائق والمخرجات عند الحاجة."
                  : `توجد ${gate.check.criticalCount} نواقص حرجة يجب معالجتها قبل الإصدار (سياسة المنصة).`}
              </p>
              {gate.check.topIssues.length > 0 && (
                <ul style={{ margin: "8px 0 0", paddingInlineStart: 18, font: "12px/1.7 var(--font-sans)", color: "var(--text-muted)" }}>
                  {gate.check.topIssues.map((i, idx) => <li key={idx}>{i.title}</li>)}
                </ul>
              )}
              <button onClick={() => setGate({ phase: "idle" })} style={{ marginTop: 12, height: 34, padding: "0 14px", borderRadius: "var(--radius-pill)", border: "1px solid var(--border-default)", background: "var(--surface-card)", color: "var(--text-strong)", font: "var(--weight-medium) 12.5px var(--font-sans)", cursor: "pointer" }}>حسنًا</button>
            </div>
          )}


          <Button
            variant="primary"
            onClick={run}
            disabled={scopedReqs.length === 0 || phase === "working" || gate.phase === "checking" || gate.phase === "warn" || gate.phase === "blocked"}
            iconStart={<Icon name={phase === "working" ? "loader-circle" : phase === "done" ? "check" : "download"} size={15} style={phase === "working" ? { animation: "wq-spin 0.7s linear infinite" } : undefined} />}
          >
            {phase === "working" ? "جاري تجهيز المستند..." : phase === "done" ? "تم تجهيز المستند بنجاح" : "إنشاء المستند"}
          </Button>
        </div>
      </div>
    </div>
  );
}
