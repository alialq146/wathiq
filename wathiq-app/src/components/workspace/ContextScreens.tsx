"use client";

import React from "react";
import { Avatar, Icon, Tag } from "@/components/ds";
import type { Requirement } from "@/lib/data";
import { useWorkspaceData } from "./WorkspaceDataContext";

/* Shared page header. */
function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h1 style={{ font: "var(--weight-semibold) var(--text-h1)/1.3 var(--font-sans)", color: "var(--text-strong)", margin: "0 0 6px" }}>
        {title}
      </h1>
      <p style={{ font: "14px/1.6 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>{subtitle}</p>
    </div>
  );
}

const PAGE_STYLE: React.CSSProperties = { padding: "24px 28px 48px", maxWidth: 920, margin: "0 auto" };

/* Small clickable requirement chip. */
function ReqChip({ req, onOpen }: { req: Requirement; onOpen: (r: Requirement) => void }) {
  return (
    <button
      onClick={() => onOpen(req)}
      title={req.title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 8px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border-default)",
        background: "var(--surface-card)",
        cursor: "pointer",
        font: "var(--font-mono-id)",
        color: "var(--blue-700)",
        maxWidth: 220,
      }}
    >
      <span style={{ direction: "ltr" }}>{req.id}</span>
      <span
        style={{
          font: "12px var(--font-sans)",
          color: "var(--text-muted)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {req.title}
      </span>
    </button>
  );
}

/* ================= Stakeholders ================= */

export function StakeholdersScreen({ onOpen }: { onOpen: (r: Requirement) => void }) {
  const { requirements } = useWorkspaceData();

  // name → requirements they appear on
  const map = new Map<string, Requirement[]>();
  for (const r of requirements) {
    for (const name of r.stakeholders) {
      const list = map.get(name) ?? [];
      list.push(r);
      map.set(name, list);
    }
  }
  const people = Array.from(map.entries())
    .map(([name, reqs]) => ({ name, reqs }))
    .sort((a, b) => b.reqs.length - a.reqs.length);

  return (
    <div style={PAGE_STYLE}>
      <PageHeader
        title="أصحاب المصلحة"
        subtitle={`${people.length} من أصحاب المصلحة عبر ${requirements.length} متطلبًا في المشروع.`}
      />
      {people.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>لا يوجد أصحاب مصلحة بعد.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {people.map((p) => (
            <div
              key={p.name}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                padding: 16,
                background: "var(--surface-card)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <Avatar name={p.name} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "var(--weight-semibold) 14px/1.3 var(--font-sans)", color: "var(--text-strong)" }}>
                    {p.name}
                  </div>
                  <div style={{ font: "12px/1.3 var(--font-sans)", color: "var(--text-subtle)" }}>
                    على {p.reqs.length} متطلب
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {p.reqs.map((r) => (
                  <ReqChip key={r.id} req={r} onOpen={onOpen} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= Business rules ================= */

export function RulesScreen({ onOpen }: { onOpen: (r: Requirement) => void }) {
  const { businessRules, requirements } = useWorkspaceData();
  const reqById = new Map(requirements.map((r) => [r.id, r]));

  // group by source
  const groups = new Map<string, typeof businessRules>();
  for (const b of businessRules) {
    const list = groups.get(b.source) ?? [];
    list.push(b);
    groups.set(b.source, list);
  }
  const sources = Array.from(groups.entries());

  return (
    <div style={PAGE_STYLE}>
      <PageHeader
        title="قواعد العمل"
        subtitle={`${businessRules.length} قاعدة عمل موزّعة على ${sources.length} مصدرًا.`}
      />
      {businessRules.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>لا توجد قواعد عمل بعد.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {sources.map(([source, rules]) => (
            <div key={source} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <Icon name="shield-check" size={16} color="var(--navy-600)" />
                <span style={{ font: "var(--weight-semibold) 13px/1 var(--font-sans)", color: "var(--text-strong)" }}>{source}</span>
                <Tag color="slate">{rules.length}</Tag>
              </div>
              {rules.map((b) => {
                const owner = b.requirementId ? reqById.get(b.requirementId) : undefined;
                return (
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
                    <span style={{ font: "var(--font-mono-id)", color: "var(--text-muted)", direction: "ltr", marginTop: 1 }}>{b.id}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ font: "14px/1.6 var(--font-sans)", color: "var(--text-body)", marginBottom: owner ? 8 : 0 }}>{b.text}</div>
                      {owner && <ReqChip req={owner} onOpen={onOpen} />}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= Audit trail ================= */

interface ActionMeta {
  icon: string;
  color: string;
}
const ACTION_META: Record<string, ActionMeta> = {
  status_changed: { icon: "flag", color: "var(--amber-600)" },
  criterion_added: { icon: "plus", color: "var(--blue-600)" },
  criterion_toggled: { icon: "check", color: "var(--green-500)" },
  question_answered: { icon: "message-circle", color: "var(--teal-600)" },
  question_added: { icon: "message-circle-question", color: "var(--amber-600)" },
  requirement_created: { icon: "file-plus", color: "var(--green-500)" },
  requirement_updated: { icon: "pencil", color: "var(--blue-600)" },
  requirement_deleted: { icon: "trash-2", color: "var(--red-500)" },
  requirements_imported: { icon: "sparkles", color: "var(--teal-600)" },
};
const DEFAULT_META: ActionMeta = { icon: "activity", color: "var(--slate-500)" };

// Deterministic (fixed-timezone) formatter so server and client agree.
const DT_FMT = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Riyadh",
});
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return DT_FMT.format(d);
}

export function AuditScreen() {
  const { auditEvents } = useWorkspaceData();

  return (
    <div style={PAGE_STYLE}>
      <PageHeader
        title="سجل التدقيق"
        subtitle={`${auditEvents.length} حدثًا مسجّلًا على مستوى المشروع، الأحدث أولًا.`}
      />
      {auditEvents.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>لا توجد أحداث مسجّلة بعد. ستظهر هنا كل تغييرات الحالة والتعديلات.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {auditEvents.map((e, i) => {
            const meta = ACTION_META[e.action] ?? DEFAULT_META;
            const last = i === auditEvents.length - 1;
            return (
              <div key={e.id} style={{ display: "flex", gap: 12 }}>
                {/* timeline gutter */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      flex: "0 0 30px",
                      borderRadius: "50%",
                      background: "var(--surface-card)",
                      border: "1px solid var(--border-default)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name={meta.icon} size={15} color={meta.color} />
                  </span>
                  {!last && <span style={{ width: 1.5, flex: 1, background: "var(--border-subtle)", margin: "4px 0" }} />}
                </div>
                {/* body */}
                <div style={{ flex: 1, paddingBottom: last ? 0 : 16 }}>
                  <div style={{ font: "14px/1.6 var(--font-sans)", color: "var(--text-body)" }}>{e.detail}</div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 4,
                      font: "12px/1 var(--font-sans)",
                      color: "var(--text-subtle)",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Icon name="user" size={12} /> {e.actor}
                    </span>
                    <span>·</span>
                    <span>{formatDateTime(e.createdAt)}</span>
                    {e.requirementId && (
                      <>
                        <span>·</span>
                        <span style={{ font: "var(--font-mono-id)", direction: "ltr", color: "var(--text-muted)" }}>{e.requirementId}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
