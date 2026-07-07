"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  ConfidenceMeter,
  Icon,
  PriorityLabel,
  StakeholderGroup,
  StatusBadge,
  Tabs,
  Tag,
  type RequirementStatus,
} from "@/components/ds";
import {
  type Requirement,
  type AcceptanceCriterion,
  type BusinessRule,
  type OpenQuestion,
  type AuditEvent,
} from "@/lib/data";
import {
  updateRequirementStatus,
  addAcceptanceCriterion,
  toggleAcceptanceCriterion,
  answerOpenQuestion,
  applyImprovedRequirement,
  addOpenQuestion,
  appendRequirementNote,
  trackClientEvent,
} from "@/app/actions";
import type { ReqAnalysisStatus } from "@/lib/data";
import { useWorkspaceData } from "./WorkspaceDataContext";
import { RequirementFormDialog } from "./RequirementFormDialog";

const NO_DB_MSG = "قاعدة البيانات غير متصلة، لذا تعذّر حفظ التغيير.";
const GENERIC_ERR = "تعذّر تنفيذ العملية. يرجى المحاولة مرة أخرى.";

/* خطر مُهيكل من مهمة «اكتشاف المخاطر» (v1.9.8). */
interface RiskPayload {
  title: string;
  category: string;
  severity: string;
  impact: string;
  mitigation: string;
}

const RISK_CATEGORY_AR: Record<string, string> = {
  technical: "تقني",
  operational: "تشغيلي",
  regulatory: "تنظيمي",
  security: "أمني",
  data: "بيانات",
};
const RISK_SEVERITY_AR: Record<string, { label: string; fg: string; bg: string }> = {
  high: { label: "مرتفعة", fg: "var(--red-600)", bg: "var(--red-50)" },
  medium: { label: "متوسطة", fg: "var(--amber-600)", bg: "var(--amber-50)" },
  low: { label: "منخفضة", fg: "var(--green-600)", bg: "var(--green-50)" },
};

/* نتيجة مهمة مساعد وثّق الخفيفة — الجزء المطلوب فقط. */
interface TaskPayload {
  improvedVersion?: string;
  acceptanceCriteria?: string[];
  stakeholderQuestions?: string[];
  vagueWords?: string[];
  missingInfo?: string[];
  risks?: RiskPayload[];
}

/* مهام المساعد: quality = تحليل شامل يُحفظ؛ البقية خفيفة بنتيجة قابلة للتطبيق. */
const ASSISTANT_TASKS: { id: string; icon: string; label: string }[] = [
  { id: "quality", icon: "gauge", label: "تقييم الجودة" },
  { id: "improve", icon: "wand-sparkles", label: "تحسين الصياغة" },
  { id: "criteria", icon: "clipboard-list", label: "إنشاء معايير قبول" },
  { id: "questions", icon: "message-circle-question", label: "اقتراح أسئلة" },
  { id: "ambiguity", icon: "scan-search", label: "كشف الغموض" },
  { id: "risks", icon: "alert-triangle", label: "اكتشاف المخاطر" },
];

/* Small shared empty-state block for the tabs. */
function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "18px 16px",
        border: "1px dashed var(--border-strong)",
        borderRadius: "var(--radius-md)",
        color: "var(--text-muted)",
        font: "13px/1.6 var(--font-sans)",
      }}
    >
      <Icon name={icon} size={18} color="var(--text-subtle)" />
      <span>{text}</span>
    </div>
  );
}

export interface RequirementDetailProps {
  req: Requirement;
  onBack: () => void;
}

