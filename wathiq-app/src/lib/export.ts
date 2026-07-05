/**
 * Client-side report builder for Wathiq — dependency-free and Arabic/RTL-safe.
 *
 * - PDF  → print-optimised window (browser renders Arabic perfectly; the user
 *          picks «حفظ كـ PDF»). A fixed footer repeats on every printed page.
 * - Word → Word-compatible HTML downloaded as .doc (opens fully editable).
 * - CSV  → UTF-8 (BOM) spreadsheet for Excel.
 *
 * Security note: all data comes from the server-scoped workspace context —
 * the server already filtered it to the signed-in owner's active project, so
 * nothing here can reach another user's data.
 */

import type {
  Requirement,
  AcceptanceCriterion,
  BusinessRule,
  OpenQuestion,
  Project,
} from "./data";

/* ---------------- inputs ---------------- */

export interface ReportContext {
  project: Project | null;
  userName: string | null;
  requirements: Requirement[];
  acceptanceCriteria: AcceptanceCriterion[];
  businessRules: BusinessRule[];
  openQuestions: OpenQuestion[];
}

export interface ReportSections {
  summary: boolean; // الملخص التنفيذي
  table: boolean; // جدول المتطلبات
  details: boolean; // تفاصيل المتطلبات
  criteria: boolean; // معايير القبول (ضمن التفاصيل)
  questions: boolean; // الأسئلة المفتوحة (ضمن التفاصيل)
  ambiguity: boolean; // نقاط الغموض (ضمن التفاصيل)
  assistant: boolean; // توصيات مساعد وثّق (ضمن التفاصيل)
}

export interface ReportOptions {
  detailed: boolean; // تفصيلي (يشمل تفاصيل كل متطلب) أم مختصر
  sections: ReportSections;
  /** وسم نطاق التقرير عندما لا يشمل كل المتطلبات (مثال: «النتائج المفلترة»). */
  scopeLabel?: string | null;
}

export const DEFAULT_SECTIONS: ReportSections = {
  summary: true,
  table: true,
  details: true,
  criteria: true,
  questions: true,
  ambiguity: true,
  assistant: true,
};

/* ---------------- labels ---------------- */

const STATUS_AR: Record<string, string> = {
  draft: "مسودة",
  analyzing: "قيد التحليل",
  review: "قيد المراجعة",
  needs_info: "بحاجة لمعلومات",
  approved: "معتمد",
  blocked: "محظور",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "#64748b",
  analyzing: "#2563eb",
  review: "#b45309",
  needs_info: "#0f766e",
  approved: "#15803d",
  blocked: "#b91c1c",
};
const PRIORITY_AR: Record<string, string> = {
  critical: "حرجة",
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};
const PRIORITY_COLOR: Record<string, string> = {
  critical: "#b91c1c",
  high: "#b45309",
  medium: "#1d4ed8",
  low: "#64748b",
};
const PROJECT_STATUS_AR: Record<string, string> = {
  draft: "مسودة",
  active: "نشط",
  completed: "مكتمل",
};

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function today(): string {
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    dateStyle: "long",
    timeZone: "Asia/Riyadh",
  }).format(new Date());
}

const badge = (label: string, color: string) =>
  `<span class="badge" style="color:${color};border-color:${color}66;background:${color}14">${esc(label)}</span>`;

/* ---------------- derived stats (no AI needed) ---------------- */

interface Stats {
  total: number;
  byStatus: Array<[string, number]>;
  byPriority: Array<[string, number]>;
  approved: number;
  review: number;
  needsInfo: number;
  readiness: number;
  analyzed: number;
  avgQuality: number | null;
  withoutCriteria: Requirement[];
  notAnalyzed: Requirement[];
  highPriority: Requirement[];
  needsReview: Requirement[];
}

