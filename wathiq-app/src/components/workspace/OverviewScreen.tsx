"use client";

import React from "react";
import { Badge, Button, Card, ConfidenceMeter, Icon, PriorityLabel, StatusBadge } from "@/components/ds";
import { PROJECT, REQUIREMENTS, type Requirement } from "@/lib/data";

export interface OverviewScreenProps {
  onOpen?: (req: Requirement | null) => void;
}

/* Project overview — BA-specific: readiness, status distribution,
   acceptance-criteria coverage, missing information. Not a generic dashboard. */
export function OverviewScreen({ onOpen }: OverviewScreenProps) {
  const statusCounts: Record<string, number> = {
    approved: 1,
    review: 1,
    needs_info: 1,
    analyzing: 1,
    draft: 1,
    blocked: 1,
  };
  const statusMeta = [
    { id: "approved", label: "معتمد", c: "var(--green-500)" },
    { id: "review", label: "قيد المراجعة", c: "var(--amber-500)" },
    { id: "needs_info", label: "بحاجة لمعلومات", c: "var(--teal-500)" },
    { id: "analyzing", label: "قيد التحليل", c: "var(--blue-600)" },
    { id: "draft", label: "مسودة", c: "var(--slate-400)" },
    { id: "blocked", label: "محظور", c: "var(--red-500)" },
  ];

  const missing = [
    { req: "FR-033", text: "تعريف الصلاحيات الدقيقة لكل دور وظيفي غير مكتمل.", sev: "high" },
    { req: "FR-008", text: "معايير قبول التصدير غير محددة (الصيغ، الحدود).", sev: "medium" },
    { req: "NFR-003", text: "بيئة قياس الأداء وشروط الحمل غير موثّقة.", sev: "medium" },
  ];

  return (
    <div style={{ padding: "24px 28px 40px", maxWidth: 1120, margin: "0 auto" }}>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ font: "var(--weight-semibold) var(--text-h1)/1.2 var(--font-sans)", color: "var(--text-strong)", margin: 0 }}>
          {PROJECT.name}
        </h1>
        <p
          style={{
            font: "14px/1.5 var(--font-sans)",
            color: "var(--text-muted)",
            margin: "6px 0 0",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ font: "12px var(--font-mono)", color: "var(--text-subtle)", direction: "ltr" }}>#{PROJECT.id}</span>
          <span>·</span>
          <span>٦ متطلبات</span>
          <span>·</span>
          <span>٥ أصحاب مصلحة</span>
        </p>
      </div>

      {/* readiness band */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card padding="lg">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ font: "var(--weight-semibold) 14px var(--font-sans)", color: "var(--text-strong)" }}>
              جاهزية المتطلبات للاعتماد
            </span>
            <Badge tone="warning">٦٢٪</Badge>
          </div>
          <div style={{ height: 10, borderRadius: 999, background: "var(--slate-150)", overflow: "hidden", display: "flex" }}>
            <div style={{ width: "17%", background: "var(--green-500)" }} />
            <div style={{ width: "17%", background: "var(--amber-500)" }} />
            <div style={{ width: "17%", background: "var(--teal-500)" }} />
            <div style={{ width: "11%", background: "var(--blue-600)" }} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 16px", marginTop: 14 }}>
            {statusMeta.map((s) => (
              <span
                key={s.id}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  font: "12px var(--font-sans)",
                  color: "var(--text-muted)",
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, background: s.c }} /> {s.label}
                <span style={{ font: "11px var(--font-mono)", color: "var(--text-subtle)" }}>{statusCounts[s.id]}</span>
              </span>
            ))}
          </div>
        </Card>
        <Card padding="lg" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span style={{ font: "12px var(--font-sans)", color: "var(--text-muted)", marginBottom: 8 }}>تغطية معايير القبول</span>
          <div style={{ font: "var(--weight-bold) 32px/1 var(--font-sans)", color: "var(--text-strong)" }}>
            78<span style={{ fontSize: 18, color: "var(--text-muted)" }}>٪</span>
          </div>
          <div style={{ marginTop: 10 }}>
            <ConfidenceMeter value={78} label="٢٢ من ٢٨ مكتملة" />
          </div>
        </Card>
        <Card padding="lg" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <span style={{ font: "12px var(--font-sans)", color: "var(--text-muted)", marginBottom: 8 }}>متوسط ثقة الذكاء الاصطناعي</span>
          <div style={{ font: "var(--weight-bold) 32px/1 var(--font-sans)", color: "var(--teal-600)" }}>
            74<span style={{ fontSize: 18, color: "var(--text-muted)" }}>٪</span>
          </div>
          <div style={{ marginTop: 10, font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
            متطلب واحد بثقة منخفضة يحتاج مراجعة بشرية.
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Missing information */}
        <Card padding="none">
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
            <Icon name="alert-triangle" size={17} color="var(--amber-600)" />
            <span style={{ font: "var(--weight-semibold) 14px var(--font-sans)", color: "var(--text-strong)" }}>معلومات ناقصة</span>
            <Badge tone="warning" style={{ marginInlineStart: "auto" }}>
              {missing.length}
            </Badge>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {missing.map((m, i) => (
              <button
                key={m.req}
                onClick={() =>
                  onOpen && onOpen(REQUIREMENTS.find((r) => r.id === m.req) || REQUIREMENTS[0])
                }
                style={{
                  display: "flex",
                  gap: 11,
                  alignItems: "flex-start",
                  padding: "13px 18px",
                  borderTop: i ? "1px solid var(--border-subtle)" : "none",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "start",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: m.sev === "high" ? "var(--red-500)" : "var(--amber-500)",
                    marginTop: 6,
                    flex: "0 0 7px",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ font: "var(--font-mono-id)", color: "var(--blue-700)", direction: "ltr" }}>{m.req}</span>
                  </div>
                  <div style={{ font: "13px/1.5 var(--font-sans)", color: "var(--text-body)", marginTop: 3 }}>{m.text}</div>
                </div>
                <Icon name="chevron-left" size={15} color="var(--text-subtle)" />
              </button>
            ))}
          </div>
        </Card>

        {/* Recently analyzed */}
        <Card padding="none">
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
            <Icon name="clock" size={17} color="var(--text-muted)" />
            <span style={{ font: "var(--weight-semibold) 14px var(--font-sans)", color: "var(--text-strong)" }}>أحدث المتطلبات</span>
            <Button variant="ghost" size="sm" style={{ marginInlineStart: "auto" }} onClick={() => onOpen && onOpen(null)}>
              عرض الكل
            </Button>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {REQUIREMENTS.slice(0, 4).map((r, i) => (
              <button
                key={r.id}
                onClick={() => onOpen && onOpen(r)}
                style={{
                  display: "flex",
                  gap: 11,
                  alignItems: "center",
                  padding: "12px 18px",
                  borderTop: i ? "1px solid var(--border-subtle)" : "none",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "start",
                }}
              >
                <PriorityLabel level={r.priority} showLabel={false} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ font: "var(--font-mono-id)", color: "var(--text-muted)", direction: "ltr", fontSize: 12 }}>{r.id}</span>
                  </div>
                  <div
                    style={{
                      font: "var(--weight-medium) 13px/1.4 var(--font-sans)",
                      color: "var(--text-strong)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {r.title}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