/* Requirement detail — header, tabs (criteria / rules / questions), meta. */
export function RequirementDetail({ req, onBack }: RequirementDetailProps) {
  const {
    acceptanceCriteria,
    businessRules,
    openQuestions,
    auditEvents,
    modules,
    source,
  } = useWorkspaceData();
  const connected = source === "database";

  // Only the items linked to this requirement.
  const criteria = acceptanceCriteria.filter((c) => c.requirementId === req.id);
  const rules = businessRules.filter((b) => b.requirementId === req.id);
  const questions = openQuestions.filter((q) => q.requirementId === req.id);
  // سجل التغييرات: أحداث هذا المتطلب فقط — البيانات مُرشَّحة أصلًا لمالكها في الخادم.
  const history = auditEvents.filter((e) => e.requirementId === req.id);

  const [tab, setTab] = React.useState("criteria");

  // تعديل المتطلب من داخل صفحته: نفس نافذة التعديل المستخدمة في القائمة،
  // وبعد الحفظ يبقى المستخدم هنا وتتحدث البيانات في مكانها مع Toast نجاح.
  const editRouter = useRouter();
  const [editOpen, setEditOpen] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };
  React.useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // حفظ/استعادة التبويب النشط لكل متطلب — يبقى مكانه بعد router.refresh
  // أو أي إعادة بناء، ويستقبل حدث «افتح تبويب التقييم» من لوحة المساعد.
  React.useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`wq-tab-${req.id}`);
      if (saved) setTab(saved);
    } catch {}
    const onOpenTab = (e: Event) => {
      const d = (e as CustomEvent<{ reqId: string; tab: string }>).detail;
      if (d?.reqId === req.id && d.tab) changeTab(d.tab);
    };
    window.addEventListener("wq-open-tab", onOpenTab);
    return () => window.removeEventListener("wq-open-tab", onOpenTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req.id]);

  const changeTab = (t: string) => {
    setTab(t);
    try {
      sessionStorage.setItem(`wq-tab-${req.id}`, t);
    } catch {}
  };

  const tabs = [
    { id: "criteria", label: "معايير القبول", count: criteria.length },
    { id: "rules", label: "قواعد العمل", count: rules.length },
    { id: "questions", label: "أسئلة مفتوحة", count: questions.length },
    { id: "quality", label: "تقييم الجودة", count: req.analysis ? 1 : 0 },
    { id: "history", label: "سجل التغييرات", count: history.length },
  ];

  return (
    <div style={{ padding: "20px 28px 40px", maxWidth: 860, margin: "0 auto" }}>
      <button
        onClick={onBack}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          border: "none",
          background: "transparent",
          color: "var(--text-muted)",
          font: "13px var(--font-sans)",
          cursor: "pointer",
          padding: 0,
          marginBottom: 16,
        }}
      >
        <Icon name="chevron-right" size={15} /> العودة إلى المتطلبات
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span
          style={{
            font: "var(--font-mono-id)",
            color: "var(--blue-700)",
            background: "var(--blue-50)",
            padding: "3px 9px",
            borderRadius: "var(--radius-sm)",
            direction: "ltr",
          }}
        >
          {req.id}
        </span>
        <StatusBadge status={req.status} />
        {req.module && <Tag color="slate">{req.module}</Tag>}
        {req.type && <Tag color="blue">{req.type}</Tag>}
        <span style={{ font: "var(--weight-medium) 11px var(--font-mono)", color: "var(--text-subtle)", direction: "ltr" }}>
          V{req.version ?? 1}
        </span>
        <span style={{ marginInlineStart: "auto" }}>
          <Button
            variant="secondary"
            size="sm"
            iconStart={<Icon name="pencil" size={14} />}
            onClick={() => setEditOpen(true)}
          >
            تعديل المتطلب
          </Button>
        </span>
      </div>

      <h1 style={{ font: "var(--weight-semibold) var(--text-h1)/1.3 var(--font-sans)", color: "var(--text-strong)", margin: "0 0 12px" }}>
        {req.title}
      </h1>
      <p style={{ font: "15px/1.7 var(--font-sans)", color: "var(--text-body)", margin: "0 0 20px", maxWidth: 680 }}>
        {req.description}
      </p>

      {req.notes && (
        <div
          style={{
            display: "flex", gap: 9, alignItems: "flex-start", maxWidth: 680,
            padding: "10px 13px", margin: "0 0 20px",
            borderRadius: "var(--radius-md)", background: "var(--slate-50)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <Icon name="sticky-note" size={15} color="var(--text-subtle)" style={{ marginTop: 2 }} />
          <div>
            <div style={{ font: "var(--weight-medium) 11px/1 var(--font-sans)", color: "var(--text-subtle)", marginBottom: 5 }}>ملاحظات</div>
            <div style={{ font: "13px/1.7 var(--font-sans)", color: "var(--text-body)", whiteSpace: "pre-wrap" }}>{req.notes}</div>
          </div>
        </div>
      )}

      {/* meta strip */}
      <div
        style={{
          display: "flex",
          gap: 28,
          padding: "14px 0",
          borderTop: "1px solid var(--border-subtle)",
          borderBottom: "1px solid var(--border-subtle)",
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "var(--weight-medium) 11px/1 var(--font-sans)", color: "var(--text-subtle)" }}>الأولوية</span>
          <PriorityLabel level={req.priority} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "var(--weight-medium) 11px/1 var(--font-sans)", color: "var(--text-subtle)" }}>المصدر</span>
          <span style={{ font: "13px var(--font-sans)", color: req.source ? "var(--text-body)" : "var(--text-subtle)" }}>
            {req.source ?? "غير محدد"}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "var(--weight-medium) 11px/1 var(--font-sans)", color: "var(--text-subtle)" }}>المسؤول</span>
          <span style={{ font: "13px var(--font-sans)", color: req.assignee ? "var(--text-body)" : "var(--text-subtle)" }}>
            {req.assignee ?? "غير محدد"}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "var(--weight-medium) 11px/1 var(--font-sans)", color: "var(--text-subtle)" }}>الوحدة</span>
          <span style={{ font: "13px var(--font-sans)", color: req.moduleId ? "var(--text-body)" : "var(--text-subtle)" }}>
            {req.moduleId ? modules.find((m) => m.id === req.moduleId)?.name ?? req.module : "لم يتم تحديده بعد"}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "var(--weight-medium) 11px/1 var(--font-sans)", color: "var(--text-subtle)" }}>أصحاب المصلحة</span>
          <StakeholderGroup people={req.stakeholders} size={26} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 150 }}>
          <span style={{ font: "var(--weight-medium) 11px/1 var(--font-sans)", color: "var(--text-subtle)" }}>مؤشر الجودة</span>
          {req.confidence != null ? (
            <ConfidenceMeter value={req.confidence} variant="pill" />
          ) : (
            <span style={{ font: "13px var(--font-sans)", color: "var(--text-subtle)" }}>لم يُحلَّل بعد</span>
          )}
        </div>
      </div>

      <Tabs items={tabs} value={tab} onChange={changeTab} style={{ marginBottom: 18 }} />

      {tab === "criteria" && (
        <CriteriaTab requirementId={req.id} items={criteria} connected={connected} />
      )}
      {tab === "rules" && <RulesTab items={rules} />}
      {tab === "questions" && (
        <QuestionsTab items={questions} connected={connected} />
      )}
      {tab === "quality" && <QualityTab req={req} connected={connected} />}
      {tab === "history" && <HistoryTab items={history} />}

      {/* تعديل المتطلب من داخل صفحته — البيانات تُشتق من السياق فلا خروج من الصفحة */}
      <RequirementFormDialog
        open={editOpen}
        mode="edit"
        initial={req}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          showToast("تم حفظ التغييرات بنجاح.");
          editRouter.refresh();
        }}
      />

      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: 24,
            insetInlineStart: "50%",
            transform: "translateX(50%)",
            zIndex: 80,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "11px 18px",
            borderRadius: "var(--radius-pill)",
            background: "var(--navy-900)",
            color: "#fff",
            font: "var(--weight-medium) 13.5px var(--font-sans)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <Icon name="check-circle" size={16} color="#7ee2b8" />
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------------- Acceptance criteria tab ---------------- */

