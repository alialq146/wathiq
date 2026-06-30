"use client";

import React from "react";
import { Button, Icon, RequirementCard } from "@/components/ds";
import { type Requirement } from "@/lib/data";
import { useWorkspaceData } from "./WorkspaceDataContext";

export interface RequirementsScreenProps {
  onOpen?: (req: Requirement | null) => void;
}

/* Requirements list screen — AI summary banner, filter row, requirement grid. */
export function RequirementsScreen({ onOpen }: RequirementsScreenProps) {
  const { requirements: REQUIREMENTS } = useWorkspaceData();
  const [filter, setFilter] = React.useState<string>("all");
  const filters = [
    { id: "all", label: "الكل", n: REQUIREMENTS.length },
    { id: "needs_info", label: "بحاجة لمعلومات", n: REQUIREMENTS.filter((r) => r.status === "needs_info").length },
    { id: "review", label: "قيد المراجعة", n: REQUIREMENTS.filter((r) => r.status === "review").length },
    { id: "approved", label: "معتمد", n: REQUIREMENTS.filter((r) => r.status === "approved").length },
    { id: "blocked", label: "محظور", n: REQUIREMENTS.filter((r) => r.status === "blocked").length },
  ];
  const list = filter === "all" ? REQUIREMENTS : REQUIREMENTS.filter((r) => r.status === filter);

  return (
    <div style={{ padding: "24px 28px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
        <div>
          <h1 style={{ font: "var(--weight-semibold) var(--text-h1)/1.2 var(--font-sans)", color: "var(--text-strong)", margin: 0 }}>
            المتطلبات
          </h1>
          <p style={{ font: "14px/1.5 var(--font-sans)", color: "var(--text-muted)", margin: "6px 0 0" }}>
            ٦ متطلبات مستخرجة من ٣ وثائق · آخر تحليل قبل ٣ ساعات
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" iconStart={<Icon name="filter" size={15} />}>
            تصفية
          </Button>
          <Button variant="secondary" size="sm" iconStart={<Icon name="arrow-up-down" size={15} />}>
            ترتيب
          </Button>
        </div>
      </div>

      {/* AI summary banner */}
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
            اكتمل تحليل ٦ متطلبات بمتوسط ثقة ٧٤٪. متطلبان بحاجة لمعلومات إضافية و٤ معايير قبول غير مكتملة قبل الاعتماد.
          </div>
        </div>
        <Button variant="ghost" size="sm" iconEnd={<Icon name="chevron-left" size={15} />} style={{ color: "var(--teal-700)" }}>
          عرض التحليل
        </Button>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
        {list.map((r) => (
          <RequirementCard key={r.id} {...r} onClick={() => onOpen && onOpen(r)} />
        ))}
      </div>
    </div>
  );
}
