/* QA v2.2 — إعدادات النظام المركزية: defaults/parity، تحقق وسقوف، cache
 * وinvalidation، audit، وثائق (تطابق + إخفاء قسم)، تذكيرات، حدود الخطط. */
import { prisma } from "../src/lib/db";
import {
  getSystemSettings, invalidateSettingsCache, updateSystemSettings,
  resolvedAnalysisLimitFor, resolvedProjectLimitFor, assistantTaskBudget,
  reminderOffsets, buildWhatsappLink, SETTINGS_DEFAULTS, HARD_CEILINGS,
} from "../src/lib/settings";
import { buildBRDBody, buildSRSBody } from "../src/lib/documents";
import { SAMPLE_CONTEXT } from "../src/lib/sample-project";

const out: { n: string; ok: boolean; d?: string }[] = [];
const check = (n: string, ok: boolean, d = "") => { out.push({ n, ok, d }); console.log(`${ok ? "✅" : "❌"} ${n}${d ? ` — ${d}` : ""}`); };

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" }, select: { id: true } });
  const adminId = admin?.id ?? "qa-admin";

  // نظافة البداية: لا سجل إعدادات
  await prisma.systemSettings.deleteMany({});
  await prisma.settingsAuditLog.deleteMany({});
  invalidateSettingsCache();

  /* 1) Defaults — لا سجل = السلوك التاريخي حرفيًا */
  const s0 = await getSystemSettings();
  check("بلا سجل: اسم المنصة وثّق", s0.general.platformName === "وثّق");
  check("بلا سجل: واتساب تاريخي", s0.contact.whatsappNumber === "966531800106");
  check("بلا سجل: حد FREE = 3", (await resolvedAnalysisLimitFor("FREE")) === 3);
  check("بلا سجل: حد PRO = 50", (await resolvedAnalysisLimitFor("PRO")) === 50);
  check("بلا سجل: مشاريع FREE = 1", (await resolvedProjectLimitFor("FREE")) === 1);
  check("بلا سجل: ENTERPRISE غير محدود", (await resolvedAnalysisLimitFor("ENTERPRISE")) === null);
  const offs0 = await reminderOffsets();
  check("بلا سجل: التذكيرات 7/3/1/انتهاء", JSON.stringify(offs0.map(o => o.days)) === "[7,3,1,0]", JSON.stringify(offs0.map(o => o.days)));
  const budget0 = await assistantTaskBudget("improve");
  check("بلا سجل: مهمة improve مفعّلة بـ500", budget0.enabled && budget0.maxTokens === 500);

  /* 2) تحقق وسقوف */
  const bad1 = await updateSystemSettings({ section: "contact", values: { whatsappNumber: "abc!!" }, adminId });
  check("واتساب غير رقمي مرفوض", !bad1.ok && (bad1 as { error: string }).error === "invalid-whatsapp");

  const r1 = await updateSystemSettings({ section: "general", values: { platformName: "وثّق QA", logoUrl: "javascript:alert(1)", linkedinUrl: "https://linkedin.com/company/x" }, adminId });
  check("حفظ general ينجح", r1.ok);
  if (r1.ok) {
    check("javascript: URL يُرفض (يفرغ)", r1.settings.general.logoUrl === "");
    check("https URL يُقبل", r1.settings.general.linkedinUrl === "https://linkedin.com/company/x");
    check("اسم المنصة تغيّر", r1.settings.general.platformName === "وثّق QA");
  }

  const r2 = await updateSystemSettings({
    section: "plans",
    values: { FREE: { analysisLimit: -5 }, PRO: { analysisLimit: 999999, price: "199" } },
    adminId,
  });
  check("حفظ plans ينجح", r2.ok);
  if (r2.ok) {
    check("حد سالب لا يُقبل (يبقى الافتراضي)", r2.settings.plans.FREE.analysisLimit === 3, String(r2.settings.plans.FREE.analysisLimit));
    check(`تجاوز السقف يُقص إلى ${HARD_CEILINGS.analysisLimitMax}`, r2.settings.plans.PRO.analysisLimit === HARD_CEILINGS.analysisLimitMax);
    check("السعر المعروض تغيّر", r2.settings.plans.PRO.price === "199");
  }
  check("resolvedAnalysisLimitFor يعكس الجديد", (await resolvedAnalysisLimitFor("PRO")) === HARD_CEILINGS.analysisLimitMax);

  const badPlans = await updateSystemSettings({
    section: "plans",
    values: { FREE: { visible: false }, PRO: { visible: false }, ENTERPRISE: { visible: false } },
    adminId,
  });
  check("إخفاء كل الخطط مرفوض", !badPlans.ok && (badPlans as { error: string }).error === "all-plans-hidden");

  const r3 = await updateSystemSettings({
    section: "assistant",
    values: { tasks: { improve: { maxOutputTokens: 50000, enabled: true } } },
    adminId,
  });
  check("tokens فوق السقف تُقص", r3.ok && r3.settings.assistant.tasks.improve.maxOutputTokens === HARD_CEILINGS.assistantTaskTokensMax);
  const budget1 = await assistantTaskBudget("improve");
  check("الميزانية المحلولة ≤ السقف", budget1.maxTokens <= HARD_CEILINGS.assistantTaskTokensMax);

  /* 3) Cache + invalidation */
  invalidateSettingsCache();
  const a = await getSystemSettings();
  // تعديل مباشر في القاعدة (يتجاوز الخدمة) — الكاش يجب أن يخفيه
  await prisma.systemSettings.update({ where: { id: "singleton" }, data: { general: { ...(a.general as object), platformName: "خلف الكاش" } } });
  const b = await (async () => { const g = globalThis as { __wathiqSettingsCache?: unknown }; void g;
    // قراءة جديدة خارج نفس الـ React-cache scope: استدعاء المدمج مباشرة
    const { getSystemSettings: gs } = await import("../src/lib/settings/index");
    return gs();
  })();
  check("الكاش يمنع القراءة المباشرة من DB", b.general.platformName === "وثّق QA", b.general.platformName);
  invalidateSettingsCache();
  const c = await (await import("../src/lib/settings/index")).getSystemSettings();
  check("invalidate يجلب الجديد فورًا", c.general.platformName === "خلف الكاش", c.general.platformName);

  /* 4) Audit */
  const audits = await prisma.settingsAuditLog.findMany({ orderBy: { createdAt: "asc" } });
  check("سجل تدقيق لكل حفظ ناجح", audits.length >= 3, `rows=${audits.length}`);
  const gAudit = audits.find((x) => x.section === "GENERAL");
  const keys = (gAudit?.changedKeys as string[]) ?? [];
  check("changedKeys تحتوي platformName", keys.includes("platformName"), keys.join(","));
  const diffStr = JSON.stringify(gAudit?.diff ?? {});
  check("الـ diff مقصوص (لا قيم طويلة)", diffStr.length < 4000 && !diffStr.includes("sk-"), `len=${diffStr.length}`);

  /* 5) الوثائق: تطابق الافتراضي + إخفاء قسم */
  await prisma.systemSettings.deleteMany({});
  invalidateSettingsCache();
  const brdDefault = buildBRDBody(SAMPLE_CONTEXT, { detailed: true });
  const brdExplicit = buildBRDBody(SAMPLE_CONTEXT, { detailed: true, docSettings: SETTINGS_DEFAULTS.documents });
  check("BRD: بلا إعدادات = defaults حرفيًا", brdDefault === brdExplicit);
  check("BRD الافتراضي يحوي المخاطر", brdDefault.includes("١٠. المخاطر"));
  const noRisks = buildBRDBody(SAMPLE_CONTEXT, { detailed: true, docSettings: { ...SETTINGS_DEFAULTS.documents, brd: { ...SETTINGS_DEFAULTS.documents.brd, risks: false } } });
  check("إخفاء قسم المخاطر يعمل", !noRisks.includes("١٠. المخاطر"));
  const conf = buildBRDBody(SAMPLE_CONTEXT, { detailed: true, docSettings: { ...SETTINGS_DEFAULTS.documents, confidentialityText: "سري — للاستخدام الداخلي" } });
  check("نص السرية يظهر عند تعبئته", conf.includes("سري — للاستخدام الداخلي"));
  const srsDefault = buildSRSBody(SAMPLE_CONTEXT, { detailed: true });
  check("SRS الافتراضي يحوي RTM", srsDefault.includes("مصفوفة تتبع المتطلبات"));
  const noRtm = buildSRSBody(SAMPLE_CONTEXT, { detailed: true, docSettings: { ...SETTINGS_DEFAULTS.documents, srs: { ...SETTINGS_DEFAULTS.documents.srs, rtm: false } } });
  check("إخفاء RTM يعمل", !noRtm.includes("مصفوفة تتبع المتطلبات"));
  check("لا أسماء نماذج في الوثائق", !/(claude|anthropic|gpt|opus|sonnet)/i.test(brdDefault + srsDefault));

  /* 6) التذكيرات من الإعدادات */
  const r4 = await updateSystemSettings({ section: "notifications", values: { remind7Enabled: false, remind30Enabled: true }, adminId });
  check("حفظ notifications ينجح", r4.ok);
  const offs1 = await reminderOffsets();
  check("تعطيل 7 وتفعيل 30 ينعكس", JSON.stringify(offs1.map(o => o.days)) === "[30,3,1,0]", JSON.stringify(offs1.map(o => o.days)));

  /* 7) whatsapp builder */
  const link = buildWhatsappLink("+966 5X", "ترقية {plan}", { plan: "PRO" });
  check("رابط واتساب: أرقام فقط + استبدال المتغير", link.startsWith("https://wa.me/9665") && decodeURIComponent(link).includes("ترقية PRO"));

  /* 8) استعادة الافتراضي */
  const r5 = await updateSystemSettings({ section: "general", values: {}, adminId, resetToDefault: true });
  check("استعادة الافتراضي تعيد اسم المنصة", r5.ok && r5.settings.general.platformName === "وثّق");
  const resetAudit = await prisma.settingsAuditLog.findFirst({ where: { action: "SETTINGS_RESET_TO_DEFAULT" } });
  check("استعادة الافتراضي مسجلة في التدقيق", !!resetAudit);

  // تنظيف نهائي — لا نترك إعدادات QA
  await prisma.systemSettings.deleteMany({});
  await prisma.settingsAuditLog.deleteMany({});
  invalidateSettingsCache();

  const bad = out.filter((r) => !r.ok);
  console.log(`\n=== ${out.length - bad.length}/${out.length} passed ===`);
  await prisma.$disconnect();
  if (bad.length) { console.log("FAILED:", bad.map((f) => f.n).join(" | ")); process.exit(1); }
}
main().catch(async (e) => { console.error("FATAL", e); await prisma.$disconnect(); process.exit(1); });