function computeStats(ctx: ReportContext): Stats {
  const reqs = ctx.requirements;
  const total = reqs.length;
  const count = (pred: (r: Requirement) => boolean) => reqs.filter(pred).length;
  const approved = count((r) => r.status === "approved");
  const review = count((r) => r.status === "review");
  const needsInfo = count((r) => r.status === "needs_info");
  const analyzedList = reqs.filter((r) => r.confidence != null || r.analysis != null);
  const quals = analyzedList.map((r) => r.confidence).filter((c): c is number => c != null);
  const critIds = new Set(ctx.acceptanceCriteria.map((c) => c.requirementId));
  return {
    total,
    byStatus: Object.keys(STATUS_AR)
      .map((s): [string, number] => [s, count((r) => r.status === s)])
      .filter(([, n]) => n > 0),
    byPriority: Object.keys(PRIORITY_AR)
      .map((p): [string, number] => [p, count((r) => r.priority === p)])
      .filter(([, n]) => n > 0),
    approved,
    review,
    needsInfo,
    readiness: total ? Math.round(((approved + review * 0.5) / total) * 100) : 0,
    analyzed: analyzedList.length,
    avgQuality: quals.length ? Math.round(quals.reduce((a, b) => a + b, 0) / quals.length) : null,
    withoutCriteria: reqs.filter((r) => !critIds.has(r.id)),
    notAnalyzed: reqs.filter((r) => r.confidence == null && r.analysis == null),
    highPriority: reqs.filter((r) => r.priority === "critical" || r.priority === "high"),
    needsReview: reqs.filter((r) => r.status === "needs_info" || r.status === "review"),
  };
}

/* ---------------- report sections ---------------- */

function coverHTML(ctx: ReportContext, s: Stats, opts: ReportOptions): string {
  const p = ctx.project;
  const rows = [
    ["المشروع", p?.name ?? "مساحة العمل"],
    p?.code ? ["رمز المشروع", p.code] : null,
    p?.client ? ["الجهة / العميل", p.client] : null,
    p?.domain ? ["المجال", p.domain] : null,
    ["تاريخ التقرير", today()],
    ctx.userName ? ["أُعدّ بواسطة", ctx.userName] : null,
    ["عدد المتطلبات", String(s.total)],
    opts.scopeLabel ? ["نطاق التقرير", opts.scopeLabel] : null,
  ].filter(Boolean) as Array<[string, string]>;

  return `
  <section class="cover">
    <div class="cover-brand">
      <span class="mark">و</span>
      <span>وثّق <i>WATHIQ</i></span>
    </div>
    <h1>تقرير تحليل المتطلبات</h1>
    <div class="cover-sub">${opts.detailed ? "تقرير تفصيلي" : "تقرير مختصر"}</div>
    <table class="cover-meta">
      ${rows.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}
    </table>
  </section>`;
}

function summaryHTML(s: Stats): string {
  const stat = (label: string, value: string, accent = "#0f213f") =>
    `<div class="stat"><div class="stat-v" style="color:${accent}">${esc(value)}</div><div class="stat-l">${esc(label)}</div></div>`;

  const distRow = (label: string, n: number, total: number, color: string) => `
    <tr><td class="k">${esc(label)}</td><td class="n">${n}</td>
      <td class="bar-cell"><div class="bar"><span style="width:${total ? Math.round((n / total) * 100) : 0}%;background:${color}"></span></div></td></tr>`;

  return `
  <section class="block">
    <h2>الملخص التنفيذي</h2>
    <div class="stats">
      ${stat("إجمالي المتطلبات", String(s.total))}
      ${stat("معتمدة", String(s.approved), "#15803d")}
      ${stat("قيد المراجعة", String(s.review), "#b45309")}
      ${stat("بحاجة لمعلومات", String(s.needsInfo), "#0f766e")}
      ${stat("نسبة الجاهزية التقديرية", `${s.readiness}٪`, s.readiness >= 70 ? "#15803d" : s.readiness >= 40 ? "#b45309" : "#b91c1c")}
      ${s.avgQuality != null ? stat("متوسط مؤشر الجودة", `${s.avgQuality}٪`, "#0f766e") : stat("تم تحليلها", `${s.analyzed} من ${s.total}`)}
    </div>
    <div class="dist">
      <div>
        <h3>حسب الحالة</h3>
        <table class="dist-t">${s.byStatus.map(([k, n]) => distRow(STATUS_AR[k], n, s.total, STATUS_COLOR[k])).join("")}</table>
      </div>
      <div>
        <h3>حسب الأولوية</h3>
        <table class="dist-t">${s.byPriority.map(([k, n]) => distRow(PRIORITY_AR[k], n, s.total, PRIORITY_COLOR[k])).join("")}</table>
      </div>
    </div>
  </section>`;
}

