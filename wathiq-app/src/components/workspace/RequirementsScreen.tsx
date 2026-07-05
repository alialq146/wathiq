"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button, Icon, RequirementCard } from "@/components/ds";
import { type Requirement } from "@/lib/data";
import { useWorkspaceData } from "./WorkspaceDataContext";
import { RequirementFormDialog } from "./RequirementFormDialog";
import { ExportDialog } from "./ExportDialog";
import { deleteRequirement } from "@/app/actions";

export interface RequirementsScreenProps {
  onOpen?: (req: Requirement | null) => void;
  onViewAnalysis?: () => void;
  search?: string;
  onClearSearch?: () => void;
}

const PRIORITIES = [
  { v: "critical", l: "حرجة" },
  { v: "high", l: "عالية" },
  { v: "medium", l: "متوسطة" },
  { v: "low", l: "منخفضة" },
] as const;

const P_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

const selStyle: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: "var(--radius-md)",
  border: "1px solid var(--border-default)",
  background: "var(--surface-card)",
  font: "12.5px var(--font-sans)",
  color: "var(--text-strong)",
  outline: "none",
};

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px",
        borderRadius: "var(--radius-pill)", background: "var(--blue-50)",
        border: "1px solid var(--blue-100)", color: "var(--blue-700)",
        font: "var(--weight-medium) 12px/1 var(--font-sans)",
      }}
    >
      {label}
      <button onClick={onClear} aria-label="إزالة الفلتر" style={{ border: "none", background: "transparent", cursor: "pointer", display: "inline-flex", padding: 0, color: "var(--blue-600)" }}>
        <Icon name="x" size={12} strokeWidth={3} />
      </button>
    </span>
  );
}

type SortBy = "default" | "priority" | "confidence" | "id";
const SORTS: { v: SortBy; l: string }[] = [
  { v: "default", l: "الافتراضي" },
  { v: "priority", l: "الأولوية (الأعلى أولاً)" },
  { v: "confidence", l: "الثقة (الأعلى أولاً)" },
  { v: "id", l: "المعرّف (أبجدي)" },
];

/* Requirements list screen — search, filter, sort, AI banner, requirement grid,
   plus add / edit / delete backed by the database. */
