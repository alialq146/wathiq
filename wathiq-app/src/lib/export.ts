/**
 * Client-side export utilities for the Wathiq requirements workspace.
 *
 * Deliberately dependency-free and Arabic/RTL-safe:
 * - PDF  → opens a print-optimised window and lets the browser render the
 *          Arabic text perfectly (Save as PDF from the print dialog).
 * - Word → downloads a Word-compatible HTML document (.doc).
 * - CSV  → downloads a UTF-8 (BOM) spreadsheet Excel opens with Arabic intact.
 *
 * All functions must run in the browser (they touch window/document).
 */

import type {
  Requirement,
  AcceptanceCriterion,
  BusinessRule,
  OpenQuestion,
} from "./data";
import { PROJECT } from "./data";

export interface ExportData {
  requirements: Requirement[];
  acceptanceCriteria: AcceptanceCriterion[];
  businessRules: BusinessRule[];
  openQuestions: OpenQuestion[];
}

const STATUS_AR: Record<string, string> = {
  draft: "مسودة",
  analyzing: "قيد التحليل",
  review: "قيد المراجعة",
  needs_info: "بحاجة لمعلومات",
  approved: "معتمد",
  blocked: "محظور",
};

const PRIORITY_AR: Record<string, string> = {
  critical: "حرجة",
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

/** Escape text so it can't break the generated HTML. */
function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** A fixed, deterministic Gregorian date (Riyadh) for the document header. */
function today(): string {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    dateStyle: "long",
    timeZone: "Asia/Riyadh",
  }).format(new Date());
}

/* ---------------- HTML report (shared by PDF + Word) ---------------- */

function requirementSection(
  r: Requirement,
  criteria: AcceptanceCriterion[],
  rules: BusinessRule[],
  questions: OpenQuestion[]
): string {
  const meta = [
    ["الحالة", STATUS_AR[r.status] ?? r.status],
    ["الأولوية", PRIORITY_AR[r.priority] ?? r.priority],
    ["الوحدة", r.module],
    ["الثقة", r.confidence != null ? `${r.confidence}%` : "—"],
    ["أصحاب المصلحة", r.stakeholders.join("، ") || "—"],
  ]
    .map(
      ([k, v]) =>
        `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`
    )
    .join("");

  const criteriaHTML = criteria.length
    ? `<h3>معايير القبول</h3><ul class="checks">${criteria
        .map(
          (c) =>
            `<li><span class="box">${c.done ? "☑" : "☐"}</span> <span class="cid">${esc(
              c.id
            )}</span> ${esc(c.text)}</li>`
        )
        .join("")}</ul>`
    : "";

  const rulesHTML = rules.length
    ? `<h3>قواعد العمل</h3><ul>${rules
        .map(
          (b) =>
            `<li><span class="cid">${esc(b.id)}</span> ${esc(
              b.text
            )} <span class="src">— ${esc(b.source)}</span></li>`
        )
        .join("")}</ul>`
    : "";

  const questionsHTML = questions.length
    ? `<h3>الأسئلة المفتوحة</h3><ul>${questions
        .map(
          (q) =>
            `<li>${esc(q.text)} <span class="src">— موجّه إلى ${esc(q.to)}</span>${
              q.answer ? `<div class="answer"><b>الإجابة:</b> ${esc(q.answer)}</div>` : ""
            }</li>`
        )
        .join("")}</ul>`
    : "";

  return `
  <section class="req">
    <div class="req-head">
      <span class="req-id">${esc(r.id)}</span>
      <h2>${esc(r.title)}</h2>
    </div>
    <p class="desc">${esc(r.description)}</p>
    <table class="meta">${meta}</table>
    ${criteriaHTML}
    ${rulesHTML}
    ${questionsHTML}
  </section>`;
}