function CriteriaTab({
  requirementId,
  items,
  connected,
}: {
  requirementId: string;
  items: AcceptanceCriterion[];
  connected: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const toggle = (c: AcceptanceCriterion) => {
    if (!connected) return;
    setError(null);
    setBusyId(c.id);
    startTransition(async () => {
      const res = await toggleAcceptanceCriterion(c.id, !c.done);
      if (!res.ok) setError(res.error === "no-db" ? NO_DB_MSG : GENERIC_ERR);
      else router.refresh();
      setBusyId(null);
    });
  };

  const submit = () => {
    const body = text.trim();
    if (body.length < 3) {
      setError("اكتب نص المعيار (٣ أحرف على الأقل).");
      return;
    }
    setError(null);
    setBusyId("__add__");
    startTransition(async () => {
      const res = await addAcceptanceCriterion(requirementId, body);
      if (res.ok) {
        setText("");
        setAdding(false);
        router.refresh();
      } else {
        setError(res.error === "no-db" ? NO_DB_MSG : res.error === "too-short" ? "النص قصير جدًا." : GENERIC_ERR);
      }
      setBusyId(null);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.length === 0 && !adding && (
        <EmptyState icon="clipboard-list" text="لا توجد معايير قبول لهذا المتطلب بعد. أضف أول معيار." />
      )}

      {items.map((c) => {
        const busy = pending && busyId === c.id;
        return (
          <div
            key={c.id}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              padding: "12px 14px",
              background: "var(--surface-card)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-md)",
              opacity: busy ? 0.6 : 1,
              transition: "opacity var(--dur-fast)",
            }}
          >
            <button
              onClick={() => toggle(c)}
              disabled={!connected || pending}
              aria-label={c.done ? "إلغاء الإنجاز" : "وسم كمنجز"}
              title={connected ? undefined : "غير متصل بقاعدة البيانات"}
              style={{
                marginTop: 1,
                width: 18,
                height: 18,
                flex: "0 0 18px",
                padding: 0,
                borderRadius: "var(--radius-xs)",
                border: `1.5px solid ${c.done ? "var(--green-500)" : "var(--border-strong)"}`,
                background: c.done ? "var(--green-500)" : "transparent",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: connected && !pending ? "pointer" : "not-allowed",
              }}
            >
              {busy ? (
                <Icon name="loader-circle" size={12} color={c.done ? "#fff" : "var(--text-subtle)"} style={{ animation: "wq-spin 0.7s linear infinite" }} />
              ) : (
                c.done && <Icon name="check" size={12} color="#fff" strokeWidth={3} />
              )}
            </button>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ font: "var(--font-mono-id)", color: "var(--text-muted)", direction: "ltr" }}>{c.id}</span>
                {c.ai && (
                  <Badge tone="ai" dot>
                    مُستخرَج آليًا
                  </Badge>
                )}
              </div>
              <div
                style={{
                  font: "14px/1.6 var(--font-sans)",
                  color: c.done ? "var(--text-muted)" : "var(--text-body)",
                  textDecoration: c.done ? "line-through" : "none",
                }}
              >
                {c.text}
              </div>
            </div>
          </div>
        );
      })}

      {adding ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "12px 14px",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            background: "var(--slate-50)",
            marginTop: 4,
          }}
        >
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              if (e.key === "Escape") { setAdding(false); setText(""); setError(null); }
            }}
            placeholder="مثال: عند نجاح التحقق، يُعاد توجيه المستخدم خلال ثانيتين…"
            rows={2}
            style={{
              width: "100%",
              resize: "vertical",
              padding: "9px 11px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-default)",
              background: "var(--surface-card)",
              font: "14px/1.6 var(--font-sans)",
              color: "var(--text-strong)",
              outline: "none",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button
              variant="brand"
              size="sm"
              disabled={pending}
              iconStart={<Icon name={pending && busyId === "__add__" ? "loader-circle" : "check"} size={15} style={pending && busyId === "__add__" ? { animation: "wq-spin 0.7s linear infinite" } : undefined} />}
              onClick={submit}
            >
              إضافة المعيار
            </Button>
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => { setAdding(false); setText(""); setError(null); }}>
              إلغاء
            </Button>
            <span style={{ font: "11px var(--font-sans)", color: "var(--text-subtle)", marginInlineStart: "auto" }}>
              ⌘/Ctrl + Enter للحفظ
            </span>
          </div>
        </div>
      ) : (
        <button
          onClick={() => (connected ? setAdding(true) : setError(NO_DB_MSG))}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            alignSelf: "flex-start",
            marginTop: 4,
            padding: "8px 12px",
            border: "1px dashed var(--border-strong)",
            borderRadius: "var(--radius-md)",
            background: "transparent",
            color: "var(--text-muted)",
            font: "13px var(--font-sans)",
            cursor: "pointer",
          }}
        >
          <Icon name="plus" size={15} /> إضافة معيار قبول
        </button>
      )}

      {error && (
        <span style={{ font: "12px/1.5 var(--font-sans)", color: "var(--status-danger-fg)" }}>{error}</span>
      )}
    </div>
  );
}

/* ---------------- Business rules tab (read-only) ---------------- */

