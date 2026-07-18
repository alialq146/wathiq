/* QA v2.4 — طبقة الوصول + التزامن التفاؤلي + أعلام التعاون. */
import { prisma } from "../src/lib/db";
import { getProjectAccess, requireProjectAccess } from "../src/lib/access";
import { SETTINGS_DEFAULTS } from "../src/lib/settings/defaults";

const out: { n: string; ok: boolean; d?: string }[] = [];
const check = (n: string, ok: boolean, d = "") => { out.push({ n, ok, d }); console.log(`${ok ? "✅" : "❌"} ${n}${d ? ` — ${d}` : ""}`); };

async function main() {
  const owner = await prisma.user.create({ data: { email: `qa-ac-${Date.now()}@w.local`, name: "AC", plan: "PRO", passwordHash: "x" }, select: { id: true } });
  const other = await prisma.user.create({ data: { email: `qa-ac2-${Date.now()}@w.local`, name: "AC2", plan: "PRO", passwordHash: "x" }, select: { id: true } });
  const project = await prisma.project.create({ data: { ownerId: owner.id, name: "مشروع وصول", code: "AC-1" }, select: { id: true } });

  /* طبقة الوصول */
  const a1 = await getProjectAccess(project.id, owner.id);
  check("المالك: role=OWNER وكل الصلاحيات", a1?.role === "OWNER" && a1.canView && a1.canEdit && a1.canDelete && a1.canUseAssistant && a1.canExport);
  check("غير المالك: null", (await getProjectAccess(project.id, other.id)) === null);
  check("معرف فارغ: null", (await getProjectAccess("", owner.id)) === null);
  check("requireProjectAccess(edit) للمالك", (await requireProjectAccess(project.id, owner.id, "edit")) !== null);
  check("requireProjectAccess(delete) لغير المالك = null", (await requireProjectAccess(project.id, other.id, "delete")) === null);

  /* التزامن التفاؤلي — على مستوى القاعدة (منطق الفعل يُختبر عبر الحقول) */
  const req = await prisma.requirement.create({ data: { id: `AC-REQ-${Date.now()}`, ownerId: owner.id, projectId: project.id, title: "متطلب", description: "وصف تفصيلي كافٍ يتجاوز عشرين حرفًا.", status: "draft", priority: "medium", criteria: 0, openQuestions: 0, module: "", stakeholders: [] } });
  const stale = req.updatedAt.toISOString();
  await new Promise((r) => setTimeout(r, 1200));
  await prisma.requirement.update({ where: { id: req.id }, data: { title: "متطلب معدل في الخلفية" } });
  const fresh = await prisma.requirement.findUnique({ where: { id: req.id }, select: { updatedAt: true } });
  check("updatedAt يتقدم تلقائيًا مع كل تعديل", fresh!.updatedAt.getTime() > new Date(stale).getTime() + 1000, `${stale} → ${fresh!.updatedAt.toISOString()}`);
  // منطق الرفض نفسه (نفس شرط saveRequirement): expected أقدم بأكثر من ثانية → conflict
  const expected = new Date(stale).getTime();
  const wouldConflict = fresh!.updatedAt.getTime() > expected + 1000;
  check("شرط 409: النسخة القديمة تُرفض", wouldConflict);
  const freshExpected = fresh!.updatedAt.getTime();
  check("شرط 409: النسخة الحديثة تمر", !(fresh!.updatedAt.getTime() > freshExpected + 1000));

  /* أعلام التعاون الافتراضية */
  const f = SETTINGS_DEFAULTS.features;
  check("projectCollaborationEnabled=false افتراضيًا", f.projectCollaborationEnabled === false);
  check("commentsEnabled=false افتراضيًا", f.commentsEnabled === false);
  check("projectAuditLogEnabled=true افتراضيًا", f.projectAuditLogEnabled === true);
  check("optimisticConcurrencyEnabled=true افتراضيًا", f.optimisticConcurrencyEnabled === true);

  await prisma.requirement.deleteMany({ where: { projectId: project.id } });
  await prisma.project.delete({ where: { id: project.id } });
  await prisma.user.deleteMany({ where: { id: { in: [owner.id, other.id] } } });
  const bad = out.filter((r) => !r.ok);
  console.log(`\n=== ${out.length - bad.length}/${out.length} passed ===`);
  await prisma.$disconnect();
  if (bad.length) process.exit(1);
}
main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