function overviewHTML(ctx: ReportContext, s: Stats): string {
  const p = ctx.project;
  if (!p) return "";
  const notes: string[] = [];
  if (s.needsInfo > 0) notes.push(`${s.needsInfo} متطلبًا بحاجة لمعلومات إضافية قبل الاعتماد.`);
  if (s.withoutCriteria.length > 0) notes.push(`${s.withoutCriteria.length} متطلبًا بلا معايير قبول بعد.`);
  if (s.notAnalyzed.length > 0) notes.push(`${s.notAnalyzed.length} متطلبًا لم يُراجَع بمساعد وثّق بعد.`);
  if (notes.length === 0) notes.push("لا توجد ملاحظات جوهرية — المتطلبات في حالة جيدة.");
  return `
  <section class="block">
    <h2>نظرة عامة على المشروع</h2>
    ${p.description ? `<p class="p-desc">${esc(p.description)}</p>` : ""}
    <table class="cover-meta">
      ${p.domain ? `<tr><td class="k">المجال</td><td>${esc(p.domain)}</td></tr>` : ""}
      <tr><td class="k">حالة المشروع</td><td>${esc(PROJECT_STATUS_AR[p.status] ?? p.status)}</td></tr>
      <tr><td class="k">عدد المتطلبات</td><td>${s.total}</td></tr>
    </table>
    <h3>أبرز الملاحظات</h3>
    <ul>${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
  </section>`;
}

function tableHTML(reqs: Requirement[]): string {
  const rows = reqs
    .map(
      (r) => `
    <tr>
      <td class="mono">${esc(r.id)}</td>
      <td class="t-title">${esc(r.title)}</td>
      <td>${r.type ? esc(r.type) : "—"}</td>
      <td>${badge(PRIORITY_AR[r.priority] ?? r.priority, PRIORITY_COLOR[r.priority] ?? "#64748b")}</td>
      <td>${badge(STATUS_AR[r.status] ?? r.status, STATUS_COLOR[r.status] ?? "#64748b")}</td>
      <td>${r.source ? esc(r.source) : "—"}</td>
      <td>${r.assignee ? esc(r.assignee) : "—"}</td>
      <td class="mono">V${r.version ?? 1}</td>
      <td class="mono">${r.confidence != null ? `${r.confidence}٪` : "—"}</td>
    </tr>`
    )
    .join("");
  return `
  <section class="block">
    <h2>جدول المتطلبات</h2>
    <table class="req-table">
      <thead><tr>
        <th>الرقم</th><th>العنوان</th><th>النوع</th><th>الأولوية</th><th>الحالة</th>
        <th>المصدر</th><th>المسؤول</th><th>الإصدار</th><th>مؤشر الجودة</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function detailHTML(
  r: Requirement,
  criteria: AcceptanceCriterion[],
  questions: OpenQuestion[],
  sec: ReportSections
): string {
  const a = r.analysis;
  const parts: string[] = [];

  parts.push(`<p class="desc">${esc(r.description)}</p>`);
  if (r.notes) parts.push(`<div class="note"><b>ملاحظات:</b> ${esc(r.notes)}</div>`);

  if (sec.criteria && criteria.length)
    parts.push(
      `<h4>معايير القبول</h4><ul class="checks">${criteria
        .map((c) => `<li><span class="box">${c.done ? "☑" : "☐"}</span> ${esc(c.text)}</li>`)
        .join("")}</ul>`
    );

  if (sec.questions && questions.length)
    parts.push(
      `<h4>الأسئلة المفتوحة</h4><ul>${questions
        .map((q) => `<li>${esc(q.text)}${q.answer ? `<div class="answer"><b>الإجابة:</b> ${esc(q.answer)}</div>` : ""}</li>`)
        .join("")}</ul>`
    );

  if (sec.ambiguity && a) {
    const amb: string[] = [];
    if (a.ambiguity.vagueWords.length) amb.push(`<li><b>كلمات غامضة:</b> ${a.ambiguity.vagueWords.map(esc).join("، ")}</li>`);
    if (a.ambiguity.missingInfo.length) amb.push(`<li><b>معلومات ناقصة:</b> ${a.ambiguity.missingInfo.map(esc).join("؛ ")}</li>`);
    if (a.ambiguity.risks.length) amb.push(`<li><b>مخاطر محتملة:</b> ${a.ambiguity.risks.map(esc).join("؛ ")}</li>`);
    if (amb.length) parts.push(`<h4>نقاط الغموض والمخاطر</h4><ul>${amb.join("")}</ul>`);
  }

  if (sec.assistant && a) {
    if (a.summary) parts.push(`<h4>خلاصة مساعد وثّق</h4><p class="desc">${esc(a.summary)}</p>`);
    if (a.improvedVersion) parts.push(`<h4>الصياغة المقترحة</h4><div class="note">${esc(a.improvedVersion)}</div>`);
  }

  const metaBits = [
    badge(STATUS_AR[r.status] ?? r.status, STATUS_COLOR[r.status] ?? "#64748b"),
    badge(PRIORITY_AR[r.priority] ?? r.priority, PRIORITY_COLOR[r.priority] ?? "#64748b"),
    r.type ? `<span class="chip">${esc(r.type)}</span>` : "",
    r.source ? `<span class="chip">المصدر: ${esc(r.source)}</span>` : "",
    r.assignee ? `<span class="chip">المسؤول: ${esc(r.assignee)}</span>` : "",
    `<span class="chip mono">V${r.version ?? 1}</span>`,
    r.confidence != null ? `<span class="chip">الجودة: ${r.confidence}٪</span>` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
  <section class="req">
    <div class="req-head"><span class="req-id">${esc(r.id)}</span><h3>${esc(r.title)}</h3></div>
    <div class="req-meta">${metaBits}</div>
    ${parts.join("")}
  </section>`;
}

