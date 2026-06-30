"use client";

import React from "react";
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
} from "@/components/ds";
import { type Requirement } from "@/lib/data";
import { useWorkspaceData } from "./WorkspaceDataContext";

export interface RequirementDetailProps {
  req: Requirement;
  onBack: () => void;
}

/* Requirement detail — header, tabs (criteria / rules / questions), meta. */
export function RequirementDetail({ req, onBack }: RequirementDetailProps) {
  const {
    acceptanceCriteria: ACCEPTANCE_CRITERIA,
    businessRules: BUSINESS_RULES,
    openQuestions: OPEN_QUESTIONS,
  } = useWorkspaceData();
  const [tab, setTab] = React.useState("criteria");
  const tabs = [
    { id: "criteria", label: "معايير القبول", count: ACCEPTANCE_CRITERIA.length },
    { id: "rules", label: "قواعد العمل", count: BUSINESS_RULES.length },
    { id: "questions", label: "أسئلة مفتوحة", count: OPEN_QUESTIONS.length },
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
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ACCEPTANCE_CRITERIA.map((c) => (
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
              }}
            >
              <span
                style={{
                  marginTop: 1,
                  width: 18,
                  height: 18,
                  flex: "0 0 18px",
                  borderRadius: "var(--radius-xs)",
                  border: `1.5px solid ${c.done ? "var(--green-500)" : "var(--border-strong)"}`,
                  background: c.done ? "var(--green-500)" : "transparent",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {c.done && <Icon name="check" size={12} color="#fff" strokeWidth={3} />}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ font: "var(--font-mono-id)", color: "var(--text-muted)", direction: "ltr" }}>{c.id}</span>
                  {c.ai && (
                    <Badge tone="ai" dot>
                      مُستخرَج آليًا
                    </Badge>
                  )}
                </div>
                <div style={{ font: "14px/1.6 var(--font-sans)", color: "var(--text-body)" }}>{c.text}</div>
              </div>
            </div>
          ))}
          <button
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
        </div>
      )}

      {tab === "rules" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {BUSINESS_RULES.map((b) => (
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
      )}

      {tab === "questions" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {OPEN_QUESTIONS.map((q) => (
            <div
              key={q.id}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: "12px 14px",
                background: "var(--amber-50)",
                border: "1px solid var(--amber-100)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <Icon name="message-circle-question" size={18} color="var(--amber-600)" style={{ marginTop: 1 }} />
              <div style={{ flex: 1 }}>
                <div style={{ font: "14px/1.6 var(--font-sans)", color: "var(--text-body)", marginBottom: 8 }}>{q.text}</div>
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
                </div>
              </div>
              <Button variant="secondary" size="sm">
                إجابة
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface DetailRailProps {
  req: Requirement;
}

/* Right rail for the detail view — AI insight panel + actions. */
export function DetailRail({ req }: DetailRailProps) {
  const {
    acceptanceCriteria: ACCEPTANCE_CRITERIA,
    businessRules: BUSINESS_RULES,
  } = useWorkspaceData();
  return (
    <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
      <AIInsightPanel
        confidence={req.confidence ?? 70}
        summary={`استخرجت ${ACCEPTANCE_CRITERIA.length} معايير قبول و${BUSINESS_RULES.length} قواعد عمل من المستند المرفوع.`}
        reasoning={[
          "تحديد الجهات الفاعلة: المستخدم، النظام، منصة النفاذ الوطني.",
          "استخراج المسار الأساسي وحالات الاستثناء من النص.",
          "مطابقة القواعد المستخرجة مع سياسة الأمان ٢٫٣.",
        ]}
        recommendations={[
          "أكمل معيار القبول AC-1.4 الخاص بقفل الحساب.",
          "أجب عن السؤالين المفتوحين قبل طلب الاعتماد.",
        ]}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Button variant="brand" fullWidth iconStart={<Icon name="check-circle" size={16} />}>
          طلب الاعتماد
        </Button>
        <Button variant="secondary" fullWidth iconStart={<Icon name="message-circle" size={16} />}>
          طلب معلومات إضافية
        </Button>
      </div>
    </div>
  );
}