export function RequirementsScreen({ onOpen, onViewAnalysis, search = "", onClearSearch }: RequirementsScreenProps) {
  const router = useRouter();
  const { requirements: REQUIREMENTS, acceptanceCriteria } = useWorkspaceData();
  // Data-driven header/banner facts (no hardcoded demo copy).
  const analyzedList = REQUIREMENTS.filter((r) => r.confidence != null || r.analysis != null);
  const analyzedCount = analyzedList.length;
  const avgConfidence = analyzedList.length
    ? Math.round(
        analyzedList.reduce((a, r) => a + (r.confidence ?? 0), 0) / analyzedList.length
      )
    : null;
  const needsInfoCount = REQUIREMENTS.filter((r) => r.status === "needs_info").length;
  const [filter, setFilter] = React.useState<string>("all");
  const [priorities, setPriorities] = React.useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = React.useState<SortBy>("default");
  // فلاتر متقدمة — كلها client-side لأن القائمة مشروعية الصغر ومُرشَّحة سلفًا في الخادم.
  const [typeF, setTypeF] = React.useState("");
  const [sourceF, setSourceF] = React.useState("");
  const [assigneeF, setAssigneeF] = React.useState("");
  const [analyzedF, setAnalyzedF] = React.useState<"any" | "yes" | "no">("any");
  const [criteriaF, setCriteriaF] = React.useState<"any" | "yes" | "no">("any");
  const [showFilter, setShowFilter] = React.useState(false);
  const [showSort, setShowSort] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [exportOpen, setExportOpen] = React.useState(false);
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("create");
  const [editing, setEditing] = React.useState<Requirement | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  // قيم القوائم مشتقة من بيانات المشروع نفسها (لا قوائم ثابتة قد لا تطابق).
  const typeOptions = [...new Set(REQUIREMENTS.map((r) => r.type).filter(Boolean))] as string[];
  const sourceOptions = [...new Set(REQUIREMENTS.map((r) => r.source).filter(Boolean))] as string[];
  const assigneeOptions = [...new Set(REQUIREMENTS.map((r) => r.assignee).filter(Boolean))] as string[];

  const filters = [
    { id: "all", label: "الكل", n: REQUIREMENTS.length },
    { id: "needs_info", label: "بحاجة لمعلومات", n: REQUIREMENTS.filter((r) => r.status === "needs_info").length },
    { id: "review", label: "قيد المراجعة", n: REQUIREMENTS.filter((r) => r.status === "review").length },
    { id: "approved", label: "معتمد", n: REQUIREMENTS.filter((r) => r.status === "approved").length },
    { id: "blocked", label: "محظور", n: REQUIREMENTS.filter((r) => r.status === "blocked").length },
  ];

  // ---- combined pipeline: status → search → priority → sort ----
  const q = search.trim().toLowerCase();
  let list = filter === "all" ? REQUIREMENTS : REQUIREMENTS.filter((r) => r.status === filter);
  if (q) {
    list = list.filter((r) =>
      [r.id, r.title, r.description, r.module].some((f) => f.toLowerCase().includes(q))
    );
  }
  if (priorities.size > 0) {
    list = list.filter((r) => priorities.has(r.priority));
  }
  if (typeF) list = list.filter((r) => r.type === typeF);
  if (sourceF) list = list.filter((r) => r.source === sourceF);
  if (assigneeF) list = list.filter((r) => r.assignee === assigneeF);
  if (analyzedF !== "any") {
    const done = (r: Requirement) => r.confidence != null || r.analysis != null;
    list = list.filter((r) => (analyzedF === "yes" ? done(r) : !done(r)));
  }
  if (criteriaF !== "any") {
    const withCrit = new Set(acceptanceCriteria.map((c) => c.requirementId));
    list = list.filter((r) => (criteriaF === "yes" ? withCrit.has(r.id) : !withCrit.has(r.id)));
  }
  if (sortBy !== "default") {
    list = [...list].sort((a, b) => {
      if (sortBy === "priority") return P_ORDER[a.priority] - P_ORDER[b.priority];
      if (sortBy === "confidence") return (b.confidence ?? -1) - (a.confidence ?? -1);
      return a.id.localeCompare(b.id);
    });
  }

  const advActive = Boolean(typeF || sourceF || assigneeF) || analyzedF !== "any" || criteriaF !== "any";
  const filterActive = priorities.size > 0 || advActive;
  const sortActive = sortBy !== "default";
  const anyRefinement = filterActive || sortActive || q.length > 0;

  const togglePriority = (p: string) =>
    setPriorities((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });

  const clearAll = () => {
    setFilter("all");
    setPriorities(new Set());
    setSortBy("default");
    setTypeF(""); setSourceF(""); setAssigneeF("");
    setAnalyzedF("any"); setCriteriaF("any");
    onClearSearch && onClearSearch();
  };

  const openCreate = () => {
    setEditing(null);
    setDialogMode("create");
    setDialogOpen(true);
  };
  const openEdit = (r: Requirement) => {
    setEditing(r);
    setDialogMode("edit");
    setDialogOpen(true);
  };
  const onSaved = () => {
    setDialogOpen(false);
    router.refresh();
  };
  const onDelete = async (r: Requirement) => {
    if (!window.confirm(`حذف المتطلب ${r.id}؟ لا يمكن التراجع.`)) return;
    setBusyId(r.id);
    const res = await deleteRequirement(r.id);
    setBusyId(null);
    if (res.ok) router.refresh();
    else
      window.alert(
        res.error === "no-db"
          ? "الحذف يتطلب قاعدة بيانات — يعمل على الموقع المنشور فقط."
          : "تعذّر الحذف. حاول مرة أخرى."
      );
  };

  const toolbarBtn = (active: boolean): React.CSSProperties =>
    active
      ? { borderColor: "var(--navy-800)", color: "var(--navy-800)", background: "var(--slate-50)" }
      : {};

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1180, margin: "0 auto" }}>
      <style>{`
        .wq-req-cell .wq-req-actions { opacity: 0; transition: opacity var(--dur-fast) var(--ease-out); }
        .wq-req-cell:hover .wq-req-actions { opacity: 1; }
      `}</style>

      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
        <div>
          <h1 style={{ font: "var(--weight-semibold) var(--text-h1)/1.2 var(--font-sans)", color: "var(--text-strong)", margin: 0 }}>
            المتطلبات
          </h1>
          <p style={{ font: "14px/1.5 var(--font-sans)", color: "var(--text-muted)", margin: "6px 0 0" }}>
            {REQUIREMENTS.length === 0
              ? "ستظهر هنا متطلبات مشروعك بعد إضافتها."
              : `${REQUIREMENTS.length} متطلبًا في المشروع${analyzedCount > 0 ? ` · ${analyzedCount} تم تحليله` : ""}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="secondary"
            size="sm"
            iconStart={<Icon name="filter" size={15} />}
            style={toolbarBtn(filterActive || showFilter)}
            onClick={() => {
              setShowFilter((v) => !v);
              setShowSort(false);
            }}
          >
            تصفية{filterActive ? ` (${priorities.size})` : ""}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            iconStart={<Icon name="arrow-up-down" size={15} />}
            style={toolbarBtn(sortActive || showSort)}
            onClick={() => {
              setShowSort((v) => !v);
              setShowFilter(false);
            }}
          >
            ترتيب
          </Button>
          <Button
            variant="secondary"
            size="sm"
            iconStart={<Icon name="download" size={15} />}
            disabled={REQUIREMENTS.length === 0}
            title={REQUIREMENTS.length === 0 ? "لا توجد متطلبات للتصدير" : "تصدير المتطلبات"}
            onClick={() => setExportOpen(true)}
          >
            تصدير
          </Button>
          <Button variant="primary" size="sm" iconStart={<Icon name="plus" size={15} />} onClick={openCreate}>
            متطلب جديد
          </Button>
        </div>
      </div>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} filteredIds={anyRefinement ? list.map((r) => r.id) : null} />

      {/* Filter panel */}
      {showFilter && (
        <div
          style={{
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-lg)",
            background: "var(--surface-card)",
            padding: "14px 16px",
            marginBottom: 16,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ font: "var(--weight-semibold) 13px var(--font-sans)", color: "var(--text-strong)" }}>الأولوية</span>
            {filterActive && (
              <button
                onClick={() => setPriorities(new Set())}
                style={{ marginInlineStart: "auto", border: "none", background: "transparent", cursor: "pointer", color: "var(--text-link)", font: "12px var(--font-sans)" }}
              >
                مسح
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {PRIORITIES.map((p) => {
              const on = priorities.has(p.v);
              return (
                <button
                  key={p.v}
                  onClick={() => togglePriority(p.v)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: "var(--radius-pill)",
                    border: `1px solid ${on ? "var(--blue-600)" : "var(--border-default)"}`,
                    background: on ? "var(--blue-50)" : "var(--surface-card)",
                    color: on ? "var(--blue-700)" : "var(--text-body)",
                    font: "var(--weight-medium) 13px/1 var(--font-sans)",
                    cursor: "pointer",
                  }}
                >
                  {on && <Icon name="check" size={13} color="var(--blue-600)" strokeWidth={3} />}
                  {p.l}
                </button>
              );
            })}
          </div>

          {/* فلاتر متقدمة */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
            {typeOptions.length > 0 && (
              <select value={typeF} onChange={(e) => setTypeF(e.target.value)} style={selStyle}>
                <option value="">النوع: الكل</option>
                {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            {sourceOptions.length > 0 && (
              <select value={sourceF} onChange={(e) => setSourceF(e.target.value)} style={selStyle}>
                <option value="">المصدر: الكل</option>
                {sourceOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            {assigneeOptions.length > 0 && (
              <select value={assigneeF} onChange={(e) => setAssigneeF(e.target.value)} style={selStyle}>
                <option value="">المسؤول: الكل</option>
                {assigneeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <select value={analyzedF} onChange={(e) => setAnalyzedF(e.target.value as "any" | "yes" | "no")} style={selStyle}>
              <option value="any">مساعد وثّق: الكل</option>
              <option value="yes">تم تحليلها</option>
              <option value="no">لم تُحلَّل بعد</option>
            </select>
            <select value={criteriaF} onChange={(e) => setCriteriaF(e.target.value as "any" | "yes" | "no")} style={selStyle}>
              <option value="any">معايير القبول: الكل</option>
              <option value="yes">لديها معايير</option>
              <option value="no">بلا معايير</option>
            </select>
          </div>
        </div>
      )}

      {/* شريط الفلاتر النشطة — chips قابلة للإزالة */}
      {(filterActive || filter !== "all") && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {filter !== "all" && (
            <FilterChip label={`الحالة: ${filters.find((f) => f.id === filter)?.label ?? filter}`} onClear={() => setFilter("all")} />
          )}
          {[...priorities].map((pv) => (
            <FilterChip key={pv} label={`الأولوية: ${PRIORITIES.find((x) => x.v === pv)?.l ?? pv}`} onClear={() => togglePriority(pv)} />
          ))}
          {typeF && <FilterChip label={`النوع: ${typeF}`} onClear={() => setTypeF("")} />}
          {sourceF && <FilterChip label={`المصدر: ${sourceF}`} onClear={() => setSourceF("")} />}
          {assigneeF && <FilterChip label={`المسؤول: ${assigneeF}`} onClear={() => setAssigneeF("")} />}
          {analyzedF !== "any" && <FilterChip label={analyzedF === "yes" ? "تم تحليلها" : "لم تُحلَّل بعد"} onClear={() => setAnalyzedF("any")} />}
          {criteriaF !== "any" && <FilterChip label={criteriaF === "yes" ? "لديها معايير قبول" : "بلا معايير قبول"} onClear={() => setCriteriaF("any")} />}
          <button
            onClick={clearAll}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-link)", font: "var(--weight-medium) 12.5px var(--font-sans)" }}
          >
            مسح الفلاتر
          </button>
        </div>
      )}

      {/* Sort panel */}
      {showSort && (
        <div
          style={{
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-lg)",
            background: "var(--surface-card)",
            padding: "8px",
            marginBottom: 16,
            boxShadow: "var(--shadow-sm)",
            maxWidth: 320,
          }}
        >
          {SORTS.map((s) => {
            const on = sortBy === s.v;
            return (
              <button
                key={s.v}
                onClick={() => {
                  setSortBy(s.v);
                  setShowSort(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "9px 10px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: on ? "var(--blue-50)" : "transparent",
                  color: on ? "var(--blue-700)" : "var(--text-body)",
                  font: `var(--weight-${on ? "semibold" : "regular"}) 13px/1 var(--font-sans)`,
                  cursor: "pointer",
                  textAlign: "start",
                }}
                onMouseEnter={(e) => {
                  if (!on) e.currentTarget.style.background = "var(--slate-100)";
                }}
                onMouseLeave={(e) => {
                  if (!on) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ width: 16, display: "inline-flex" }}>
                  {on && <Icon name="check" size={14} color="var(--blue-600)" strokeWidth={3} />}
                </span>
                {s.l}
              </button>
            );
          })}
        </div>
      )}

      {/* AI summary banner — data-driven, only after something was analyzed */}
      {analyzedCount > 0 && (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "14px 16px",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--teal-200)",
          background: "linear-gradient(180deg, var(--teal-50), var(--surface-card))",
          marginBottom: 20,
        }}
      >
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: "var(--radius-md)",
            background: "var(--teal-500)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "0 0 36px",
          }}
        >
          <Icon name="sparkles" size={19} color="#fff" />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "var(--weight-semibold) 14px/1.4 var(--font-sans)", color: "var(--teal-700)" }}>خلاصة وثّق</div>
          <div style={{ font: "13px/1.5 var(--font-sans)", color: "var(--text-body)" }}>
            اكتمل تحليل {analyzedCount} من {REQUIREMENTS.length} متطلبًا
            {avgConfidence != null ? ` بمتوسط جودة ${avgConfidence}٪` : ""}
            {needsInfoCount > 0 ? ` · ${needsInfoCount} بحاجة لمعلومات إضافية قبل الاعتماد` : ""}.
          </div>
        </div>
        <Button variant="ghost" size="sm" iconEnd={<Icon name="chevron-left" size={15} />} style={{ color: "var(--teal-700)" }} onClick={onViewAnalysis}>
          عرض التحليل
        </Button>
      </div>
      )}

      {/* Status filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {filters.map((f) => {
          const on = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                padding: "6px 12px",
                borderRadius: "var(--radius-pill)",
                border: `1px solid ${on ? "var(--navy-800)" : "var(--border-default)"}`,
                background: on ? "var(--navy-800)" : "var(--surface-card)",
                color: on ? "#fff" : "var(--text-body)",
                font: "var(--weight-medium) 13px/1 var(--font-sans)",
                cursor: "pointer",
              }}
            >
              {f.label}
              <span style={{ font: "11px/1 var(--font-mono)", opacity: 0.7 }}>{f.n}</span>
            </button>
          );
        })}
      </div>

      {/* Results summary */}
      {anyRefinement && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, font: "13px var(--font-sans)", color: "var(--text-muted)", flexWrap: "wrap" }}>
          <span>
            عرض <strong style={{ color: "var(--text-strong)" }}>{list.length}</strong> من {REQUIREMENTS.length}
          </span>
          {q && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: "var(--radius-pill)", background: "var(--blue-50)", color: "var(--blue-700)", font: "12px var(--font-sans)" }}>
              <Icon name="search" size={12} /> «{search.trim()}»
            </span>
          )}
        </div>
      )}

      {REQUIREMENTS.length === 0 ? (
        /* true empty — no requirements in this project yet */
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "56px 20px",
            textAlign: "center",
            color: "var(--text-muted)",
            border: "1px dashed var(--border-strong)",
            borderRadius: "var(--radius-xl)",
            background: "var(--surface-card)",
          }}
        >
          <span style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "linear-gradient(150deg, var(--teal-50), var(--blue-50))", border: "1px solid var(--teal-100)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="clipboard-list" size={24} color="var(--teal-600)" />
          </span>
          <div style={{ font: "var(--weight-semibold) 16px var(--font-sans)", color: "var(--text-strong)" }}>لم تتم إضافة متطلبات بعد</div>
          <div style={{ font: "13.5px/1.7 var(--font-sans)", maxWidth: 380 }}>
            ابدأ برفع وثيقة متطلبات أو أضف متطلبًا يدويًا ليقوم وثّق بتحليلها لاحقًا.
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
            <Button variant="primary" iconStart={<Icon name="upload" size={15} />} onClick={() => onViewAnalysis && onViewAnalysis()}>
              رفع وثيقة متطلبات
            </Button>
            <Button variant="secondary" iconStart={<Icon name="plus" size={15} />} onClick={openCreate}>
              إضافة متطلب يدوي
            </Button>
          </div>
        </div>
      ) : list.length === 0 ? (
        /* filtered empty — search/filters matched nothing */
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "56px 20px",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          <span style={{ width: 48, height: 48, borderRadius: "var(--radius-lg)", background: "var(--slate-100)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="search-x" size={22} color="var(--text-subtle)" />
          </span>
          <div style={{ font: "var(--weight-semibold) 15px var(--font-sans)", color: "var(--text-strong)" }}>لا توجد نتائج مطابقة</div>
          <div style={{ font: "13px/1.6 var(--font-sans)", maxWidth: 340 }}>
            جرّب تعديل كلمات البحث أو إزالة بعض الفلاتر لعرض نتائج أكثر.
          </div>
          {anyRefinement && (
            <div style={{ marginTop: 6 }}>
              <Button variant="secondary" size="sm" iconStart={<Icon name="x" size={15} />} onClick={clearAll}>
                مسح الفلاتر
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(320px, 100%), 1fr))", gap: 16 }}>
          {list.map((r) => (
            <div key={r.id} className="wq-req-cell" style={{ position: "relative" }}>
              <RequirementCard {...r} onClick={() => onOpen && onOpen(r)} />
              <div
                className="wq-req-actions"
                style={{ position: "absolute", bottom: 14, insetInlineEnd: 14, display: "flex", gap: 6 }}
              >
                <ActionIcon
                  icon="pencil"
                  label="تعديل"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(r);
                  }}
                />
                <ActionIcon
                  icon={busyId === r.id ? "loader" : "trash-2"}
                  label="حذف"
                  danger
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(r);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <RequirementFormDialog
        open={dialogOpen}
        mode={dialogMode}
        initial={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={onSaved}
      />
    </div>
  );
}

function ActionIcon({
  icon,
  label,
  danger = false,
  onClick,
}: {
  icon: string;
  label: string;
  danger?: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 30,
        height: 30,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-default)",
        background: "var(--surface-card)",
        boxShadow: "var(--shadow-sm)",
        cursor: "pointer",
        color: danger ? "var(--red-500)" : "var(--text-muted)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? "var(--red-50)" : "var(--slate-100)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--surface-card)";
      }}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}