function recommendationsHTML(s: Stats): string {
  const list = (title: string, reqs: Requirement[]) =>
    reqs.length
      ? `<h4>${esc(title)} (${reqs.length})</h4><ul>${reqs
          .slice(0, 10)
          .map((r) => `<li><span class="mono">${esc(r.id)}</span> — ${esc(r.title)}</li>`)
          .join("")}${reqs.length > 10 ? `<li class="muted">و${reqs.length - 10} أخرى…</li>` : ""}</ul>`
      : "";

  const tips: string[] = [];
  if (s.withoutCriteria.length) tips.push("أضِف معايير قبول قابلة للاختبار لكل متطلب قبل اعتماده.");
  if (s.needsInfo) tips.push("أغلق الأسئلة المفتوحة مع أصحاب المصلحة لرفع جاهزية الاعتماد.");
  if (s.notAnalyzed.length) tips.push("استخدم مساعد وثّق لمراجعة المتطلبات غير المحلَّلة واكتشاف الغموض مبكرًا.");
  tips.push("راجع المتطلبات عالية الأولوية أولًا — تكلفة الغموض فيها أعلى.");

  return `
  <section class="block">
    <h2>التوصيات</h2>
    ${list("متطلبات تحتاج مراجعة", s.needsReview)}
    ${list("متطلبات عالية الأولوية", s.highPriority)}
    ${list("متطلبات بلا معايير قبول", s.withoutCriteria)}
    ${list("متطلبات لم تُحلَّل بعد", s.notAnalyzed)}
    <h4>توصيات عامة</h4>
    <ul>${tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
  </section>`;
}

/* ---------------- assembly ---------------- */

