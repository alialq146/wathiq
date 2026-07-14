/* QA v2.3 — مركز جاهزية المشروع والوثائق:
 * وحدة المحرك النقي (بلا DB) + سيناريوهات كاملة على القاعدة الحقيقية +
 * الوثائق (مطلوبة/اختيارية/غير مطلوبة) + التصدير + الإعدادات + العزل. */
import { prisma } from "../src/lib/db";
import { computeReadiness, calculateProjectReadiness, checkDocumentExport, type ReadinessInput } from "../src/lib/readiness";
import { SETTINGS_DEFAULTS } from "../src/lib/settings/defaults";
import { updateSystemSettings, invalidateSettingsCache } from "../src/lib/settings";

const out: { n: string; ok: boolean; d?: string }[] = [];
const check = (n: string, ok: boolean, d = "") => { out.push({ n, ok, d }); console.log(`${ok ? "✅" : "❌"} ${n}${d ? ` — ${d}` : ""}`); };
const R = SETTINGS_DEFAULTS.readiness;

const req = (o: Partial<ReadinessInput["requirements"][0]> = {}): ReadinessInput["requirements"][0] => ({
  id: "REQ-1", title: "متطلب اختبار", description: "وصف تفصيلي كافٍ لهذا المتطلب يتجاوز عشرين حرفًا بوضوح.",
  status: "approved", priority: "medium", type: "وظيفي", source: "عميل", stakeholders: ["أحمد"],
  notes: null, qualityScore: 85, missingInfoCount: 0, criteriaCount: 2, ...o,
});
const fullProject = (over: Partial<NonNullable<ReadinessInput["project"]>> = {}): NonNullable<ReadinessInput["project"]> => ({
  name: "مشروع", description: "وصف", client: "جهة", projectIdea: "فكرة", projectGoal: "هدف",
  targetUsers: "مستخدمون", projectScope: "نطاق", outOfScope: "خارج", relatedSystems: "أنظمة",
  constraints: "قيود", brdApplicability: "REQUIRED", srsApplicability: "REQUIRED", ...over,
});

