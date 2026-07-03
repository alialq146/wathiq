"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  AIInsightPanel,
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
} from "@/lib/data";
import {
  updateRequirementStatus,
  addAcceptanceCriterion,
  toggleAcceptanceCriterion,
  answerOpenQuestion,
  applyImprovedRequirement,
} from "@/app/actions";
import type { ReqAnalysisStatus } from "@/lib/data";
import { useWorkspaceData } from "./WorkspaceDataContext";

const NO_DB_MSG = "قاعدة البيانات غير متصلة، لذا تعذّر حفظ التغيير.";
const GENERIC_ERR = "تعذّر تنفيذ العملية. يرجى المحاولة مرة أخرى.";

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
    source,
  } = useWorkspaceData();
  const connected = source === "database";

  // Only the items linked to this requirement.
  const criteria = acceptanceCriteria.filter((c) => c.requirementId === req.id);
  const rules = businessRules.filter((b) => b.requirementId === req.id);
  const questions = openQuestions.filter((q) => q.requirementId === req.id);

  const [tab, setTab] = React.useState("criteria");
  const tabs = [
    { id: "criteria", label: "معايير القبول", count: criteria.length },
    { id: "rules", label: "قواعد العمل", count: rules.length },
    { id: "questions", label: "أسئلة مفتوحة", count: questions.length },
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
        <Tag color="slate">{req.module}</Tag>
      </div>

      <h1 style={{ font: "var(--weight-semibold) var(--text-h1)/1.3 var(--font-sans)", color: "var(--text-strong)", margin: "0 0 12px" }}>
        {req.title}
      </h1>
      <p style={{ font: "15px/1.7 var(--font-sans)", color: "var(--text-body)", margin: "0 0 20px", maxWidth: 680 }}>
        {req.description}
      </p>

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
          <span style={{ font: "var(--weight-medium) 11px/1 var(--font-sans)", color: "var(--text-subtle)" }}>أصحاب المصلحة</span>
          <StakeholderGroup people={req.stakeholders} size={26} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 150 }}>
          <span style={{ font: "var(--weight-medium) 11px/1 var(--font-sans)", color: "var(--text-subtle)" }}>ثقة الذكاء الاصطناعي</span>
          {req.confidence != null ? (
            <ConfidenceMeter value={req.confidence} variant="pill" />
          ) : (
            <span style={{ font: "13px var(--font-sans)", color: "var(--text-subtle)" }}>لم يُحلَّل بعد</span>
          )}
        </div>
      </div>

      <Tabs items={tabs} value={tab} onChange={setTab} style={{ marginBottom: 18 }} />

      {tab === "criteria" && (
        <CriteriaTab requirementId={req.id} items={criteria} connected={connected} />
      )}
      {tab === "rules" && <RulesTab items={rules} />}
      {tab === "questions" && (
        <QuestionsTab items={questions} connected={connected} />
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

/**
 * Build the AI-insight panel content from the requirement's real data, so the
 * panel reflects this specific requirement instead of static copy.
 */
function deriveInsights(
  req: Requirement,
  criteria: AcceptanceCriterion[],
  rules: BusinessRule[],
  questions: OpenQuestion[]
) {
  const done = criteria.filter((c) => c.done).length;
  const undone = criteria.filter((c) => !c.done);
  const unanswered = questions.filter((q) => !q.answer);

  const summary =
    criteria.length + rules.length + questions.length === 0
      ? "لم تُستخرَج عناصر لهذا المتطلب بعد. ابدأ بإضافة معايير القبول أو أعد تحليل المستند."
      : `يضم هذا المتطلب ${criteria.length} معيار قبول (${done} منجز) و${rules.length} قاعدة عمل و${questions.length} سؤالًا مفتوحًا.`;

  const reasoning: string[] = [];
  if (criteria.length > 0) {
    reasoning.push(`اكتمل ${done} من ${criteria.length} من معايير القبول.`);
  }
  if (questions.length > 0) {
    reasoning.push(`${unanswered.length} من ${questions.length} من الأسئلة المفتوحة بلا إجابة.`);
  }
  if (rules.length > 0) {
    reasoning.push(`ترتبط ${rules.length} قاعدة عمل بهذا المتطلب.`);
  }
  if (reasoning.length === 0) {
    reasoning.push("لا توجد عناصر تحليل بعد لهذا المتطلب.");
  }

  const recommendations: string[] = [];
  undone.slice(0, 2).forEach((c) => recommendations.push(`أكمل معيار القبول ${c.id}.`));
  unanswered.slice(0, 2).forEach((q) => recommendations.push(`أجب عن السؤال الموجّه إلى ${q.to}.`));
  if (recommendations.length === 0 && (criteria.length > 0 || questions.length > 0)) {
    recommendations.push("جميع العناصر مكتملة — المتطلب جاهز لطلب الاعتماد.");
  }

  // Confidence: prefer the stored value; otherwise approximate from completion.
  const ratio = criteria.length ? Math.round((done / criteria.length) * 100) : 0;
  const confidence = req.confidence ?? (criteria.length ? ratio : undefined);

  return { summary, reasoning, recommendations, confidence };
}

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
function RequirementAnalysisPanel({ req, connected }: { req: Requirement; connected: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [limited, setLimited] = React.useState(false);
  const [applying, startApply] = React.useTransition();
  const a = req.analysis ?? null;

  const runAnalysis = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setLimited(false);
    try {
      const res = await fetch("/api/analyze-requirement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: req.id }),
      });
      const data = await res.json();
      if (data.ok) {
        router.refresh();
      } else if (data.error === "limit") {
        setLimited(true);
      } else {
        setError(
          data.error === "no-key"
            ? "التحليل يتطلب ربط مفتاح Anthropic API في إعدادات الموقع."
            : data.error === "no-db"
            ? "التحليل يتطلب قاعدة بيانات — يعمل على الموقع المنشور فقط."
            : "تعذّر التحليل. حاول مرة أخرى."
        );
      }
    } catch {
      setError("تعذّر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const applyImproved = () => {
    if (!a) return;
    startApply(async () => {
      const res = await applyImprovedRequirement(req.id, a.improvedVersion);
      if (res.ok) router.refresh();
    });
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
        <div style={{ font: "var(--weight-bold) 15px/1.4 var(--font-sans)", color: "var(--text-strong)" }}>وصلت إلى حد التحليلات</div>
        <p style={{ font: "12.5px/1.6 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>
          قم بالترقية للحصول على تحليلات أكثر ومميزات متقدمة.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 6 }}>
          <a href="/pricing" style={{ display: "inline-flex", alignItems: "center", height: 36, padding: "0 14px", borderRadius: "var(--radius-pill)", background: "var(--primary)", color: "#fff", font: "var(--weight-semibold) 13px var(--font-sans)", textDecoration: "none" }}>عرض الباقات</a>
          <button onClick={() => setLimited(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-subtle)", font: "13px var(--font-sans)" }}>إغلاق</button>
        </div>
      </div>
    );
  }

  // Header (shared).
  const header = (score: number | null, statusMeta?: { label: string; fg: string; bg: string }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "var(--teal-50)", borderBottom: "1px solid var(--teal-100)" }}>
      <Icon name="sparkles" size={17} color="var(--teal-600)" />
      <span style={{ font: "var(--weight-semibold) 14px/1 var(--font-sans)", color: "var(--teal-700)", flex: 1 }}>تحليل الجودة</span>
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

  // Not analyzed yet.
  if (!a) {
    return (
      <div style={cardStyle}>
        {header(null)}
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, alignItems: "center", textAlign: "center" }}>
          <p style={{ font: "13px/1.7 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>
            لم يُحلَّل هذا المتطلب بعد. حلّله بالذكاء الاصطناعي للحصول على درجة الجودة، الغموض، المخاطر، الأسئلة، ومعايير القبول.
          </p>
          <Button
            variant="brand"
            fullWidth
            disabled={loading || !connected}
            title={connected ? undefined : "غير متصل بقاعدة البيانات"}
            iconStart={<Icon name={loading ? "loader-circle" : "sparkles"} size={16} style={loading ? { animation: "wq-spin 0.7s linear infinite" } : undefined} />}
            onClick={runAnalysis}
          >
            {loading ? "جارٍ التحليل…" : "تحليل المتطلب بالذكاء الاصطناعي"}
          </Button>
          {error && <span style={{ font: "12px/1.5 var(--font-sans)", color: "var(--status-danger-fg)" }}>{error}</span>}
        </div>
      </div>
    );
  }

  // Analyzed — full panel.
  const sm = REQ_STATUS_META[a.status] ?? REQ_STATUS_META.needs_improvement;
  const hasAmbiguity =
    a.ambiguity.vagueWords.length + a.ambiguity.missingInfo.length + a.ambiguity.assumptions.length + a.ambiguity.risks.length > 0;

  return (
    <div style={cardStyle}>
      {header(a.qualityScore, sm)}
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
        {a.summary && <p style={{ margin: 0, font: "13.5px/1.7 var(--font-sans)", color: "var(--text-body)" }}>{a.summary}</p>}

        {/* SMART */}
        <div>
          <div style={{ font: "var(--weight-semibold) 11px/1 var(--font-sans)", letterSpacing: ".04em", color: "var(--text-subtle)", marginBottom: 8, textTransform: "uppercase" }}>تقييم SMART</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {SMART_LABELS.map(([k, label]) => {
              const item = (a.smart as unknown as Record<string, { rating?: string; reason?: string }>)[k] || {};
              const m = SMART_RATING[item.rating ?? "fail"] ?? SMART_RATING.fail;
              return (
                <div key={k} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ width: 18, height: 18, flex: "0 0 18px", borderRadius: "50%", background: m.bg, display: "inline-flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
                    <Icon name={m.icon} size={11} color={m.fg} strokeWidth={2.5} />
                  </span>
                  <div style={{ flex: 1 }}>
                    <span style={{ font: "var(--weight-semibold) 12.5px/1.4 var(--font-sans)", color: "var(--text-strong)" }}>{label}</span>
                    <span style={{ font: "11px var(--font-sans)", color: m.fg, marginInlineStart: 6 }}>· {m.label}</span>
                    {item.reason && <div style={{ font: "11.5px/1.55 var(--font-sans)", color: "var(--text-muted)", marginTop: 1 }}>{item.reason}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ambiguity */}
        {hasAmbiguity && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ font: "var(--weight-semibold) 11px/1 var(--font-sans)", letterSpacing: ".04em", color: "var(--text-subtle)", textTransform: "uppercase" }}>تحليل الغموض والمخاطر</div>
            <AmbiguityGroup icon="type" title="كلمات غامضة" items={a.ambiguity.vagueWords} color="var(--amber-600)" />
            <AmbiguityGroup icon="help-circle" title="معلومات ناقصة" items={a.ambiguity.missingInfo} color="var(--teal-600)" />
            <AmbiguityGroup icon="git-branch" title="افتراضات غير مؤكدة" items={a.ambiguity.assumptions} color="var(--blue-600)" />
            <AmbiguityGroup icon="alert-triangle" title="مخاطر محتملة" items={a.ambiguity.risks} color="var(--red-500)" />
          </div>
        )}

        {/* Improved version */}
        {a.improvedVersion && (
          <div>
            <div style={{ font: "var(--weight-semibold) 11px/1 var(--font-sans)", letterSpacing: ".04em", color: "var(--text-subtle)", marginBottom: 8, textTransform: "uppercase" }}>صياغة محسّنة مقترحة</div>
            <div style={{ padding: "10px 12px", background: "var(--slate-50)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", font: "13px/1.7 var(--font-sans)", color: "var(--text-body)" }}>
              {a.improvedVersion}
            </div>
            <Button
              variant="secondary"
              size="sm"
              fullWidth
              disabled={applying || !connected}
              style={{ marginTop: 8 }}
              iconStart={<Icon name={applying ? "loader-circle" : "wand-sparkles"} size={15} style={applying ? { animation: "wq-spin 0.7s linear infinite" } : undefined} />}
              onClick={applyImproved}
            >
              {applying ? "جارٍ الاعتماد…" : "اعتماد الصياغة المحسّنة"}
            </Button>
          </div>
        )}

        {/* Re-analyze */}
        <Button
          variant="ghost"
          size="sm"
          fullWidth
          disabled={loading || !connected}
          iconStart={<Icon name={loading ? "loader-circle" : "rotate-ccw"} size={15} style={loading ? { animation: "wq-spin 0.7s linear infinite" } : undefined} />}
          onClick={runAnalysis}
        >
          {loading ? "جارٍ التحليل…" : "إعادة التحليل"}
        </Button>
        {error && <span style={{ font: "12px/1.5 var(--font-sans)", color: "var(--status-danger-fg)" }}>{error}</span>}
      </div>
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
