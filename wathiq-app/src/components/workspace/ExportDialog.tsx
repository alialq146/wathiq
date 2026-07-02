"use client";

import React from "react";
import { Icon } from "@/components/ds";
import { useWorkspaceData } from "./WorkspaceDataContext";
import { exportPDF, exportWord, exportCSV, type ExportData } from "@/lib/export";

export interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
}

interface Format {
  id: "pdf" | "word" | "csv";
  icon: string;
  color: string;
  title: string;
  desc: string;
  run: (data: ExportData) => void;
  closes: boolean; // whether to close the dialog after running
}

const FORMATS: Format[] = [
  {
    id: "pdf",
    icon: "file-text",
    color: "var(--red-500)",
    title: "PDF (للطباعة والمشاركة)",
    desc: "وثيقة منسّقة كاملة. تُفتح نافذة الطباعة — اختر «حفظ كـ PDF».",
    run: exportPDF,
    closes: true,
  },
  {
    id: "word",
    icon: "file-type",
    color: "var(--blue-600)",
    title: "Word (‏.doc قابل للتحرير)",
    desc: "المستند نفسه بصيغة يفتحها Word للتعديل قبل التسليم.",
    run: exportWord,
    closes: true,
  },
  {
    id: "csv",
    icon: "table",
    color: "var(--green-600)",
    title: "Excel (‏.csv جدول)",
    desc: "جدول المتطلبات (الحالة، الأولوية، الأعداد) يفتحه Excel.",
    run: exportCSV,
    closes: true,
  },
];

export function ExportDialog({ open, onClose }: ExportDialogProps) {
  const { requirements, acceptanceCriteria, businessRules, openQuestions } = useWorkspaceData();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const data: ExportData = { requirements, acceptanceCriteria, businessRules, openQuestions };
  const criteriaCount = acceptanceCriteria.length;
  const questionCount = openQuestions.length;

  const pick = (f: Format) => {
    f.run(data);
    if (f.closes) onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--surface-overlay)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "56px 20px",
        zIndex: 50,
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "var(--surface-card)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-xl)",
          border: "1px solid var(--border-default)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: "var(--radius-sm)",
              background: "var(--blue-50)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "0 0 30px",
            }}
          >
            <Icon name="download" size={16} color="var(--blue-600)" />
          </span>
          <span style={{ font: "var(--weight-semibold) 16px var(--font-sans)", color: "var(--text-strong)" }}>
            تصدير المتطلبات
          </span>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            style={{ marginInlineStart: "auto", border: "none", background: "transparent", cursor: "pointer", color: "var(--text-subtle)", display: "inline-flex" }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, font: "13px/1.6 var(--font-sans)", color: "var(--text-muted)" }}>
            سيشمل التصدير <b style={{ color: "var(--text-body)" }}>{requirements.length}</b> متطلبًا
            مع <b style={{ color: "var(--text-body)" }}>{criteriaCount}</b> معيار قبول
            و<b style={{ color: "var(--text-body)" }}>{questionCount}</b> سؤالًا مفتوحًا. اختر الصيغة:
          </p>

          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => pick(f)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                textAlign: "start",
                padding: "12px 14px",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--radius-md)",
                background: "var(--surface-card)",
                cursor: "pointer",
                transition: "background var(--dur-fast), border-color var(--dur-fast)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--slate-50)";
                e.currentTarget.style.borderColor = "var(--border-strong)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--surface-card)";
                e.currentTarget.style.borderColor = "var(--border-default)";
              }}
            >
              <span
                style={{
                  width: 38,
                  height: 38,
                  flex: "0 0 38px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--slate-100)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={f.icon} size={19} color={f.color} />
              </span>
              <span style={{ flex: 1 }}>
                <span style={{ display: "block", font: "var(--weight-semibold) 14px/1.3 var(--font-sans)", color: "var(--text-strong)" }}>
                  {f.title}
                </span>
                <span style={{ display: "block", font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)", marginTop: 2 }}>
                  {f.desc}
                </span>
              </span>
              <Icon name="chevron-left" size={16} color="var(--text-subtle)" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