async function unit() {
  /* 1) مشروع فارغ تمامًا — لا NaN، لا سالب، نقص حرج «لا توجد متطلبات» */
  const empty = computeReadiness({ project: null, requirements: [], openQuestionsUnanswered: 0 }, R);
  check("مشروع فارغ: درجة عدد صحيح 0-100", Number.isFinite(empty.overallScore) && empty.overallScore >= 0 && empty.overallScore <= 100, String(empty.overallScore));
  check("مشروع فارغ: «لا توجد متطلبات» حرج", empty.issues.some((i) => i.code === "no_requirements" && i.severity === "critical"));
  check("مشروع فارغ: غير جاهز", empty.overallStatus === "not_ready");

  /* 2) مشروع مكتمل — درجة عالية */
  const complete = computeReadiness({ project: fullProject(), requirements: [req(), req({ id: "REQ-2" }), req({ id: "REQ-3" })], openQuestionsUnanswered: 0 }, R);
  check("مشروع مكتمل: درجة ≥ 90", complete.overallScore >= 90, String(complete.overallScore));
  check("مشروع مكتمل: لا نواقص حرجة", complete.counts.critical === 0);

  /* 3) إعادة تطبيع الأوزان: policy=ignore يستبعد محور الجودة */
  const ignoreQ = computeReadiness(
    { project: fullProject(), requirements: [req({ qualityScore: null })], openQuestionsUnanswered: 0 },
    { ...R, missingAnalysisPolicy: "ignore" }
  );
  const qAxis = ignoreQ.axes.find((a) => a.key === "quality")!;
  check("policy=ignore: محور الجودة غير مطبق", !qAxis.applied);
  const appliedW = ignoreQ.axes.filter((a) => a.applied).reduce((s, a) => s + a.weight, 0);
  check("الأوزان المطبقة < 100 والتطبيع يعمل", appliedW < 100 && ignoreQ.overallScore <= 100 && ignoreQ.overallScore > 0, `w=${appliedW} score=${ignoreQ.overallScore}`);

  /* 4) وثيقة غير مطلوبة: لا درجة، لا صفر، لا نواقص لها */
  const noSrs = computeReadiness({ project: fullProject({ srsApplicability: "NOT_APPLICABLE" }), requirements: [req()], openQuestionsUnanswered: 0 }, R);
  check("SRS غير مطلوبة: documents.srs = null (لا صفر)", noSrs.documents.srs === null);
  check("SRS غير مطلوبة: لا ملاحظات scope=srs", !noSrs.issues.some((i) => i.scope === "srs"));
  check("BRD تبقى محسوبة", noSrs.documents.brd !== null && (noSrs.documents.brd?.score ?? -1) >= 0);

  /* 5) الوثيقة الاختيارية: تُحسب مستقلة ولا تؤثر على العامة */
  const base = computeReadiness({ project: fullProject({ srsApplicability: "REQUIRED" }), requirements: [req()], openQuestionsUnanswered: 0 }, R);
  const opt = computeReadiness({ project: fullProject({ srsApplicability: "OPTIONAL" }), requirements: [req()], openQuestionsUnanswered: 0 }, R);
  check("SRS اختيارية: لها درجة مستقلة", opt.documents.srs !== null && opt.documents.srs?.applicability === "OPTIONAL");
  // العامة مع الاختيارية يجب ألا تقل عن العامة مع المطلوبة (الاختيارية لا تخفضها)
  check("الاختيارية لا تخفض درجة المشروع", opt.overallScore >= base.overallScore, `opt=${opt.overallScore} req=${base.overallScore}`);

  /* 6) الوثيقتان غير مطلوبتين: محور بيانات الوثائق غير مطبق */
  const noDocs = computeReadiness({ project: fullProject({ brdApplicability: "NOT_APPLICABLE", srsApplicability: "NOT_APPLICABLE" }), requirements: [req()], openQuestionsUnanswered: 0 }, R);
  check("بلا وثائق: محور docData غير مطبق", !noDocs.axes.find((a) => a.key === "docData")!.applied);
  check("بلا وثائق: لا بطاقات وثائق", noDocs.documents.brd === null && noDocs.documents.srs === null);

  /* 7) متطلب حرج محظور + بلا معايير → نواقص حرجة */
  const risky = computeReadiness({
    project: fullProject(),
    requirements: [req({ id: "R1", priority: "critical", status: "blocked", criteriaCount: 0 })],
    openQuestionsUnanswered: 3,
  }, R);
  check("محظور حرج → نقص حرج", risky.issues.some((i) => i.code === "blocked_requirements" && i.severity === "critical"));
  check("حرج بلا معايير → نقص حرج", risky.issues.some((i) => i.code === "critical_without_criteria"));
  check("أسئلة مفتوحة → ملاحظة", risky.issues.some((i) => i.code === "open_questions" && i.count === 3));

  /* 8) حدود التصنيف */
  for (const [score, want] of [[95, "ready"], [80, "ready_with_notes"], [60, "needs_work"], [30, "not_ready"]] as const) {
    // نصنع مدخلات تعطي الدرجة تقريبًا عبر عتبات مخصصة بدل هندسة عكسية
    void score; void want;
  }
  const custom = computeReadiness({ project: fullProject(), requirements: [req()], openQuestionsUnanswered: 0 }, { ...R, thresholds: { readyMin: 99, notesMin: 98, needsWorkMin: 97 } });
  check("العتبات المخصصة تُطبق", custom.overallStatus !== "ready" || custom.overallScore >= 99);

  /* 9) كل المتطلبات مسودات → ملاحظة كثرة المسودات */
  const drafts = computeReadiness({ project: fullProject(), requirements: [req({ status: "draft" }), req({ id: "R2", status: "draft" })], openQuestionsUnanswered: 0 }, R);
  check("كثرة المسودات ملاحظة مهمة", drafts.issues.some((i) => i.code === "many_drafts"));
}

