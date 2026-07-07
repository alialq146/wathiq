/**
 * قالبا BRD و SRS — يُبنيان من بيانات المشروع الحقيقية فقط (client-side من
 * سياق مساحة العمل المُرشَّح في الخادم لمالكه، فلا وصول لبيانات مستخدم آخر).
 *
 * مبدأ صارم: لا نخترع معلومات. أي قسم لا تغطيه البيانات يُوسم صراحة بعبارات
 * النقص الموحّدة من report-config (يحتاج استكمال / غير متوفر / لم يُحدَّد).
 */

import type { Requirement } from "./data";
import { arCount, arReqCount } from "./arabic";
import {
  type ReportContext,
  esc,
  today,
  badge,
  computeStats,
  STATUS_AR,
  STATUS_COLOR,
  PRIORITY_AR,
  PRIORITY_COLOR,
} from "./export";
import {
  BRAND,
  AI_DISCLOSURE,
  NEEDS_INPUT,
  NOT_AVAILABLE,
  NOT_DEFINED,
  DOC_TYPES,
  type DocType,
} from "./report-config";

export interface DocOptions {
  detailed: boolean;
  scopeLabel?: string | null;
}

/* ---------------- مقاطع مشتركة ---------------- */

const needs = (text: string) => `<p class="todo">${esc(text)}</p>`;