export function buildReportBody(ctx: ReportContext, opts: ReportOptions): string {
  const s = computeStats(ctx);
  const sec = opts.sections;
  const hasAI = ctx.requirements.some((r) => r.analysis != null || r.confidence != null);

  const details =
    opts.detailed && sec.details
      ? ctx.requirements
          .map((r) =>
            detailHTML(
              r,
              ctx.acceptanceCriteria.filter((c) => c.requirementId === r.id),
              ctx.openQuestions.filter((q) => q.requirementId === r.id),
              sec
            )
          )
          .join("")
      : "";

  return `
  ${coverHTML(ctx, s, opts)}
  ${sec.summary ? summaryHTML(s) : ""}
  ${overviewHTML(ctx, s)}
  ${sec.table ? tableHTML(ctx.requirements) : ""}
  ${details ? `<section class="block"><h2>تفاصيل المتطلبات</h2></section>${details}` : ""}
  ${recommendationsHTML(s)}
  <section class="closing">
    <p>تم إنشاء هذا التقرير بواسطة منصة وثّق لمساعدة الفرق على تحسين جودة المتطلبات قبل بدء التنفيذ.</p>
    ${hasAI ? `<p class="muted">تم إنشاء بعض التحليلات بمساعدة نماذج ذكاء اصطناعي متقدمة.</p>` : ""}
  </section>
  <div class="pfoot">وثّق · WATHIQ — تقرير تحليل المتطلبات</div>`;
}