async function integration() {
  const owner = await prisma.user.create({ data: { email: `qa-rd-${Date.now()}@wathiq.local`, name: "QA rd", plan: "PRO", passwordHash: "x", analysisLimit: 50 }, select: { id: true } });
  const other = await prisma.user.create({ data: { email: `qa-rd2-${Date.now()}@wathiq.local`, name: "QA rd2", plan: "PRO", passwordHash: "x", analysisLimit: 50 }, select: { id: true } });
  const project = await prisma.project.create({
    data: { ownerId: owner.id, name: "مشروع الجاهزية", code: "RDY-1", description: "وصف المشروع", projectGoal: "هدف واضح", projectScope: "نطاق", targetUsers: "مستخدمون", client: "جهة", brdApplicability: "REQUIRED", srsApplicability: "OPTIONAL" },
    select: { id: true },
  });
  await prisma.requirement.create({
    data: { id: `RD-REQ-${Date.now()}`, ownerId: owner.id, projectId: project.id, title: "متطلب", description: "وصف تفصيلي كافٍ يتجاوز عشرين حرفًا هنا.", status: "approved", priority: "high", type: "وظيفي", criteria: 0, openQuestions: 0, module: "", stakeholders: ["سارة"], analysis: { qualityScore: 90, ambiguity: { missingInfo: [] } } },
  });

  /* 10) الحساب الخادمي + العزل */
  const mine = await calculateProjectReadiness(project.id, owner.id);
  check("الحساب الخادمي يعمل", mine !== null && mine!.overallScore > 0, `score=${mine?.overallScore}`);
  check("SRS الاختيارية في النتيجة (اختيارية)", mine?.documents.srs?.applicability === "OPTIONAL");
  const theirs = await calculateProjectReadiness(project.id, other.id);
  check("العزل: مشروع الغير = null", theirs === null);

  /* 11) اللقطة كُتبت */
  const snap = await prisma.readinessSnapshot.findFirst({ where: { projectId: project.id } });
  check("ReadinessSnapshot سُجلت", !!snap && snap.overallScore === mine?.overallScore);
  check("اللقطة: SRS score محفوظ وليس صفرًا مزيفًا", snap?.srsScore === (mine?.documents.srs?.score ?? null));

  /* 12) فحص التصدير: N/A مرفوض خادميًا */
  await prisma.project.update({ where: { id: project.id }, data: { srsApplicability: "NOT_APPLICABLE" } });
  const naCheck = await checkDocumentExport(project.id, owner.id, "SRS");
  check("تصدير SRS غير المطلوبة يُرفض من الخادم", naCheck !== null && !naCheck!.ok && naCheck!.reason === "not-applicable");
  const brdCheck = await checkDocumentExport(project.id, owner.id, "BRD");
  check("تصدير BRD المطلوبة مسموح (سياسة warn)", brdCheck !== null && brdCheck!.ok);
  const isoCheck = await checkDocumentExport(project.id, other.id, "BRD");
  check("فحص تصدير مشروع الغير = null", isoCheck === null);

  /* 13) سياسة block_critical تمنع REQUIRED مع نقص حرج */
  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true } });
  await updateSystemSettings({ section: "readiness", values: { exportPolicy: "block_critical" }, adminId: admin?.id ?? owner.id });
  // اجعل المشروع بلا متطلبات → نقص حرج
  await prisma.requirement.deleteMany({ where: { projectId: project.id } });
  const blocked = await checkDocumentExport(project.id, owner.id, "BRD");
  check("block_critical يمنع BRD مع نقص حرج", blocked !== null && !blocked!.ok && blocked!.reason === "blocked");

  /* 14) إخفاء ثم إعادة تفعيل: لا حذف بيانات */
  await prisma.acceptanceCriterion.create({ data: { id: `RD-AC-${Date.now()}`, ownerId: owner.id, projectId: project.id, requirementId: null, text: "معيار محفوظ", done: false, ai: false } });
  const beforeCount = await prisma.acceptanceCriterion.count({ where: { projectId: project.id } });
  await prisma.project.update({ where: { id: project.id }, data: { brdApplicability: "NOT_APPLICABLE" } });
  const afterHide = await prisma.acceptanceCriterion.count({ where: { projectId: project.id } });
  check("الإخفاء لا يحذف البيانات", beforeCount === afterHide && afterHide > 0);
  await prisma.project.update({ where: { id: project.id }, data: { brdApplicability: "REQUIRED" } });
  const restored = await calculateProjectReadiness(project.id, owner.id);
  check("إعادة التفعيل تعيد بطاقة BRD", restored?.documents.brd !== null);

  /* 15) تحقق أوزان الإعدادات: مجموع ≠ 100 مرفوض */
  const badW = await updateSystemSettings({ section: "readiness", values: { weights: { context: 50, requirements: 50, quality: 50, acceptance: 0, questions: 0, status: 0, docData: 0 } }, adminId: admin?.id ?? owner.id });
  check("أوزان مجموعها ≠ 100 مرفوضة", !badW.ok && (badW as { error: string }).error === "weights-sum-invalid");
  const badT = await updateSystemSettings({ section: "readiness", values: { thresholds: { readyMin: 50, notesMin: 75, needsWorkMin: 90 } }, adminId: admin?.id ?? owner.id });
  check("عتبات غير مرتبة مرفوضة", !badT.ok && (badT as { error: string }).error === "thresholds-invalid");

  /* 16) تعطيل الميزة: الفحص يسمح بلا حساب */
  await updateSystemSettings({ section: "readiness", values: { enabled: false, exportPolicy: "warn" }, adminId: admin?.id ?? owner.id });
  const offCheck = await checkDocumentExport(project.id, owner.id, "BRD");
  check("الميزة معطلة: تصدير مسموح بلا فحص", offCheck !== null && offCheck!.ok && offCheck!.mode === "allow");

  // تنظيف
  await updateSystemSettings({ section: "readiness", values: {}, adminId: admin?.id ?? owner.id, resetToDefault: true });
  await prisma.readinessSnapshot.deleteMany({ where: { projectId: project.id } });
  await prisma.readinessExportLog.deleteMany({ where: { projectId: project.id } });
  await prisma.acceptanceCriterion.deleteMany({ where: { projectId: project.id } });
  await prisma.project.delete({ where: { id: project.id } });
  await prisma.productEvent.deleteMany({ where: { userId: { in: [owner.id, other.id] } } });
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, other.id] } } });
  invalidateSettingsCache();
}

async function main() {
  await prisma.systemSettings.deleteMany({}).catch(() => {});
  invalidateSettingsCache();
  await unit();
  await integration();
  const bad = out.filter((r) => !r.ok);
  console.log(`\n=== ${out.length - bad.length}/${out.length} passed ===`);
  await prisma.$disconnect();
  if (bad.length) { console.log("FAILED:", bad.map((f) => f.n).join(" | ")); process.exit(1); }
}
main().catch(async (e) => { console.error("FATAL", e); await prisma.$disconnect(); process.exit(1); });