function coverHTML(docType: DocType, ctx: ReportContext, opts: DocOptions): string {
  const p = ctx.project;
  const rows = [
    ["المشروع", p?.name ?? "مساحة العمل"],
    p?.code ? ["كود المشروع", p.code] : null,
    ["الجهة / العميل", p?.client || NOT_DEFINED],
    ["تصنيف الوثيقة", "داخلي"],
    ["تاريخ الإنشاء", today()],
    ["معد الوثيقة", ctx.userName || NEEDS_INPUT],
    ["رقم إصدار الوثيقة", "V1"],
    opts.scopeLabel ? ["نطاق الوثيقة", opts.scopeLabel] : null,
  ].filter(Boolean) as Array<[string, string]>;
  return `
  <section class="cover">
    <div class="cover-brand"><span class="mark">و</span><span>${esc(BRAND.name)} <i>${esc(BRAND.latin)}</i></span></div>
    <h1>${esc(DOC_TYPES[docType].title)}</h1>
    <div class="cover-sub">${opts.detailed ? "نسخة تفصيلية" : "نسخة مختصرة"}</div>
    <table class="cover-meta">
      ${rows.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`).join("")}
    </table>
  </section>`;
}

function versionLogHTML(docType: DocType): string {
  return `
  <section class="block">
    <h2>سجل النسخ</h2>
    <table class="req-table">
      <thead><tr><th>الإصدار</th><th>التاريخ</th><th>الوصف</th><th>المعد</th></tr></thead>
      <tbody><tr><td class="mono">V1</td><td>${esc(today())}</td><td>إصدار أولي من ${esc(DOC_TYPES[docType].title)}.</td><td>منصة ${esc(BRAND.name)}</td></tr></tbody>
    </table>
  </section>`;
}

function approvalsHTML(): string {
  const empty = "<td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td>";
  return `
  <section class="block">
    <h2>الموافقات</h2>
    <table class="req-table">
      <thead><tr><th>الاسم</th><th>الدور</th><th>التوقيع</th><th>التاريخ</th></tr></thead>
      <tbody><tr>${empty}</tr><tr>${empty}</tr><tr>${empty}</tr></tbody>
    </table>
  </section>`;
}

/** ضبط التغييرات — نص إجرائي ثابت يسبق الموافقات (BRD وSRS). */
function changeControlHTML(sectionNo: string): string {
  return `
  <section class="block">
    <h2>${sectionNo}. ضبط التغييرات</h2>
    <p class="desc">تخضع هذه الوثيقة لإجراء ضبط التغييرات: أي تعديل بعد الاعتماد يتطلب طلب تغيير موثق يُقيَّم أثره على النطاق والجدول والتكلفة، ولا يُعتمد إلا بموافقة أصحاب الصلاحية، مع تحديث سجل النسخ ورفع رقم الإصدار.</p>
  </section>`;
}

function closingHTML(docType: DocType, hasAI: boolean): string {
  return `
  <section class="closing">
    <p>${esc(DOC_TYPES[docType].closing)}</p>
    ${hasAI ? `<p class="muted">${esc(AI_DISCLOSURE)}</p>` : ""}
  </section>
  <div class="pfoot">${esc(BRAND.name)} · ${esc(BRAND.latin)} — ${esc(DOC_TYPES[docType].title)}</div>`;
}

const reqBadges = (r: Requirement) =>
  `${badge(STATUS_AR[r.status] ?? r.status, STATUS_COLOR[r.status] ?? "#64748b")} ${badge(
    PRIORITY_AR[r.priority] ?? r.priority,
    PRIORITY_COLOR[r.priority] ?? "#64748b"
  )}`;

/** يجمع كل أصحاب المصلحة والمسؤولين الفريدين من المتطلبات — بيانات حقيقية فقط. */
function collectStakeholders(ctx: ReportContext): { name: string; role: string }[] {
  const map = new Map<string, string>();
  for (const r of ctx.requirements) {
    for (const s of r.stakeholders) if (s && !map.has(s)) map.set(s, "صاحب مصلحة (مذكور في المتطلبات)");
    if (r.assignee && !map.has(r.assignee)) map.set(r.assignee, "مسؤول عن متطلبات");
  }
  return [...map.entries()].map(([name, role]) => [name, role] as const).map(([name, role]) => ({ name, role }));
}

/** يجمع كل الافتراضات/المخاطر الحقيقية من تحليلات مساعد وثّق إن وُجدت. */
function collectFromAnalyses(ctx: ReportContext, key: "assumptions" | "risks"): string[] {
  const out: string[] = [];
  for (const r of ctx.requirements) {
    for (const item of r.analysis?.ambiguity?.[key] ?? []) out.push(`${item} (${r.id})`);
  }
  return out;
}

/** جدول وحدات المشروع (v1.9.9) — بيانات حقيقية فقط، وعبارة نقص عند الغياب. */
function modulesTableHTML(ctx: ReportContext, showEmptyLine: boolean): string {
  const mods = ctx.modules ?? [];
  if (!mods.length) return showEmptyLine ? `<p class="todo">لم يتم تحديد وحدات المشروع بعد.</p>` : "";
  const countFor = (id: string) => ctx.requirements.filter((r) => r.moduleId === id).length;
  return `<table class="req-table">
    <thead><tr><th>الوحدة</th><th>الوصف</th><th>عدد المتطلبات</th></tr></thead>
    <tbody>${mods
      .map((m) => `<tr><td>${esc(m.name)}</td><td>${m.description ? esc(m.description) : "—"}</td><td>${countFor(m.id)}</td></tr>`)
      .join("")}</tbody>
  </table>`;
}

/* ============================================================
   BRD — وثيقة متطلبات الأعمال
   ============================================================ */

export function buildBRDBody(ctx: ReportContext, opts: DocOptions): string {
  const s = computeStats(ctx);
  const hasAI = ctx.requirements.some((r) => r.analysis != null || r.confidence != null);
  const p = ctx.project;

  /* 3) الملخص التنفيذي — من وصف المشروع الحقيقي فقط */
  const execSummary = `
  <section class="block">
    <h2>١. الملخص التنفيذي</h2>
    <h4>وصف المشروع</h4>
    ${p?.description ? `<p class="desc">${esc(p.description)}</p>` : needs(NEEDS_INPUT)}
    <h4>الهدف العام</h4>
    ${p?.projectGoal ? `<p class="desc">${esc(p.projectGoal)}</p>` : needs(`${NEEDS_INPUT} (يوصى بصياغته مع راعي المشروع.)`)}
    <h4>المشكلة أو الفرصة</h4>
    ${needs(NOT_AVAILABLE)}
    <h4>القيمة المتوقعة</h4>
    ${needs(NEEDS_INPUT)}
  </section>`;


  /* التعريفات والمصطلحات — بعد الملخص التنفيذي */
  const definitions = `
  <section class="block">
    <h2>٢. التعريفات والمصطلحات</h2>
    <p class="todo">تُدرج في هذا القسم المصطلحات والاختصارات المستخدمة في الوثيقة وتعريفاتها المعتمدة. لم تُوثَّق مصطلحات بعد — يحتاج استكمال من صاحب المصلحة.</p>
  </section>`;

  /* 4) خلفية المشروع */
  const background = `
  <section class="block">
    <h2>٣. خلفية المشروع</h2>
    <table class="cover-meta">
      ${p?.domain ? `<tr><td class="k">المجال</td><td>${esc(p.domain)}</td></tr>` : ""}
      ${p?.client ? `<tr><td class="k">الجهة المستفيدة</td><td>${esc(p.client)}</td></tr>` : ""}
      <tr><td class="k">عدد المتطلبات الموثقة</td><td>${s.total}</td></tr>
    </table>
    <h4>سياق المشروع وسبب الحاجة</h4>
    ${p?.projectIdea ? `<p class="desc">${esc(p.projectIdea)}</p>` : p?.description ? `<p class="desc">${esc(p.description)}</p>` : needs(NEEDS_INPUT)}
    <h4>الأنظمة أو القنوات المرتبطة</h4>
    ${p?.relatedSystems ? `<p class="desc">${esc(p.relatedSystems)}</p>` : needs(NOT_AVAILABLE)}
    <h4>الوضع الحالي والتحديات</h4>
    ${needs(NOT_AVAILABLE)}
  </section>`;

  /* 5) أهداف العمل — لا نخترع أهدافًا؛ نُظهر ما يمكن استنتاجه موسومًا */
  const modules = [...new Set(ctx.requirements.map((r) => r.module).filter(Boolean))];
  const objectives = `
  <section class="block">
    <h2>٤. أهداف العمل</h2>
    ${p?.projectGoal ? `<p class="desc">${esc(p.projectGoal)}</p>` : ""}
    ${
      modules.length
        ? `<p class="desc">بناءً على المتطلبات الموثقة، يغطي المشروع المجالات الوظيفية التالية:</p>
           <ul>${modules.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>
           <h4>أهداف تحتاج إلى تأكيد من صاحب المصلحة</h4>
           ${needs("صياغة الأهداف الكمية (مؤشرات الأداء، النسب المستهدفة، الأطر الزمنية) " + NEEDS_INPUT)}`
        : p?.projectGoal ? "" : needs(NEEDS_INPUT)
    }
  </section>`;

  /* 6) النطاق */
  const scope = `
  <section class="block">
    <h2>٥. نطاق المشروع</h2>
    <h4>داخل النطاق</h4>
    ${p?.projectScope ? `<p class="desc">${esc(p.projectScope)}</p>` : ""}
    ${
      ctx.requirements.length
        ? `<ul>${ctx.requirements.map((r) => `<li><span class="mono">${esc(r.id)}</span> ${esc(r.title)}</li>`).join("")}</ul>`
        : p?.projectScope ? "" : needs(NOT_AVAILABLE)
    }
    <h4>خارج النطاق</h4>
    ${p?.outOfScope ? `<p class="desc">${esc(p.outOfScope)}</p>` : needs("لم تُحدَّد عناصر خارج النطاق بعد — يوصى بتوثيقها صراحة لتجنب توسع النطاق.")}
    <h4>وحدات المشروع</h4>
    ${modulesTableHTML(ctx, true)}
  </section>`;

  /* 7) أصحاب المصلحة */
  const people = collectStakeholders(ctx);
  const stakeholders = `
  <section class="block">
    <h2>٦. أصحاب المصلحة</h2>
    ${p?.targetUsers ? `<h4>المستخدمون المستهدفون</h4><p class="desc">${esc(p.targetUsers)}</p>` : ""}
    ${
      people.length
        ? `<table class="req-table"><thead><tr><th>الاسم</th><th>الدور</th></tr></thead>
           <tbody>${people.map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.role)}</td></tr>`).join("")}</tbody></table>
           <p class="muted">الأدوار التفصيلية والصلاحيات ${NEEDS_INPUT}</p>`
        : needs(NEEDS_INPUT)
    }
  </section>`;

  /* 8) المتطلبات التجارية */
  const bizReqs = `
  <section class="block">
    <h2>٧. المتطلبات التجارية</h2>
    ${ctx.requirements
      .map(
        (r) => `
      <section class="req">
        <div class="req-head"><span class="req-id">${esc(r.id)}</span><h3>${esc(r.title)}</h3></div>
        <div class="req-meta">${reqBadges(r)}
          ${r.source ? `<span class="chip">المصدر: ${esc(r.source)}</span>` : ""}
          ${r.stakeholders.length ? `<span class="chip">أصحاب المصلحة: ${esc(r.stakeholders.join("، "))}</span>` : ""}
        </div>
        ${opts.detailed ? `<p class="desc">${esc(r.description)}</p>` : ""}
      </section>`
      )
      .join("")}
  </section>`;

  /* 9) الافتراضات — من تحليلات المساعد الحقيقية فقط */
  const assumptions = collectFromAnalyses(ctx, "assumptions");
  const assumptionsHTML = `
  <section class="block">
    <h2>٨. الافتراضات</h2>
    ${
      assumptions.length
        ? `<ul>${assumptions.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>`
        : `<p class="todo">لم يتم توثيق افتراضات واضحة في بيانات المشروع الحالية.</p>`
    }
  </section>`;

  /* 10) القيود — من المتطلبات من نوع «قيد» فقط */
  const constraints = ctx.requirements.filter((r) => r.type === "قيد");
  const constraintsHTML = `
  <section class="block">
    <h2>٩. القيود</h2>
    ${p?.constraints ? `<p class="desc">${esc(p.constraints)}</p>` : ""}
    ${
      constraints.length
        ? `<ul>${constraints.map((r) => `<li><span class="mono">${esc(r.id)}</span> ${esc(r.title)} — ${esc(r.description)}</li>`).join("")}</ul>`
        : p?.constraints ? "" : needs(`القيود الزمنية والتنظيمية والتقنية والتشغيلية ${NEEDS_INPUT}`)
    }
  </section>`;

  /* 11) المخاطر — من تحليلات المساعد + نواقص محسوبة (بدون اختراع) */
  const riskItems = collectFromAnalyses(ctx, "risks");
  if (s.needsInfo > 0)
    riskItems.push("عدم وضوح بعض المتطلبات (بحاجة لمعلومات) قد يؤدي إلى اختلاف في الفهم أثناء التنفيذ.");
  if (s.withoutCriteria.length > 0)
    riskItems.push("غياب معايير قبول لبعض المتطلبات قد يؤثر على الاختبار والاعتماد.");
  const risksHTML = `
  <section class="block">
    <h2>١٠. المخاطر</h2>
    ${riskItems.length ? `<ul>${riskItems.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="todo">${esc(NOT_AVAILABLE)}</p>`}
  </section>`;

  /* 12) معايير النجاح — مقترحة من البيانات وموسومة كذلك */
  const success = `
  <section class="block">
    <h2>١١. معايير النجاح</h2>
    <p class="muted">المعايير التالية مقترحة من بيانات المتطلبات وتحتاج اعتماد صاحب المصلحة:</p>
    <ul>
      <li>اعتماد ١٠٠٪ من المتطلبات الموثقة (${s.approved} من ${s.total} معتمدة حاليًا).</li>
      <li>تغطية كل متطلب بمعايير قبول قابلة للاختبار (${s.total - s.withoutCriteria.length} من ${s.total} مغطاة حاليًا).</li>
      <li>إغلاق جميع الأسئلة المفتوحة مع أصحاب المصلحة قبل بدء التنفيذ (${arCount(ctx.openQuestions.filter((q) => !q.answer).length, { one: "سؤال واحد مفتوح", two: "سؤالان مفتوحان", few: "أسئلة مفتوحة", many: "سؤالًا مفتوحًا" })} حاليًا).</li>
    </ul>
  </section>`;

  /* 13) الأسئلة المفتوحة الحقيقية */
  const openQs = ctx.openQuestions.filter((q) => !q.answer);
  const questionsHTML = `
  <section class="block">
    <h2>١٢. الأسئلة المفتوحة</h2>
    ${
      openQs.length
        ? `<ul>${openQs.map((q) => `<li>${esc(q.text)} <span class="muted">(${esc(q.requirementId ?? "عام")} — موجه إلى ${esc(q.to)})</span></li>`).join("")}</ul>`
        : `<p class="desc">لا توجد أسئلة مفتوحة غير مُجابة حاليًا.</p>`
    }
  </section>`;

  return [
    coverHTML("brd", ctx, opts),
    versionLogHTML("brd"),
    execSummary,
    definitions,
    background,
    objectives,
    scope,
    stakeholders,
    bizReqs,
    assumptionsHTML,
    constraintsHTML,
    risksHTML,
    success,
    questionsHTML,
    changeControlHTML("١٣"),
    approvalsHTML(),
    closingHTML("brd", hasAI),
  ].join("");
}

/* ============================================================
   SRS — وثيقة مواصفات متطلبات النظام
   ============================================================ */

/** أولوية الاختبار في RTM — مشتقة من أولوية المتطلب، بلا اختراع. */
const TEST_PRIORITY: Record<string, string> = {
  critical: "مرتفعة",
  high: "مرتفعة",
  medium: "متوسطة",
  low: "منخفضة",
};

const NFR_TYPES = new Set(["غير وظيفي"]);
const isNonFunctional = (r: Requirement) => NFR_TYPES.has(r.type ?? "") || r.id.toUpperCase().startsWith("NFR");

function srsRequirementSection(r: Requirement, ctx: ReportContext, detailed: boolean): string {
  const criteria = ctx.acceptanceCriteria.filter((c) => c.requirementId === r.id);
  const questions = ctx.openQuestions.filter((q) => q.requirementId === r.id);
  const amb = r.analysis?.ambiguity;
  const parts: string[] = [];
  parts.push(`<p class="desc">${esc(r.description)}</p>`);
  if (detailed) {
    if (criteria.length)
      parts.push(`<h4>معايير القبول</h4><ul class="checks">${criteria.map((c) => `<li><span class="box">${c.done ? "☑" : "☐"}</span> ${esc(c.text)}</li>`).join("")}</ul>`);
    if (questions.length)
      parts.push(`<h4>الأسئلة المفتوحة</h4><ul>${questions.map((q) => `<li>${esc(q.text)}${q.answer ? ` <span class="muted">— أُجيب: ${esc(q.answer)}</span>` : ""}</li>`).join("")}</ul>`);
    if (amb && (amb.vagueWords.length || amb.missingInfo.length))
      parts.push(
        `<h4>نقاط الغموض</h4><ul>${[
          ...(amb.vagueWords.length ? [`كلمات غامضة: ${amb.vagueWords.join("، ")}`] : []),
          ...amb.missingInfo.map((m) => `معلومة ناقصة: ${m}`),
        ]
          .map((x) => `<li>${esc(x)}</li>`)
          .join("")}</ul>`
      );
  }
  return `
  <section class="req">
    <div class="req-head"><span class="req-id">${esc(r.id)}</span><h3>${esc(r.title)}</h3></div>
    <div class="req-meta">${reqBadges(r)}
      ${r.source ? `<span class="chip">المصدر: ${esc(r.source)}</span>` : ""}
      ${r.assignee ? `<span class="chip">المسؤول: ${esc(r.assignee)}</span>` : ""}
      <span class="chip mono">V${r.version ?? 1}</span>
    </div>
    ${parts.join("")}
  </section>`;
}

export function buildSRSBody(ctx: ReportContext, opts: DocOptions): string {
  const s = computeStats(ctx);
  const hasAI = ctx.requirements.some((r) => r.analysis != null || r.confidence != null);
  const p = ctx.project;
  // القيود (نوع «قيد») ليست وظائف: تُعرض في «قيود التصميم والتنفيذ» وRTM فقط،
  // ولا تدخل في المتطلبات الوظيفية ولا حالات الاستخدام ولا «أهم الوظائف».
  const frs = ctx.requirements.filter((r) => !isNonFunctional(r) && r.type !== "قيد");
  const nfrs = ctx.requirements.filter(isNonFunctional);
  const actors = collectStakeholders(ctx);

  /* 3) المقدمة */
  const intro = `
  <section class="block">
    <h2>١. المقدمة</h2>
    <h4>الغرض من الوثيقة</h4>
    <p class="desc">توثيق المتطلبات الوظيفية وغير الوظيفية لنظام «${esc(p?.name ?? "المشروع")}» لتكون مرجعًا لفرق التصميم والتطوير والاختبار.</p>
    <h4>نطاق النظام</h4>
    ${p?.description ? `<p class="desc">${esc(p.description)}</p>` : needs(NEEDS_INPUT)}
    <h4>الجمهور المستهدف</h4>
    <p class="desc">محللو الأعمال، فرق التطوير والاختبار، وأصحاب المصلحة المعنيون بالاعتماد.</p>
    <h4>التعريفات والمصطلحات</h4>
    ${needs(NOT_AVAILABLE)}
  </section>`;

  /* 4) نظرة عامة */
  const overview = `
  <section class="block">
    <h2>٢. نظرة عامة على النظام</h2>
    <h4>وصف النظام</h4>
    ${p?.description ? `<p class="desc">${esc(p.description)}</p>` : needs(NEEDS_INPUT)}
    <h4>المستخدمون المستهدفون</h4>
    ${p?.targetUsers ? `<p class="desc">${esc(p.targetUsers)}</p>` : ""}
    ${
      actors.length
        ? `<ul>${actors.map((a) => `<li>${esc(a.name)} — ${esc(a.role)}</li>`).join("")}</ul>`
        : p?.targetUsers ? "" : needs(NEEDS_INPUT)
    }
    <h4>أهم الوظائف</h4>
    ${frs.length ? `<ul>${frs.slice(0, 10).map((r) => `<li>${esc(r.title)}</li>`).join("")}</ul>` : needs(NOT_AVAILABLE)}
    <h4>حدود النظام</h4>
    ${needs(NEEDS_INPUT)}
    ${(ctx.modules ?? []).length ? `<h4>وحدات المشروع</h4>${modulesTableHTML(ctx, false)}` : ""}
  </section>`;


  /* بيئة التشغيل + قيود التصميم + الافتراضات التقنية — عبارات نقص صريحة */
  const environment = `
  <section class="block">
    <h2>٣. بيئة التشغيل</h2>
    <p class="todo">لم تُحدَّد بيئة التشغيل المستهدفة مثل المتصفحات، الأجهزة، أنظمة التشغيل، أو بيئات النشر بعد — يحتاج استكمال من صاحب المصلحة.</p>
  </section>`;

  const designConstraints = ctx.requirements.filter((r) => r.type === "قيد");
  const designConstraintsHTML = `
  <section class="block">
    <h2>٤. قيود التصميم والتنفيذ</h2>
    ${
      designConstraints.length
        ? `<ul>${designConstraints.map((r) => `<li><span class="mono">${esc(r.id)}</span> ${esc(r.title)} — ${esc(r.description)}</li>`).join("")}</ul>`
        : `<p class="todo">القيود التقنية الملزمة لفريق التطوير مثل التقنيات الإلزامية أو الأنظمة القائمة أو السياسات الأمنية غير متوفرة في بيانات المشروع الحالية.</p>`
    }
  </section>`;

  const techAssumptions = collectFromAnalyses(ctx, "assumptions");
  const techAssumptionsHTML = `
  <section class="block">
    <h2>٥. الافتراضات والاعتماديات التقنية</h2>
    ${
      techAssumptions.length
        ? `<ul>${techAssumptions.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>`
        : `<p class="todo">لم يتم تحديد افتراضات أو اعتماديات تقنية بعد.</p>`
    }
  </section>`;

  /* 5) FRs */
  // v1.9.9: عند وجود وحدات، تُرتب المتطلبات الوظيفية في أقسام فرعية لكل وحدة
  // (٦.١، ٦.٢، …) والمتطلبات بلا وحدة تحت «متطلبات عامة» — بلا اختراع وحدات.
  const mods = ctx.modules ?? [];
  const AR_NUM = ["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩", "١٠", "١١", "١٢", "١٣", "١٤", "١٥"];
  let frsBody: string;
  if (frs.length === 0) {
    frsBody = needs(NOT_AVAILABLE);
  } else if (mods.length === 0) {
    frsBody = frs.map((r) => srsRequirementSection(r, ctx, opts.detailed)).join("");
  } else {
    const groups: Array<{ title: string; desc: string | null; items: Requirement[] }> = [];
    for (const m of mods) {
      const items = frs.filter((r) => r.moduleId === m.id);
      if (items.length) groups.push({ title: m.name, desc: m.description, items });
    }
    const general = frs.filter((r) => !r.moduleId || !mods.some((m) => m.id === r.moduleId));
    if (general.length) groups.push({ title: "متطلبات عامة", desc: null, items: general });
    frsBody = groups
      .map(
        (g, i) => `
      <h3 class="fr-group">٦.${AR_NUM[i] ?? i + 1} ${esc(g.title)}</h3>
      ${g.desc ? `<p class="muted">${esc(g.desc)}</p>` : ""}
      ${g.items.map((r) => srsRequirementSection(r, ctx, opts.detailed)).join("")}`
      )
      .join("");
  }
  const frsHTML = `
  <section class="block">
    <h2>٦. المتطلبات الوظيفية (Functional Requirements)</h2>
    ${frsBody}
  </section>`;

  /* 6) NFRs */
  const nfrsHTML = `
  <section class="block">
    <h2>٧. المتطلبات غير الوظيفية (Non-Functional Requirements)</h2>
    ${
      nfrs.length
        ? nfrs.map((r) => srsRequirementSection(r, ctx, opts.detailed)).join("")
        : `<p class="todo">لم يتم توثيق متطلبات غير وظيفية كافية (الأداء، الأمان، سهولة الاستخدام، الاعتمادية، القابلية للتوسع، التوافق، الخصوصية)، ويوصى باستكمالها.</p>`
    }
  </section>`;

  /* 7) قواعد العمل */
  const rulesHTML = `
  <section class="block">
    <h2>٨. قواعد العمل (Business Rules)</h2>
    ${
      ctx.businessRules.length
        ? `<ul>${ctx.businessRules.map((b) => `<li><span class="mono">${esc(b.id)}</span> ${esc(b.text)} <span class="muted">— المصدر: ${esc(b.source)}</span></li>`).join("")}</ul>`
        : `<p class="todo">${esc(NOT_AVAILABLE)}</p>`
    }
  </section>`;

  /* 8) حالات الاستخدام — مستنتجة من المتطلبات وموسومة «مقترحة تحتاج مراجعة» */
  const useCases = `
  <section class="block">
    <h2>٩. حالات الاستخدام (Use Cases)</h2>
    <p class="muted">حالات استخدام مقترحة مشتقة من المتطلبات الموثقة — تحتاج مراجعة واعتماد:</p>
    ${frs.length === 0 ? `<p class="todo">${esc(NOT_AVAILABLE)}</p>` : ""}
    ${frs
      .slice(0, opts.detailed ? frs.length : 6)
      .map(
        (r) => `
      <section class="req">
        <div class="req-head"><span class="req-id">UC-${esc(r.id)}</span><h3>${esc(r.title)}</h3></div>
        <table class="cover-meta">
          <tr><td class="k">الممثل الأساسي</td><td>${esc(r.stakeholders[0] ?? r.assignee ?? "مستخدم النظام")}</td></tr>
          <tr><td class="k">الوصف</td><td>${esc(r.description)}</td></tr>
          <tr><td class="k">المسار الأساسي</td><td>ينفذ الممثل الوظيفة الموصوفة أعلاه ويتحقق النظام من النتيجة وفق معايير القبول${
            ctx.acceptanceCriteria.some((c) => c.requirementId === r.id) ? " الموثقة" : " (لم تُوثَّق بعد)"
          }.</td></tr>
          <tr><td class="k">الاستثناءات</td><td>${NOT_DEFINED}</td></tr>
        </table>
      </section>`
      )
      .join("")}
  </section>`;

  /* 9-11) بيانات/تكامل/صلاحيات — عبارات نقص صريحة */
  const gaps = `
  <section class="block">
    <h2>١٠. متطلبات البيانات</h2>
    <p class="todo">تحتاج إلى استكمال أثناء التحليل التفصيلي.</p>
    <h2>١١. متطلبات التكامل</h2>
    <p class="todo">لم يتم تحديد تكاملات خارجية في البيانات الحالية.</p>
    <h2>١٢. متطلبات الصلاحيات والأدوار</h2>
    ${
      actors.length
        ? `<p class="desc">الأدوار المرشحة من البيانات: ${esc(
            (actors.filter((a) => a.role !== "مسؤول عن متطلبات").length
              ? actors.filter((a) => a.role !== "مسؤول عن متطلبات")
              : actors
            ).map((a) => a.name).join("، ")
          )}.</p><p class="todo">تحتاج إلى تحديد الأدوار والصلاحيات المطلوبة لكل دور.</p>`
        : `<p class="todo">تحتاج إلى تحديد الأدوار والصلاحيات المطلوبة.</p>`
    }
  </section>`;

  /* 12) معايير القبول مجمعة */
  const criteriaHTML = `
  <section class="block">
    <h2>١٣. معايير القبول</h2>
    ${
      ctx.acceptanceCriteria.length
        ? ctx.requirements
            .map((r) => {
              const list = ctx.acceptanceCriteria.filter((c) => c.requirementId === r.id);
              return list.length
                ? `<h4><span class="mono">${esc(r.id)}</span> ${esc(r.title)}</h4><ul class="checks">${list
                    .map((c) => `<li><span class="box">${c.done ? "☑" : "☐"}</span> ${esc(c.text)}</li>`)
                    .join("")}</ul>`
                : "";
            })
            .join("")
        : `<p class="todo">${esc(NOT_AVAILABLE)}</p>`
    }
  </section>`;

  /* 13) مصفوفة التتبع RTM */
  const critIds = new Set(ctx.acceptanceCriteria.map((c) => c.requirementId));
  const rtm = `
  <section class="block">
    <h2>١٤. مصفوفة تتبع المتطلبات (RTM)</h2>
    <table class="req-table">
      <thead><tr><th>الرقم</th><th>النوع</th><th>الأولوية</th><th>الحالة</th><th>المصدر</th><th>معيار قبول</th><th>تم تحليلها</th><th>أولوية الاختبار</th></tr></thead>
      <tbody>
        ${ctx.requirements
          .map(
            (r) => `<tr>
          <td class="mono">${esc(r.id)}</td>
          <td>${r.type ? esc(r.type) : "—"}</td>
          <td>${badge(PRIORITY_AR[r.priority] ?? r.priority, PRIORITY_COLOR[r.priority] ?? "#64748b")}</td>
          <td>${badge(STATUS_AR[r.status] ?? r.status, STATUS_COLOR[r.status] ?? "#64748b")}</td>
          <td>${r.source ? esc(r.source) : "—"}</td>
          <td>${critIds.has(r.id) ? "نعم" : "لا"}</td>
          <td>${r.analysis != null || r.confidence != null ? "نعم" : "لا"}</td>
          <td>${TEST_PRIORITY[r.priority] ?? NOT_DEFINED}</td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table>
  </section>`;

  /* 14) المخاطر والملاحظات */
  const riskItems = collectFromAnalyses(ctx, "risks");
  if (s.needsInfo > 0) riskItems.push(`${arReqCount(s.needsInfo)} بحاجة لمعلومات إضافية قد تؤخر التصميم.`);
  if (s.withoutCriteria.length > 0) riskItems.push(`${arReqCount(s.withoutCriteria.length)} بلا معايير قبول — خطر على مرحلة الاختبار.`);
  if (s.notAnalyzed.length > 0) riskItems.push(`${arReqCount(s.notAnalyzed.length)} لم يُراجَع بعد لاكتشاف الغموض.`);
  const risksHTML = `
  <section class="block">
    <h2>١٥. المخاطر والملاحظات</h2>
    ${riskItems.length ? `<ul>${riskItems.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="desc">لا توجد مخاطر جوهرية مرصودة في البيانات الحالية.</p>`}
  </section>`;

  return [
    coverHTML("srs", ctx, opts),
    versionLogHTML("srs"),
    intro,
    overview,
    environment,
    designConstraintsHTML,
    techAssumptionsHTML,
    frsHTML,
    nfrsHTML,
    rulesHTML,
    useCases,
    gaps,
    criteriaHTML,
    rtm,
    risksHTML,
    changeControlHTML("١٦"),
    approvalsHTML(),
    closingHTML("srs", hasAI),
  ].join("");
}