export const REPORT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", Tahoma, Arial, sans-serif; color: #101828; margin: 0; padding: 34px 42px 60px; direction: rtl; line-height: 1.65; font-size: 13.5px; }
  h2 { font-size: 19px; color: #0f213f; border-bottom: 2px solid #12406f; padding-bottom: 6px; margin: 26px 0 14px; }
  h3 { font-size: 15px; color: #0f213f; margin: 14px 0 8px; }
  h4 { font-size: 13.5px; color: #12406f; margin: 12px 0 6px; }
  ul { margin: 0; padding-inline-start: 20px; } li { margin: 4px 0; }
  .mono { font-family: "Courier New", monospace; direction: ltr; unicode-bidi: embed; }
  .muted { color: #94a3b8; }

  .cover { text-align: center; padding: 46px 0 22px; border-bottom: 3px double #12406f; margin-bottom: 8px; page-break-after: avoid; }
  .cover-brand { display: flex; align-items: center; justify-content: center; gap: 10px; color: #475569; font-size: 14px; margin-bottom: 18px; }
  .cover-brand .mark { width: 34px; height: 34px; border-radius: 9px; background: #0f213f; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 700; }
  .cover-brand i { font-style: normal; letter-spacing: .14em; font-size: 10px; color: #94a3b8; }
  .cover h1 { font-size: 27px; margin: 0 0 6px; color: #0f213f; }
  .cover-sub { color: #12406f; font-size: 13px; font-weight: 600; margin-bottom: 22px; }
  .cover-meta { margin: 0 auto; border-collapse: collapse; min-width: 340px; }
  .cover-meta td { padding: 6px 12px; font-size: 13px; border: 1px solid #e2e8f0; text-align: start; }
  .cover-meta td.k { color: #64748b; background: #f8fafc; width: 130px; }

  .block { page-break-inside: avoid; }
  .stats { display: flex; flex-wrap: wrap; gap: 10px; margin: 6px 0 14px; }
  .stat { flex: 1 1 130px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; text-align: center; background: #fbfcfe; }
  .stat-v { font-size: 21px; font-weight: 700; }
  .stat-l { font-size: 11.5px; color: #64748b; margin-top: 3px; }
  .dist { display: flex; gap: 26px; flex-wrap: wrap; }
  .dist > div { flex: 1 1 240px; }
  .dist-t { width: 100%; border-collapse: collapse; }
  .dist-t td { padding: 4px 6px; font-size: 12.5px; }
  .dist-t td.k { width: 110px; color: #334155; } .dist-t td.n { width: 30px; color: #64748b; }
  .dist-t .bar { height: 8px; border-radius: 99px; background: #eef2f7; overflow: hidden; }
  .dist-t .bar span { display: block; height: 100%; border-radius: 99px; }

  .p-desc, .desc { color: #334155; margin: 6px 0 10px; }
  .badge { display: inline-block; border: 1px solid; border-radius: 99px; padding: 1px 9px; font-size: 11px; white-space: nowrap; }
  .chip { display: inline-block; background: #f1f5f9; border-radius: 99px; padding: 1px 9px; font-size: 11px; color: #475569; }

  table.req-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  table.req-table th { background: #0f213f; color: #fff; padding: 7px 8px; font-size: 11px; text-align: start; }
  table.req-table td { border: 1px solid #e2e8f0; padding: 6px 8px; vertical-align: top; }
  table.req-table tr:nth-child(even) td { background: #f8fafc; }
  .t-title { min-width: 140px; }

  section.req { padding: 14px 0 12px; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; }
  .req-head { display: flex; align-items: baseline; gap: 10px; }
  .req-id { font-family: "Courier New", monospace; direction: ltr; color: #12406f; background: #eef2ff; padding: 2px 8px; border-radius: 6px; font-size: 12px; }
  .req-head h3 { margin: 0; }
  .req-meta { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 8px; }
  ul.checks { list-style: none; padding-inline-start: 0; } ul.checks .box { font-size: 14px; }
  .note { margin: 6px 0; padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; color: #334155; }
  .answer { margin: 3px 0 0; padding: 5px 10px; background: #f8fafc; border-radius: 6px; color: #334155; font-size: 12.5px; }

  .closing { margin-top: 30px; padding-top: 14px; border-top: 2px solid #12406f; color: #475569; font-size: 12.5px; text-align: center; }
  .pfoot { display: none; }
  @media print {
    body { padding: 24px 32px 46px; }
    .no-print { display: none !important; }
    /* عنصر ثابت يتكرر أسفل كل صفحة مطبوعة */
    .pfoot { display: block; position: fixed; bottom: 6px; inset-inline: 0; text-align: center; font-size: 10px; color: #94a3b8; }
  }
`;

/* ---------------- exporters ---------------- */

function projectSlug(ctx: ReportContext): string {
  return ctx.project?.code?.replace(/[^\w-]/g, "") || "report";
}

export function exportPDF(ctx: ReportContext, opts: ReportOptions): void {
  const win = window.open("", "_blank");
  if (!win) {
    window.alert("منع المتصفح فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة ثم أعد المحاولة.");
    return;
  }
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
    <title>تقرير تحليل المتطلبات — ${esc(ctx.project?.name ?? "وثّق")}</title><style>${REPORT_CSS}
    .bar { position: sticky; top: 0; background: #0f213f; color: #fff; padding: 10px 16px; display: flex; gap: 12px; align-items: center; z-index: 5; }
    .bar button { font: inherit; background: #2563eb; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    </style></head><body>
    <div class="bar no-print"><b>التقرير جاهز</b><button onclick="window.print()">طباعة / حفظ PDF</button><span>اختر «حفظ كـ PDF» من وجهة الطابعة.</span></div>
    ${buildReportBody(ctx, opts)}
    <script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script>
    </body></html>`;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

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

/** Word opens this HTML-based .doc fully editable (headings, tables, badges). */
export function exportWord(ctx: ReportContext, opts: ReportOptions): void {
  const html = `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير تحليل المتطلبات</title><style>${REPORT_CSS}</style></head><body>${buildReportBody(
    ctx,
    opts
  )}</body></html>`;
  triggerDownload(
    new Blob(["﻿", html], { type: "application/msword;charset=utf-8" }),
    `wathiq-report-${projectSlug(ctx)}.doc`
  );
}

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export function exportCSV(ctx: ReportContext): void {
  const header = ["الرقم", "العنوان", "النوع", "الأولوية", "الحالة", "المصدر", "المسؤول", "الإصدار", "مؤشر الجودة", "الوحدة", "معايير القبول", "الأسئلة", "أصحاب المصلحة"];
  const rows = ctx.requirements.map((r) =>
    [
      r.id,
      r.title,
      r.type ?? "",
      PRIORITY_AR[r.priority] ?? r.priority,
      STATUS_AR[r.status] ?? r.status,
      r.source ?? "",
      r.assignee ?? "",
      `V${r.version ?? 1}`,
      r.confidence != null ? `${r.confidence}%` : "",
      r.module,
      ctx.acceptanceCriteria.filter((c) => c.requirementId === r.id).length,
      ctx.openQuestions.filter((q) => q.requirementId === r.id).length,
      r.stakeholders.join("، "),
    ]
      .map(csvCell)
      .join(",")
  );
  const csv = "﻿" + [header.map(csvCell).join(","), ...rows].join("\r\n");
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), `wathiq-requirements-${projectSlug(ctx)}.csv`);
}