function RulesTab({ items }: { items: BusinessRule[] }) {
  if (items.length === 0) {
    return <EmptyState icon="shield-check" text="لا توجد قواعد عمل مرتبطة بهذا المتطلب بعد." />;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((b) => (
        <div
          key={b.id}
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            padding: "12px 14px",
            background: "var(--surface-card)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <Icon name="shield-check" size={18} color="var(--navy-600)" style={{ marginTop: 1 }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <span style={{ font: "var(--font-mono-id)", color: "var(--text-muted)", direction: "ltr" }}>{b.id}</span>
              <span style={{ font: "11px var(--font-sans)", color: "var(--text-subtle)" }}>· {b.source}</span>
            </div>
            <div style={{ font: "14px/1.6 var(--font-sans)", color: "var(--text-body)" }}>{b.text}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Open questions tab ---------------- */

function QuestionsTab({ items, connected }: { items: OpenQuestion[]; connected: boolean }) {
  if (items.length === 0) {
    return <EmptyState icon="message-circle-question" text="لا توجد أسئلة مفتوحة لهذا المتطلب." />;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((q) => (
        <QuestionRow key={q.id} q={q} connected={connected} />
      ))}
    </div>
  );
}

function QuestionRow({ q, connected }: { q: OpenQuestion; connected: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState(q.answer ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const answered = Boolean(q.answer);

  const save = () => {
    const body = text.trim();
    if (body.length < 2) {
      setError("اكتب إجابة صحيحة.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await answerOpenQuestion(q.id, body);
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(res.error === "no-db" ? NO_DB_MSG : GENERIC_ERR);
      }
    });
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "12px 14px",
        background: answered ? "var(--surface-card)" : "var(--amber-50)",
        border: `1px solid ${answered ? "var(--border-default)" : "var(--amber-100)"}`,
        borderRadius: "var(--radius-md)",
      }}
    >
      <Icon
        name={answered ? "check-circle" : "message-circle-question"}
        size={18}
        color={answered ? "var(--green-500)" : "var(--amber-600)"}
        style={{ marginTop: 1 }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ font: "14px/1.6 var(--font-sans)", color: "var(--text-body)", marginBottom: 8 }}>{q.text}</div>

        {answered && !editing && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "9px 11px",
              background: "var(--slate-50)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              marginBottom: 8,
            }}
          >
            <span style={{ font: "var(--weight-semibold) 11px/1 var(--font-sans)", color: "var(--text-subtle)" }}>الإجابة</span>
            <span style={{ font: "13px/1.6 var(--font-sans)", color: "var(--text-body)" }}>{q.answer}</span>
          </div>
        )}

        {editing && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) save();
                if (e.key === "Escape") { setEditing(false); setText(q.answer ?? ""); setError(null); }
              }}
              placeholder="اكتب الإجابة أو القرار المتخذ…"
              rows={2}
              style={{
                width: "100%",
                resize: "vertical",
                padding: "9px 11px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-default)",
                background: "var(--surface-card)",
                font: "14px/1.6 var(--font-sans)",
                color: "var(--text-strong)",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Button
                variant="brand"
                size="sm"
                disabled={pending}
                iconStart={<Icon name={pending ? "loader-circle" : "check"} size={15} style={pending ? { animation: "wq-spin 0.7s linear infinite" } : undefined} />}
                onClick={save}
              >
                حفظ الإجابة
              </Button>
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => { setEditing(false); setText(q.answer ?? ""); setError(null); }}>
                إلغاء
              </Button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {q.ai && (
            <Badge tone="ai" dot>
              سؤال من وثّق
            </Badge>
          )}
          <span
            style={{
              font: "12px var(--font-sans)",
              color: "var(--text-muted)",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Icon name="user" size={13} /> موجّه إلى {q.to}
          </span>
          {error && (
            <span style={{ font: "12px var(--font-sans)", color: "var(--status-danger-fg)", marginInlineStart: "auto" }}>{error}</span>
          )}
        </div>
      </div>

      {!editing && (
        <Button
          variant="secondary"
          size="sm"
          disabled={!connected}
          title={connected ? undefined : "غير متصل بقاعدة البيانات"}
          onClick={() => setEditing(true)}
        >
          {answered ? "تعديل الإجابة" : "إجابة"}
        </Button>
      )}
    </div>
  );
}

/* ---------------- Right rail ---------------- */

export interface DetailRailProps {
  req: Requirement;
  /** Notifies the parent so it can update its snapshot of the requirement. */
  onStatusChange?: (status: RequirementStatus) => void;
}

interface StatusAction {
  target: RequirementStatus;
  variant: "brand" | "secondary";
  icon: string;
  label: string;
  pendingLabel: string;
  successMsg: string;
  /** Statuses for which the action is redundant, so we disable it. */
  doneStates: RequirementStatus[];
  doneHint: string;
}

const STATUS_ACTIONS: StatusAction[] = [
  {
    target: "review",
    variant: "brand",
    icon: "check-circle",
    label: "طلب الاعتماد",
    pendingLabel: "جارٍ الإرسال…",
    successMsg: "تم إرسال المتطلب للاعتماد، وحالته الآن «قيد المراجعة».",
    doneStates: ["review", "approved"],
    doneHint: "المتطلب في مسار الاعتماد بالفعل.",
  },
  {
    target: "needs_info",
    variant: "secondary",
    icon: "message-circle",
    label: "طلب معلومات إضافية",
    pendingLabel: "جارٍ الإرسال…",
    successMsg: "تم وسم المتطلب بـ «بحاجة لمعلومات» لاستكمال النواقص.",
    doneStates: ["needs_info"],
    doneHint: "المتطلب موسوم بالفعل كبحاجة لمعلومات.",
  },
];


const REQ_STATUS_META: Record<ReqAnalysisStatus, { label: string; fg: string; bg: string }> = {
  ready: { label: "جاهز", fg: "var(--status-success-fg)", bg: "var(--status-success-bg)" },
  needs_info: { label: "بحاجة لمعلومات", fg: "var(--status-ai-fg)", bg: "var(--status-ai-bg)" },
  needs_improvement: { label: "بحاجة لتحسين", fg: "var(--status-warning-fg)", bg: "var(--status-warning-bg)" },
  high_risk: { label: "مخاطر عالية", fg: "var(--status-danger-fg)", bg: "var(--status-danger-bg)" },
};

const SMART_LABELS: [string, string][] = [
  ["specific", "محدّد"],
  ["measurable", "قابل للقياس"],
  ["achievable", "قابل للتحقيق"],
  ["relevant", "ذو صلة"],
  ["testable", "قابل للاختبار"],
];

const SMART_RATING: Record<string, { label: string; icon: string; fg: string; bg: string }> = {
  pass: { label: "مستوفٍ", icon: "check", fg: "var(--green-600)", bg: "var(--green-50)" },
  partial: { label: "جزئي", icon: "minus", fg: "var(--amber-600)", bg: "var(--amber-50)" },
  fail: { label: "غير مستوفٍ", icon: "x", fg: "var(--red-600)", bg: "var(--red-50)" },
};

function AmbiguityGroup({ icon, title, items, color }: { icon: string; title: string; items: string[]; color: string }) {
  if (!items.length) return null;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
        <Icon name={icon} size={13} color={color} />
        <span style={{ font: "var(--weight-semibold) 12px/1 var(--font-sans)", color: "var(--text-strong)" }}>{title}</span>
      </div>
      <ul style={{ margin: 0, paddingInlineStart: 18, display: "flex", flexDirection: "column", gap: 3 }}>
        {items.map((t, i) => (
          <li key={i} style={{ font: "12.5px/1.6 var(--font-sans)", color: "var(--text-body)" }}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

/* Per-requirement AI quality analysis (axis 2). */
/* ---------------- Quality assessment tab (تقييم الجودة) ---------------- */
/* النتائج التفصيلية لمساعد وثّق تُعرض هنا في المحتوى الرئيسي —
   العمود الجانبي يبقى للتشغيل والملخص السريع فقط. */

function QualityTab({ req, connected }: { req: Requirement; connected: boolean }) {
  const router = useRouter();
  const [applying, startApply] = React.useTransition();
  const [applied, setApplied] = React.useState(false);
  const a = req.analysis ?? null;

  if (!a) {
    return (
      <EmptyState
        icon="gauge"
        text="لم يُشغَّل مساعد وثّق على هذا المتطلب بعد — شغّل «تقييم الجودة» من اللوحة الجانبية لعرض النتائج التفصيلية هنا."
      />
    );
  }

  const sm = REQ_STATUS_META[a.status] ?? REQ_STATUS_META.needs_improvement;
  const hasAmbiguity =
    a.ambiguity.vagueWords.length + a.ambiguity.missingInfo.length + a.ambiguity.assumptions.length + a.ambiguity.risks.length > 0;

  const applyImproved = () => {
    startApply(async () => {
      const res = await applyImprovedRequirement(req.id, a.improvedVersion);
      if (res.ok) {
        setApplied(true);
        router.refresh();
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 720 }}>
      {/* score header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: "var(--radius-lg)", background: "var(--teal-50)", border: "1px solid var(--teal-100)" }}>
        <Icon name="gauge" size={20} color="var(--teal-600)" />
        <span style={{ font: "var(--weight-bold) 24px/1 var(--font-sans)", color: a.qualityScore >= 75 ? "var(--green-600)" : a.qualityScore >= 45 ? "var(--amber-600)" : "var(--red-600)", direction: "ltr" }}>
          {a.qualityScore}%
        </span>
        <span style={{ font: "var(--weight-medium) 12px/1 var(--font-sans)", color: sm.fg, background: sm.bg, padding: "4px 10px", borderRadius: "var(--radius-pill)" }}>
          {sm.label}
        </span>
        {a.summary && (
          <span style={{ font: "13px/1.6 var(--font-sans)", color: "var(--text-body)", flex: 1, minWidth: 200 }}>{a.summary}</span>
        )}
      </div>

      {/* نقاط القوة / المشكلات / التوصيات — من تحليلات v1.9.8 فصاعدًا */}
      {(a.strengths?.length || a.issues?.length || a.recommendations?.length) ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {([
            ["نقاط القوة", a.strengths, "check-circle", "var(--green-600)"],
            ["المشكلات", a.issues, "alert-circle", "var(--red-500)"],
            ["التوصيات", a.recommendations, "lightbulb", "var(--amber-600)"],
          ] as const).map(([title, items, icon, color]) =>
            items?.length ? (
              <div key={title} style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "11px 13px", background: "var(--surface-card)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                  <Icon name={icon} size={14} color={color} />
                  <span style={{ font: "var(--weight-semibold) 12px/1 var(--font-sans)", color: "var(--text-strong)" }}>{title}</span>
                </div>
                <ul style={{ margin: 0, paddingInlineStart: 16, font: "12px/1.8 var(--font-sans)", color: "var(--text-body)" }}>
                  {items.map((s) => <li key={s}>{s}</li>)}
                </ul>
              </div>
            ) : null
          )}
        </div>
      ) : null}

      {/* SMART */}
      <div>
        <div style={{ font: "var(--weight-semibold) 12px/1 var(--font-sans)", letterSpacing: ".04em", color: "var(--text-subtle)", marginBottom: 10, textTransform: "uppercase" }}>تقييم SMART</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SMART_LABELS.map(([k, label]) => {
            const item = (a.smart as unknown as Record<string, { rating?: string; reason?: string }>)[k] || {};
            const m = SMART_RATING[item.rating ?? "fail"] ?? SMART_RATING.fail;
            return (
              <div key={k} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                <span style={{ width: 20, height: 20, flex: "0 0 20px", borderRadius: "50%", background: m.bg, display: "inline-flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                  <Icon name={m.icon} size={12} color={m.fg} strokeWidth={2.5} />
                </span>
                <div style={{ flex: 1 }}>
                  <span style={{ font: "var(--weight-semibold) 13.5px/1.4 var(--font-sans)", color: "var(--text-strong)" }}>{label}</span>
                  <span style={{ font: "12px var(--font-sans)", color: m.fg, marginInlineStart: 8 }}>· {m.label}</span>
                  {item.reason && <div style={{ font: "12.5px/1.6 var(--font-sans)", color: "var(--text-muted)", marginTop: 2 }}>{item.reason}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ambiguity */}
      {hasAmbiguity && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ font: "var(--weight-semibold) 12px/1 var(--font-sans)", letterSpacing: ".04em", color: "var(--text-subtle)", textTransform: "uppercase" }}>تحليل الغموض والمخاطر</div>
          <AmbiguityGroup icon="type" title="كلمات غامضة" items={a.ambiguity.vagueWords} color="var(--amber-600)" />
          <AmbiguityGroup icon="help-circle" title="معلومات ناقصة" items={a.ambiguity.missingInfo} color="var(--teal-600)" />
          <AmbiguityGroup icon="git-branch" title="افتراضات غير مؤكدة" items={a.ambiguity.assumptions} color="var(--blue-600)" />
          <AmbiguityGroup icon="alert-triangle" title="مخاطر محتملة" items={a.ambiguity.risks} color="var(--red-500)" />
        </div>
      )}

      {/* Improved version */}
      {a.improvedVersion && (
        <div>
          <div style={{ font: "var(--weight-semibold) 12px/1 var(--font-sans)", letterSpacing: ".04em", color: "var(--text-subtle)", marginBottom: 8, textTransform: "uppercase" }}>صياغة محسّنة مقترحة</div>
          <div style={{ padding: "12px 14px", background: "var(--slate-50)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", font: "13.5px/1.8 var(--font-sans)", color: "var(--text-body)" }}>
            {a.improvedVersion}
          </div>
          {applied ? (
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 8, font: "12.5px var(--font-sans)", color: "var(--green-600)" }}>
              <Icon name="check-circle" size={15} color="var(--green-600)" /> اعتُمدت الصياغة الجديدة.
            </div>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={applying || !connected}
              style={{ marginTop: 10 }}
              iconStart={<Icon name={applying ? "loader-circle" : "wand-sparkles"} size={15} style={applying ? { animation: "wq-spin 0.7s linear infinite" } : undefined} />}
              onClick={applyImproved}
            >
              {applying ? "جارٍ الاعتماد…" : "اعتماد الصياغة المحسّنة"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Change history tab (timeline) ---------------- */

const HISTORY_ICON: Record<string, string> = {
  requirement_created: "plus",
  requirement_updated: "pencil",
  requirement_improved: "wand-sparkles",
  requirement_analyzed: "sparkles",
  criterion_added: "clipboard-list",
  criterion_toggled: "check",
  question_answered: "message-circle",
  status_changed: "refresh-cw",
};

function HistoryTab({ items }: { items: AuditEvent[] }) {
  // نعرض أحدث 30 حدثًا فقط حفاظًا على خفة الصفحة.
  const [expanded, setExpanded] = React.useState(false);
  const shown = expanded ? items.slice(0, 100) : items.slice(0, 10);
  if (items.length === 0) {
    return <EmptyState icon="history" text="لا توجد تغييرات مسجّلة بعد — ستظهر هنا كل التعديلات على هذا المتطلب." />;
  }
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("ar-SA", { month: "long", day: "numeric" }) +
      " · " +
      d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
    );
  };
  return (
    <div style={{ position: "relative", paddingInlineStart: 18 }}>
      {/* خط الزمن */}
      <span style={{ position: "absolute", insetInlineStart: 8, top: 6, bottom: 6, width: 2, background: "var(--border-subtle)", borderRadius: 2 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {shown.map((e) => (
          <div key={e.id} style={{ position: "relative", padding: "9px 0 9px 0" }}>
            <span
              style={{
                position: "absolute", insetInlineStart: -18, top: 12, width: 18, height: 18,
                borderRadius: "50%", background: "var(--surface-card)", border: "2px solid var(--teal-300)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Icon name={HISTORY_ICON[e.action] ?? "pencil"} size={9} color="var(--teal-600)" />
            </span>
            <div style={{ paddingInlineStart: 10 }}>
              <div style={{ font: "13px/1.6 var(--font-sans)", color: "var(--text-body)" }}>{e.detail}</div>
              <div style={{ font: "11.5px var(--font-sans)", color: "var(--text-subtle)", marginTop: 2 }}>
                {fmt(e.createdAt)} · بواسطة {e.actor}
              </div>
            </div>
          </div>
        ))}
      </div>
      {items.length > 10 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{ marginTop: 10, border: "none", background: "transparent", cursor: "pointer", color: "var(--text-link)", font: "var(--weight-medium) 12.5px var(--font-sans)" }}
        >
          عرض كل التغييرات ({items.length})
        </button>
      )}
    </div>
  );
}

function RequirementAnalysisPanel({ req, connected }: { req: Requirement; connected: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [limited, setLimited] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const a = req.analysis ?? null;

  // نتيجة مهمة خفيفة بانتظار قرار المستخدم (اعتماد / إضافة / حفظ / تجاهل).
  const [taskResult, setTaskResult] = React.useState<{ task: string; result: TaskPayload } | null>(null);

  // فتح تبويب «تقييم الجودة» في صفحة المتطلب لعرض النتائج التفصيلية.
  const openQualityTab = () => {
    window.dispatchEvent(new CustomEvent("wq-open-tab", { detail: { reqId: req.id, tab: "quality" } }));
  };

  const runAnalysis = async (task?: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setLimited(false);
    setSuccessMsg(null);
    setTaskResult(null);
    try {
      const res = await fetch("/api/analyze-requirement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(task ? { id: req.id, task } : { id: req.id }),
      });
      const data = await res.json();
      if (data.ok && data.task) {
        setTaskResult({ task: data.task, result: data.result });
      } else if (data.ok) {
        // نجاح التحليل الشامل: رسالة واضحة، فتح تبويب النتائج، وتحديث
        // البيانات في مكانها — المستخدم يبقى داخل نفس صفحة المتطلب.
        setSuccessMsg("تم تحديث نتائج مساعد وثّق بنجاح.");
        openQualityTab();
        router.refresh();
      } else if (data.error === "limit") {
        setLimited(true);
      } else {
        setError(
          data.error === "no-key"
            ? "ميزة التحليل غير مفعّلة في هذا الموقع بعد — تواصل مع مسؤول المنصة."
            : data.error === "no-db"
            ? "التحليل يتطلب قاعدة بيانات — يعمل على الموقع المنشور فقط."
            : "تعذر تشغيل مساعد وثّق. حاول مرة أخرى."
        );
      }
    } catch {
      // انقطاع الشبكة أو تجاوز مهلة الخادم (التحليلات الطويلة) — أعد المحاولة.
      setError("انقطع الاتصال قبل اكتمال التحليل — قد يكون المتطلب طويلًا. أعد المحاولة.");
    } finally {
      setLoading(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: "var(--surface-card)",
    border: "1px solid var(--teal-200)",
    borderRadius: "var(--radius-lg)",
    overflow: "hidden",
    boxShadow: "var(--shadow-sm)",
  };

  // Upgrade prompt when the plan quota is exhausted.
  if (limited) {
    return (
      <div style={{ ...cardStyle, padding: 18, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <Icon name="sparkles" size={22} color="var(--teal-600)" />
        <div style={{ font: "var(--weight-bold) 15px/1.4 var(--font-sans)", color: "var(--text-strong)" }}>وصلت إلى حد التحليلات في خطتك الحالية</div>
        <p style={{ font: "12.5px/1.6 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>
          يمكنك الترقية للحصول على مساحة أكبر للمشاريع والتحليلات المتقدمة.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>
          <a href="/pricing" onClick={() => void trackClientEvent("upgrade_clicked", { from: "assistant_limit" })} style={{ display: "inline-flex", alignItems: "center", height: 36, padding: "0 14px", borderRadius: "var(--radius-pill)", background: "var(--primary)", color: "#fff", font: "var(--weight-semibold) 13px var(--font-sans)", textDecoration: "none" }}>عرض الباقات</a>
          <button onClick={() => setLimited(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-subtle)", font: "13px var(--font-sans)" }}>إغلاق</button>
        </div>
        <span style={{ font: "11px/1.6 var(--font-sans)", color: "var(--text-subtle)" }}>
          الترقية حاليًا بالتواصل المباشر، ويتم التفعيل خلال 24 ساعة عمل.
        </span>
      </div>
    );
  }

  // Header (shared).
  const header = (score: number | null, statusMeta?: { label: string; fg: string; bg: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--teal-50)", borderBottom: "1px solid var(--teal-100)" }}>
      <Icon name="sparkles" size={17} color="var(--teal-600)" />
      <span style={{ font: "var(--weight-semibold) 14px/1 var(--font-sans)", color: "var(--teal-700)", flex: 1 }}>مساعد وثّق</span>
      {score != null && (
        <span style={{ font: "var(--weight-bold) 16px/1 var(--font-sans)", color: score >= 75 ? "var(--green-600)" : score >= 45 ? "var(--amber-600)" : "var(--red-600)", direction: "ltr" }}>
          {score}%
        </span>
      )}
      {statusMeta && (
        <span style={{ font: "var(--weight-medium) 11px/1 var(--font-sans)", color: statusMeta.fg, background: statusMeta.bg, padding: "3px 8px", borderRadius: "var(--radius-pill)" }}>
          {statusMeta.label}
        </span>
      )}
    </div>
  );

  // شريط مهام المساعد: «تقييم الجودة» = تحليل شامل يُحفظ؛ البقية مهام خفيفة
  // تعرض نتيجتها أولًا والمستخدم يقرر تطبيقها. لا يعمل أي شيء تلقائيًا.
  const taskChips = (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {ASSISTANT_TASKS.map((act) => (
        <button
          key={act.id}
          onClick={() => runAnalysis(act.id === "quality" ? undefined : act.id)}
          disabled={loading || !connected}
          title={connected ? undefined : "غير متصل بقاعدة البيانات"}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 10px",
            borderRadius: "var(--radius-md)", border: "1px solid var(--teal-100)",
            background: "var(--teal-50)", cursor: loading || !connected ? "not-allowed" : "pointer",
            font: "var(--weight-medium) 12px/1.4 var(--font-sans)", color: "var(--teal-700)",
            textAlign: "start", opacity: loading ? 0.6 : 1,
          }}
        >
          <Icon name={act.icon} size={15} color="var(--teal-600)" />
          {act.label}
        </button>
      ))}
    </div>
  );

  const loadingRow = loading && (
    <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--teal-50)", border: "1px solid var(--teal-100)", font: "12.5px var(--font-sans)", color: "var(--teal-700)" }}>
      <Icon name="loader-circle" size={15} color="var(--teal-600)" style={{ animation: "wq-spin 0.7s linear infinite" }} />
      يعمل مساعد وثّق على مراجعة المتطلب...
    </div>
  );

  const resultCard = taskResult && (
    <AssistantResultCard
      req={req}
      task={taskResult.task}
      result={taskResult.result}
      onDone={() => {
        setTaskResult(null);
        setSuccessMsg("تم تحديث نتائج مساعد وثّق بنجاح.");
        router.refresh();
      }}
      onDismiss={() => setTaskResult(null)}
    />
  );

  const successRow = successMsg && (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: "var(--radius-md)", background: "var(--status-success-bg)", border: "1px solid var(--green-100)", font: "var(--weight-medium) 12.5px/1.5 var(--font-sans)", color: "var(--status-success-fg)" }}>
      <Icon name="check-circle" size={15} color="var(--status-success-fg)" />
      {successMsg}
    </div>
  );

  // Not analyzed yet — the assistant is optional; the requirement is fully
  // manageable without it.
  if (!a) {
    return (
      <div style={cardStyle}>
        {header(null)}
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ font: "12.5px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>
            استخدم المساعد عند الحاجة لتحسين المتطلب أو مراجعته. يمكنك إدارة المتطلب بالكامل بدون تشغيل الذكاء الاصطناعي.
          </p>
          {taskChips}
          {loadingRow}
          {successRow}
          {resultCard}
          {error && <span style={{ font: "12px/1.5 var(--font-sans)", color: "var(--status-danger-fg)", textAlign: "center" }}>{error}</span>}
        </div>
      </div>
    );
  }

  // Analyzed — compact panel: quick summary + task launcher only. The
  // detailed assessment lives in the «تقييم الجودة» tab so long results
  // don't cram the side rail.
  const sm = REQ_STATUS_META[a.status] ?? REQ_STATUS_META.needs_improvement;

  return (
    <div style={cardStyle}>
      {header(a.qualityScore, sm)}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {successRow}
        {a.summary && <p style={{ margin: 0, font: "13px/1.7 var(--font-sans)", color: "var(--text-body)" }}>{a.summary}</p>}

        {/* التفاصيل الكاملة (SMART، الغموض، الصياغة المحسّنة) في تبويب تقييم الجودة */}
        <Button
          variant="secondary"
          size="sm"
          fullWidth
          iconStart={<Icon name="gauge" size={15} />}
          onClick={openQualityTab}
        >
          عرض النتائج التفصيلية
        </Button>

        {/* Re-analyze */}
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          disabled={loading || !connected}
          iconStart={<Icon name={loading ? "loader-circle" : "rotate-ccw"} size={15} style={loading ? { animation: "wq-spin 0.7s linear infinite" } : undefined} />}
          onClick={() => runAnalysis()}
        >
          {loading ? "جارٍ التحليل…" : "إعادة التحليل"}
        </Button>
        {taskChips}
        {loadingRow}
        {resultCard}
        {error && <span style={{ font: "12px/1.5 var(--font-sans)", color: "var(--status-danger-fg)" }}>{error}</span>}
      </div>
    </div>
  );
}

/* بطاقة نتيجة مهمة المساعد الخفيفة — تعرض المقترح وأزرار التطبيق/التجاهل. */
function AssistantResultCard({
  req,
  task,
  result,
  onDone,
  onDismiss,
}: {
  req: Requirement;
  task: string;
  result: TaskPayload;
  onDone: () => void;
  onDismiss: () => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  const apply = async (fn: () => Promise<void>, successMsg: string) => {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg(successMsg);
      setTimeout(onDone, 900);
    } catch {
      setMsg(GENERIC_ERR);
      setBusy(false);
    }
  };

  const saveAsNote = (title: string, lines: string[]) =>
    apply(async () => {
      const res = await appendRequirementNote(req.id, `${title}:\n- ${lines.join("\n- ")}`);
      if (!res.ok) throw new Error(res.error);
    }, "حُفظت كملاحظة في المتطلب.");

  const listBlock = (items?: string[]) =>
    items && items.length ? (
      <ul style={{ margin: "6px 0 0", paddingInlineStart: 18, font: "12.5px/1.8 var(--font-sans)", color: "var(--text-body)" }}>
        {items.map((t) => <li key={t}>{t}</li>)}
      </ul>
    ) : null;

  let body: React.ReactNode = null;
  let actions: React.ReactNode = null;

  if (task === "improve" && result.improvedVersion) {
    body = <div style={{ font: "13px/1.8 var(--font-sans)", color: "var(--text-body)", background: "var(--slate-50)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "9px 12px", marginTop: 6 }}>{result.improvedVersion}</div>;
    actions = (
      <>
        <Button size="sm" variant="brand" disabled={busy} onClick={() => apply(async () => {
          const res = await applyImprovedRequirement(req.id, result.improvedVersion!);
          if (!res.ok) throw new Error(res.error);
        }, "اعتُمدت الصياغة الجديدة.")}>اعتماد الصياغة</Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => saveAsNote("صياغة مقترحة من مساعد وثّق", [result.improvedVersion!])}>حفظ كملاحظة</Button>
      </>
    );
  } else if (task === "criteria" && result.acceptanceCriteria?.length) {
    body = listBlock(result.acceptanceCriteria);
    actions = (
      <Button size="sm" variant="brand" disabled={busy} onClick={() => apply(async () => {
        for (const t of result.acceptanceCriteria!) {
          const res = await addAcceptanceCriterion(req.id, t);
          if (!res.ok) throw new Error("failed");
        }
      }, `أُضيفت ${result.acceptanceCriteria!.length} معايير قبول.`)}>إضافة معايير القبول</Button>
    );
  } else if (task === "questions" && result.stakeholderQuestions?.length) {
    body = listBlock(result.stakeholderQuestions);
    actions = (
      <Button size="sm" variant="brand" disabled={busy} onClick={() => apply(async () => {
        for (const t of result.stakeholderQuestions!) {
          const res = await addOpenQuestion(req.id, t);
          if (!res.ok) throw new Error("failed");
        }
      }, `أُضيفت ${result.stakeholderQuestions!.length} أسئلة مفتوحة.`)}>إضافة الأسئلة</Button>
    );
  } else if (task === "ambiguity") {
    const lines = [
      ...(result.vagueWords?.length ? [`كلمات غامضة: ${result.vagueWords.join("، ")}`] : []),
      ...(result.missingInfo ?? []).map((m) => `معلومة ناقصة: ${m}`),
    ];
    body = lines.length ? listBlock(lines) : <p style={{ font: "12.5px var(--font-sans)", color: "var(--text-muted)", margin: "6px 0 0" }}>لم يجد المساعد غموضًا واضحًا — المتطلب سليم الصياغة.</p>;
    actions = lines.length ? (
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => saveAsNote("نقاط غموض رصدها مساعد وثّق", lines)}>حفظ كملاحظة</Button>
    ) : null;
  } else if (task === "risks") {
    // مخاطر مُهيكلة (v1.9.8): تصنيف + خطورة + أثر + معالجة لكل خطر.
    const riskLines = (result.risks ?? []).map(
      (k) =>
        `[${RISK_CATEGORY_AR[k.category] ?? k.category} · ${RISK_SEVERITY_AR[k.severity]?.label ?? k.severity}] ${k.title} — الأثر: ${k.impact} | المعالجة: ${k.mitigation}`
    );
    body = result.risks?.length ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
        {result.risks.map((k, i) => {
          const sev = RISK_SEVERITY_AR[k.severity] ?? RISK_SEVERITY_AR.medium;
          return (
            <div key={i} style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: "9px 11px", background: "var(--slate-50)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                <span style={{ font: "var(--weight-semibold) 12.5px var(--font-sans)", color: "var(--text-strong)" }}>{k.title}</span>
                <span style={{ font: "var(--weight-medium) 10.5px/1 var(--font-sans)", color: sev.fg, background: sev.bg, padding: "3px 8px", borderRadius: "var(--radius-pill)" }}>{sev.label}</span>
                <span style={{ font: "10.5px/1 var(--font-sans)", color: "var(--text-subtle)", border: "1px solid var(--border-subtle)", padding: "3px 8px", borderRadius: "var(--radius-pill)" }}>
                  {RISK_CATEGORY_AR[k.category] ?? k.category}
                </span>
              </div>
              <div style={{ font: "12px/1.7 var(--font-sans)", color: "var(--text-body)", marginTop: 5 }}>
                <b>الأثر:</b> {k.impact}
              </div>
              <div style={{ font: "12px/1.7 var(--font-sans)", color: "var(--text-muted)", marginTop: 2 }}>
                <b>المعالجة:</b> {k.mitigation}
              </div>
            </div>
          );
        })}
      </div>
    ) : (
      <p style={{ font: "12.5px var(--font-sans)", color: "var(--text-muted)", margin: "6px 0 0" }}>لم يرصد المساعد مخاطر جوهرية.</p>
    );
    actions = result.risks?.length ? (
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => saveAsNote("مخاطر رصدها مساعد وثّق", riskLines)}>حفظ كملاحظة</Button>
    ) : null;
  }

  const TASK_TITLES: Record<string, string> = {
    improve: "الصياغة المقترحة",
    criteria: "معايير القبول المقترحة",
    questions: "أسئلة مقترحة للعميل",
    ambiguity: "نقاط الغموض",
    risks: "المخاطر المحتملة",
  };

  return (
    <div style={{ border: "1px solid var(--teal-200)", borderRadius: "var(--radius-md)", padding: "10px 12px", background: "var(--surface-card)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <Icon name="sparkles" size={14} color="var(--teal-600)" />
        <span style={{ font: "var(--weight-semibold) 12.5px var(--font-sans)", color: "var(--teal-700)" }}>{TASK_TITLES[task] ?? "نتيجة المساعد"}</span>
      </div>
      {body}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {actions}
        <Button size="sm" variant="ghost" disabled={busy} onClick={onDismiss}>تجاهل</Button>
      </div>
      {msg && <div style={{ font: "12px var(--font-sans)", color: "var(--teal-700)", marginTop: 6 }}>{msg}</div>}
    </div>
  );
}

/* Right rail for the detail view — per-requirement analysis + status actions. */
export function DetailRail({ req, onStatusChange }: DetailRailProps) {
  const { source } = useWorkspaceData();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [runningTarget, setRunningTarget] = React.useState<RequirementStatus | null>(null);
  const [feedback, setFeedback] = React.useState<{ tone: "success" | "error"; msg: string } | null>(
    null
  );

  const connected = source === "database";

  const apply = (action: StatusAction) => {
    setFeedback(null);
    setRunningTarget(action.target);
    startTransition(async () => {
      const res = await updateRequirementStatus(req.id, action.target);
      if (res.ok) {
        onStatusChange?.(action.target);
        setFeedback({ tone: "success", msg: action.successMsg });
        // Refresh server data so the requirements list reflects the new status too.
        router.refresh();
      } else {
        setFeedback({
          tone: "error",
          msg: res.error === "no-db" ? NO_DB_MSG : "تعذّر تحديث الحالة. يرجى المحاولة مرة أخرى.",
        });
      }
      setRunningTarget(null);
    });
  };

  return (
    <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      <RequirementAnalysisPanel req={req} connected={connected} />

      {/* Status actions */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 14,
          background: "var(--surface-card)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ font: "var(--weight-semibold) 12px/1 var(--font-sans)", color: "var(--text-strong)" }}>
            حالة المتطلب
          </span>
          <StatusBadge status={req.status} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {STATUS_ACTIONS.map((a) => {
            const isDone = a.doneStates.includes(req.status);
            const isRunning = pending && runningTarget === a.target;
            const disabled = !connected || isDone || pending;
            return (
              <Button
                key={a.target}
                variant={a.variant}
                fullWidth
                disabled={disabled}
                title={
                  !connected
                    ? "غير متصل بقاعدة البيانات — لا يمكن حفظ التغيير."
                    : isDone
                    ? a.doneHint
                    : undefined
                }
                iconStart={
                  <Icon
                    name={isRunning ? "loader-circle" : a.icon}
                    size={16}
                    style={isRunning ? { animation: "wq-spin 0.7s linear infinite" } : undefined}
                  />
                }
                onClick={() => apply(a)}
              >
                {isRunning ? a.pendingLabel : a.label}
              </Button>
            );
          })}
        </div>

        {feedback && (
          <div
            role="status"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "9px 11px",
              borderRadius: "var(--radius-md)",
              font: "12px/1.5 var(--font-sans)",
              color: feedback.tone === "success" ? "var(--status-success-fg)" : "var(--status-danger-fg)",
              background: feedback.tone === "success" ? "var(--status-success-bg)" : "var(--status-danger-bg)",
            }}
          >
            <Icon
              name={feedback.tone === "success" ? "check-circle" : "alert-circle"}
              size={15}
              style={{ marginTop: 1 }}
            />
            <span>{feedback.msg}</span>
          </div>
        )}

        {!connected && (
          <span style={{ font: "11px/1.5 var(--font-sans)", color: "var(--text-subtle)" }}>
            الإجراءات معطّلة لأن العرض يستخدم بيانات تجريبية غير متصلة بقاعدة البيانات.
          </span>
        )}
      </div>
    </div>
  );
}