export const REPORT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #0d1629; margin: 0; padding: 32px 40px; direction: rtl; line-height: 1.6; }
  .cover { border-bottom: 2px solid #1f3a8a; padding-bottom: 16px; margin-bottom: 24px; }
  .cover .brand { font-size: 13px; letter-spacing: .08em; color: #64748b; }
  .cover h1 { font-size: 26px; margin: 6px 0 4px; color: #0f213f; }
  .cover .sub { color: #475569; font-size: 14px; }
  section.req { padding: 18px 0; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; }
  .req-head { display: flex; align-items: baseline; gap: 10px; }
  .req-id { font-family: "Courier New", monospace; direction: ltr; color: #1f3a8a; background: #eef2ff; padding: 2px 8px; border-radius: 6px; font-size: 13px; }
  .req-head h2 { font-size: 18px; margin: 0; color: #0f213f; }
  .desc { color: #334155; margin: 8px 0 12px; }
  table.meta { border-collapse: collapse; margin: 0 0 12px; width: 100%; max-width: 520px; }
  table.meta td { padding: 4px 8px; font-size: 13px; border: 1px solid #e2e8f0; }
  table.meta td.k { color: #64748b; width: 130px; background: #f8fafc; }
  h3 { font-size: 14px; color: #0f213f; margin: 14px 0 6px; }
  ul { margin: 0; padding-inline-start: 20px; }
  li { margin: 4px 0; font-size: 13.5px; }
  ul.checks { list-style: none; padding-inline-start: 0; }
  ul.checks .box { font-size: 15px; }
  .cid { font-family: "Courier New", monospace; direction: ltr; color: #64748b; font-size: 12px; }
  .src { color: #94a3b8; font-size: 12px; }
  .answer { margin: 4px 0 0; padding: 6px 10px; background: #f8fafc; border-radius: 6px; color: #334155; font-size: 13px; }
  @media print { body { padding: 0; } .no-print { display: none !important; } }
`;

export function buildReportBody(data: ExportData): string {
  const sections = data.requirements
    .map((r) =>
      requirementSection(
        r,
        data.acceptanceCriteria.filter((c) => c.requirementId === r.id),
        data.businessRules.filter((b) => b.requirementId === r.id),
        data.openQuestions.filter((q) => q.requirementId === r.id)
      )
    )
    .join("");

  return `
  <div class="cover">
    <div class="brand">وثّق · WATHIQ — وثيقة المتطلبات</div>
    <h1>${esc(PROJECT.name)}</h1>
    <div class="sub">${data.requirements.length} متطلبًا · ${esc(today())}</div>
    <div class="sub">المشروع: <span dir="ltr">${esc(PROJECT.code)} · ${esc(String(PROJECT.id))}</span></div>
  </div>
  ${sections}`;
}

/* ---------------- PDF (print window) ---------------- */

export function exportPDF(data: ExportData): void {
  const win = window.open("", "_blank");
  if (!win) {
    window.alert("منع المتصفح فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.");
    return;
  }
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
    <title>وثيقة المتطلبات — ${esc(PROJECT.name)}</title><style>${REPORT_CSS}
    .bar { position: sticky; top: 0; background: #0f213f; color: #fff; padding: 10px 16px; display: flex; gap: 12px; align-items: center; font-family: "Segoe UI", Tahoma, sans-serif; }
    .bar button { font: inherit; background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    </style></head><body>
    <div class="bar no-print"><b>وثيقة جاهزة للطباعة</b><button onclick="window.print()">طباعة / حفظ PDF</button><span>اختر «حفظ كـ PDF» من وجهة الطابعة.</span></div>
    ${buildReportBody(data)}
    <script>window.onload=function(){setTimeout(function(){window.print();},350);};<\/script>
    </body></html>`;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

/* ---------------- Word (.doc) ---------------- */

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportWord(data: ExportData): void {
  const html = `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" lang="ar" dir="rtl"><head><meta charset="utf-8"><title>وثيقة المتطلبات</title><style>${REPORT_CSS}</style></head><body>${buildReportBody(
    data
  )}</body></html>`;
  triggerDownload(
    new Blob(["﻿", html], { type: "application/msword;charset=utf-8" }),
    `wathiq-requirements-${PROJECT.code}.doc`
  );
}

/* ---------------- CSV (Excel) ---------------- */

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export function exportCSV(data: ExportData): void {
  const header = [
    "المعرّف",
    "العنوان",
    "الحالة",
    "الأولوية",
    "الوحدة",
    "الثقة",
    "معايير القبول",
    "الأسئلة المفتوحة",
    "أصحاب المصلحة",
  ];
  const rows = data.requirements.map((r) =>
    [
      r.id,
      r.title,
      STATUS_AR[r.status] ?? r.status,
      PRIORITY_AR[r.priority] ?? r.priority,
      r.module,
      r.confidence != null ? `${r.confidence}%` : "",
      data.acceptanceCriteria.filter((c) => c.requirementId === r.id).length,
      data.openQuestions.filter((q) => q.requirementId === r.id).length,
      r.stakeholders.join("، "),
    ]
      .map(csvCell)
      .join(",")
  );
  const csv = "﻿" + [header.map(csvCell).join(","), ...rows].join("\r\n");
  triggerDownload(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    `wathiq-requirements-${PROJECT.code}.csv`
  );
}
