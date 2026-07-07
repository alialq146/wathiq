#!/usr/bin/env node
/**
 * إنشاء حساب Demo + مشروع «منصة إدارة طلبات العملاء» (CUST-OPS) كامل:
 * سياق مشروع + ٥ وحدات + ٢٠ متطلبًا (بين واضح وناقص عمدًا) + معايير قبول
 * وأسئلة مفتوحة يدوية لبعض المتطلبات — **بدون أي استدعاء للذكاء الاصطناعي**.
 *
 * يُشغَّل يدويًا فقط (لا يعمل تلقائيًا في أي بيئة):
 *   node scripts/seed-demo-user.mjs --yes            → إنشاء (يرفض لو الحساب موجود)
 *   node scripts/seed-demo-user.mjs --yes --reset    → حذف بيانات الحساب وإعادة إنشائها
 *
 * يعمل على DATABASE_URL الحالية — راجع المضيف المطبوع قبل التأكيد.
 * كلمة المرور تُخزَّن بنفس تجزئة التسجيل (scrypt) — لا نص خام في القاعدة.
 */
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "node:crypto";

const EMAIL = "demo@wathiq.local";
const PASSWORD = "WathiqDemo#2026"; // بيانات عرض داخلية — ليست حسابًا حقيقيًا
const NAME = "مستخدم تجريبي";

const yes = process.argv.includes("--yes");
const reset = process.argv.includes("--reset");
const dbHost = (process.env.DATABASE_URL ?? "").replace(/^.*@/, "").replace(/\/.*$/, "") || "(غير محددة)";

if (!yes) {
  console.log(`سيُنشأ حساب Demo على قاعدة: ${dbHost}`);
  console.log("أعد التشغيل مع --yes للتأكيد (و --reset لإعادة الإنشاء من الصفر).");
  process.exit(1);
}

// نفس صيغة src/lib/password.ts — حتى يعمل تسجيل الدخول العادي.
function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString("hex")}$${hash.toString("hex")}`;
}

const prisma = new PrismaClient();

const CONTEXT = {
  projectIdea:
    "منصة لإدارة طلبات العملاء من لحظة استقبال الطلب وحتى إغلاقه، مع تنظيم بيانات العملاء، متابعة الحالة، وإرسال الإشعارات المناسبة.",
  projectGoal:
    "تقليل العمل اليدوي في معالجة الطلبات، تحسين سرعة الاستجابة، رفع جودة البيانات، وتوفير تقارير تشغيلية للإدارة.",
  targetUsers: "موظف العمليات، مشرف العمليات، مدير النظام، فريق الدعم، العميل النهائي.",
  projectScope:
    "استقبال الطلبات، تسجيل بيانات العملاء، مراجعة الطلبات، إدارة المستخدمين، إرسال الإشعارات، متابعة الحالات، وإصدار التقارير.",
  outOfScope: "الدفع الإلكتروني، تطبيق الجوال، التكامل مع أنظمة خارجية غير محددة، وإدارة المخزون.",
  relatedSystems: "البريد الإلكتروني، واتساب، لوحة تحكم داخلية، نظام CRM مستقبلي.",
  constraints: "يجب حماية بيانات العملاء، تقييد الوصول حسب الصلاحيات، وعدم إرسال بيانات حساسة عبر قنوات غير معتمدة.",
};

const MODULES = [
  { key: "users", name: "إدارة المستخدمين", description: "تختص هذه الوحدة بإنشاء المستخدمين، تعديل بياناتهم، إدارة حالات الحساب، وربط المستخدمين بالأدوار." },
  { key: "orders", name: "الطلبات", description: "تختص هذه الوحدة باستقبال طلبات العملاء، تسجيل البيانات، تحديث الحالة، ومتابعة مسار الطلب." },
  { key: "notify", name: "الإشعارات", description: "تختص هذه الوحدة بإرسال تنبيهات للعميل أو فريق العمليات عند تغير حالة الطلب أو الحاجة إلى إجراء." },
  { key: "reports", name: "التقارير", description: "تختص هذه الوحدة بعرض مؤشرات تشغيلية وتصدير تقارير عن الطلبات والأداء." },
  { key: "perms", name: "الصلاحيات", description: "تختص هذه الوحدة بتحديد ما يمكن لكل دور الوصول إليه أو تنفيذه داخل النظام." },
];

// عمدًا: مزيج من متطلبات واضحة قابلة للاختبار وأخرى ناقصة ليُظهر مساعد وثّق قيمته.
const REQS = [
  { id: "CUST-REQ-001", mod: "users", title: "إنشاء مستخدم جديد", type: "وظيفي", priority: "high", status: "review", source: "ورشة عمل", stakeholders: ["مشرف العمليات"],
    description: "يجب أن يتيح النظام لمشرف العمليات إنشاء مستخدم جديد بإدخال الاسم، البريد الإلكتروني، رقم الجوال، والدور الوظيفي." },
  { id: "CUST-REQ-002", mod: "users", title: "تعطيل حساب مستخدم", type: "وظيفي", priority: "high", status: "review", source: "ورشة عمل", stakeholders: ["مدير النظام"],
    description: "يجب أن يتيح النظام لمدير النظام تعطيل حساب مستخدم مع منع تسجيل الدخول لاحقًا والاحتفاظ بسجل التعطيل." },
  { id: "CUST-REQ-003", mod: "users", title: "إرسال بيانات الدخول", type: "وظيفي", priority: "medium", status: "needs_info", source: "اجتماع", stakeholders: ["مشرف العمليات"],
    description: "يجب أن يرسل النظام بيانات الدخول للمستخدم بعد إنشاء الحساب عبر قناة يتم تحديدها لاحقًا.",
    notes: "القناة (بريد/واتساب/رسالة نصية) لم تُحسم بعد — بانتظار قرار العمليات." },
  { id: "CUST-REQ-004", mod: "orders", title: "إنشاء طلب عميل", type: "وظيفي", priority: "high", status: "approved", source: "ورشة عمل", stakeholders: ["موظف العمليات"],
    description: "يجب أن يتيح النظام لموظف العمليات إنشاء طلب جديد يتضمن بيانات العميل الأساسية ونوع الخدمة المطلوبة." },
  { id: "CUST-REQ-005", mod: "orders", title: "تحديث حالة الطلب", type: "وظيفي", priority: "high", status: "approved", source: "ورشة عمل", stakeholders: ["موظف العمليات", "مشرف العمليات"],
    description: "يجب أن يتيح النظام تحديث حالة الطلب بين: جديد، قيد المراجعة، بانتظار معلومات، مكتمل، مرفوض." },
  { id: "CUST-REQ-006", mod: "orders", title: "البحث عن الطلبات", type: "وظيفي", priority: "medium", status: "draft", source: "اجتماع", stakeholders: ["موظف العمليات"],
    description: "يجب أن يتيح النظام البحث عن الطلبات باستخدام رقم الطلب، اسم العميل، رقم الجوال، أو حالة الطلب." },
  { id: "CUST-REQ-007", mod: "orders", title: "التحقق من اكتمال البيانات", type: "قاعدة عمل", priority: "high", status: "review", source: "وثيقة", stakeholders: ["مشرف العمليات"],
    description: "يجب أن ينبه النظام موظف العمليات عند وجود بيانات ناقصة في الطلب قبل تحويله إلى قيد المراجعة." },
  { id: "CUST-REQ-008", mod: "notify", title: "إشعار تغير حالة الطلب", type: "وظيفي", priority: "medium", status: "needs_info", source: "اجتماع", stakeholders: ["فريق الدعم"],
    description: "يجب أن يرسل النظام إشعارًا للعميل عند تغير حالة الطلب.",
    notes: "غموض مقصود: القناة والمهلة الزمنية والحالات المشمولة غير محددة." },
  { id: "CUST-REQ-009", mod: "notify", title: "إشعار فريق العمليات بالطلبات المعلقة", type: "وظيفي", priority: "medium", status: "draft", source: "بريد", stakeholders: ["مشرف العمليات"],
    description: "يجب أن يرسل النظام تنبيهًا لفريق العمليات عند وجود طلبات معلقة لأكثر من مدة يتم تحديدها لاحقًا." },
  { id: "CUST-REQ-010", mod: "reports", title: "تقرير الطلبات حسب الحالة", type: "وظيفي", priority: "medium", status: "draft", source: "اجتماع", stakeholders: ["مدير النظام"],
    description: "يجب أن يتيح النظام عرض تقرير يوضح عدد الطلبات حسب الحالة خلال فترة زمنية يحددها المستخدم." },
  { id: "CUST-REQ-011", mod: "reports", title: "تصدير التقرير", type: "وظيفي", priority: "low", status: "draft", source: "اجتماع", stakeholders: [],
    description: "يجب أن يتيح النظام تصدير تقرير الطلبات بصيغة PDF أو Word." },
  { id: "CUST-REQ-012", mod: "reports", title: "مؤشرات الأداء التشغيلية", type: "وظيفي", priority: "medium", status: "draft", source: "ورشة عمل", stakeholders: ["مدير النظام"],
    description: "يجب أن يعرض النظام مؤشرات أداء مثل عدد الطلبات المكتملة، الطلبات المتأخرة، ومتوسط زمن المعالجة." },
  { id: "CUST-REQ-013", mod: "perms", title: "الأدوار والصلاحيات", type: "وظيفي", priority: "high", status: "review", source: "وثيقة", stakeholders: ["مدير النظام"],
    description: "يجب أن يتيح النظام تحديد صلاحيات مختلفة لكل دور مثل موظف العمليات، مشرف العمليات، ومدير النظام." },
  { id: "CUST-REQ-014", mod: "perms", title: "منع الوصول غير المصرح", type: "غير وظيفي", priority: "high", status: "review", source: "وثيقة", stakeholders: ["مدير النظام"],
    description: "يجب أن يمنع النظام أي مستخدم من الوصول إلى طلبات أو تقارير لا يملك صلاحية عرضها." },
  { id: "CUST-REQ-015", mod: null, title: "سرعة تحميل لوحة التحكم", type: "غير وظيفي", priority: "medium", status: "draft", source: "وثيقة", stakeholders: ["فريق الدعم"],
    description: "يجب أن تعرض لوحة التحكم البيانات الأساسية خلال مدة لا تتجاوز 3 ثوانٍ في الظروف التشغيلية العادية." },
  { id: "CUST-REQ-016", mod: null, title: "سجل العمليات", type: "غير وظيفي", priority: "high", status: "approved", source: "وثيقة", stakeholders: ["مدير النظام"],
    description: "يجب أن يحتفظ النظام بسجل للعمليات المهمة مثل إنشاء الطلب، تحديث الحالة، تعطيل المستخدم، وتصدير التقارير." },
  { id: "CUST-REQ-017", mod: null, title: "حماية بيانات العملاء", type: "غير وظيفي", priority: "high", status: "approved", source: "وثيقة", stakeholders: ["مدير النظام"],
    description: "يجب أن يحمي النظام بيانات العملاء من الوصول غير المصرح وأن يطبق ضوابط صلاحيات مناسبة." },
  { id: "CUST-REQ-018", mod: null, title: "النسخ الاحتياطي والاستعادة", type: "غير وظيفي", priority: "medium", status: "needs_info", source: "بريد", stakeholders: ["مدير النظام"],
    description: "يجب أن تكون بيانات النظام قابلة للاستعادة في حال حدوث خلل تشغيلي.",
    notes: "نقص مقصود: أهداف RPO/RTO (نقطة الاستعادة وزمنها) غير محددة بعد." },
  { id: "CUST-REQ-019", mod: "orders", title: "إرفاق مستندات بالطلب", type: "وظيفي", priority: "medium", status: "draft", source: "اجتماع", stakeholders: ["موظف العمليات"],
    description: "يجب أن يتيح النظام لموظف العمليات إرفاق مستندات داعمة بالطلب أثناء الإنشاء أو المراجعة.",
    notes: "أنواع الملفات المسموحة والحد الأقصى للحجم لم تُحدد بعد." },
  { id: "CUST-REQ-020", mod: "users", title: "إعادة تعيين كلمة مرور مستخدم", type: "وظيفي", priority: "medium", status: "draft", source: "ورشة عمل", stakeholders: ["مشرف العمليات"],
    description: "يجب أن يتيح النظام لمشرف العمليات إعادة تعيين كلمة مرور مستخدم مع إجبار المستخدم على تغييرها عند أول تسجيل دخول." },
];

// معايير قبول وأسئلة يدوية (ai:false) لبعض المتطلبات — تبقى البقية بلا تحليل
// عمدًا حتى يظهر دور مساعد وثّق عند العرض الحي.
const CRITERIA = [
  { req: "CUST-REQ-001", text: "لا يمكن حفظ مستخدم جديد دون الاسم والبريد الإلكتروني ورقم الجوال والدور." },
  { req: "CUST-REQ-001", text: "يظهر المستخدم الجديد في قائمة المستخدمين فور الحفظ بحالة «نشط»." },
  { req: "CUST-REQ-004", text: "يُنشأ رقم طلب فريد تلقائيًا ويظهر لموظف العمليات فور الحفظ." },
  { req: "CUST-REQ-004", text: "لا يُقبل إنشاء طلب دون بيانات العميل الأساسية ونوع الخدمة." },
  { req: "CUST-REQ-005", text: "يتحقق عندما تتغير حالة الطلب إلى إحدى الحالات الخمس المعتمدة فقط، مع تسجيل الوقت والمنفذ." },
  { req: "CUST-REQ-014", text: "محاولة وصول غير مصرح تُرفض وتُسجَّل في سجل العمليات." },
];
const QUESTIONS = [
  { req: "CUST-REQ-003", to: "مشرف العمليات", text: "ما القناة المعتمدة لإرسال بيانات الدخول؟ (بريد إلكتروني، واتساب، رسالة نصية)" },
  { req: "CUST-REQ-008", to: "فريق الدعم", text: "ما الحالات التي تستوجب إشعار العميل؟ وما المهلة القصوى لإرسال الإشعار بعد التغيير؟" },
  { req: "CUST-REQ-009", to: "مشرف العمليات", text: "ما المدة التي يُعد بعدها الطلب «معلقًا» وتستوجب تنبيه الفريق؟" },
  { req: "CUST-REQ-018", to: "مدير النظام", text: "ما هدفا نقطة الاستعادة (RPO) وزمن الاستعادة (RTO) المقبولان تشغيليًا؟" },
];

try {
  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing && !reset) {
    console.log(`الحساب ${EMAIL} موجود بالفعل — أعد التشغيل مع --reset لإعادة إنشائه من الصفر.`);
    process.exit(0);
  }
  if (existing && reset) {
    // حذف بيانات هذا الحساب فقط — لا يمس أي مستخدم آخر.
    const uid = existing.id;
    await prisma.$transaction([
      prisma.aiUsage.deleteMany({ where: { userId: uid } }),
      prisma.auditEvent.deleteMany({ where: { ownerId: uid } }),
      prisma.acceptanceCriterion.deleteMany({ where: { ownerId: uid } }),
      prisma.openQuestion.deleteMany({ where: { ownerId: uid } }),
      prisma.businessRule.deleteMany({ where: { ownerId: uid } }),
      prisma.requirement.deleteMany({ where: { ownerId: uid } }),
      prisma.projectModule.deleteMany({ where: { ownerId: uid } }),
      prisma.project.deleteMany({ where: { ownerId: uid } }),
      prisma.passwordResetToken.deleteMany({ where: { userId: uid } }),
      prisma.user.delete({ where: { id: uid } }),
    ]);
    console.log("أُعيد ضبط الحساب السابق.");
  }

  const user = await prisma.user.create({
    data: {
      name: NAME,
      email: EMAIL,
      passwordHash: hashPassword(PASSWORD),
      plan: "PRO",
      analysisLimit: 50,
      analysisCount: 0,
      role: "USER",
      accountStatus: "ACTIVE",
      subscriptionStatus: "MANUAL",
    },
  });

  const project = await prisma.project.create({
    data: {
      ownerId: user.id,
      name: "منصة إدارة طلبات العملاء",
      code: "CUST-OPS",
      description:
        "منصة تساعد فرق العمليات على استقبال طلبات العملاء، التحقق من البيانات، إدارة المستخدمين، متابعة حالة الطلب، وإصدار تقارير تشغيلية.",
      client: "شركة تجريبية",
      domain: "العمليات وخدمة العملاء",
      status: "active",
      ...CONTEXT,
    },
  });

  const moduleIds = {};
  for (let i = 0; i < MODULES.length; i++) {
    const m = await prisma.projectModule.create({
      data: { ownerId: user.id, projectId: project.id, name: MODULES[i].name, description: MODULES[i].description, order: i },
    });
    moduleIds[MODULES[i].key] = m.id;
  }

  for (let i = 0; i < REQS.length; i++) {
    const r = REQS[i];
    await prisma.requirement.create({
      data: {
        id: r.id,
        ownerId: user.id,
        projectId: project.id,
        title: r.title,
        description: r.description,
        status: r.status,
        priority: r.priority,
        type: r.type,
        criteria: CRITERIA.filter((c) => c.req === r.id).length,
        openQuestions: QUESTIONS.filter((q) => q.req === r.id).length,
        module: r.mod ? MODULES.find((m) => m.key === r.mod).name : "",
        moduleId: r.mod ? moduleIds[r.mod] : null,
        stakeholders: r.stakeholders,
        notes: r.notes ?? null,
        source: r.source,
        version: 1,
        order: i,
      },
    });
  }

  for (let i = 0; i < CRITERIA.length; i++) {
    const c = CRITERIA[i];
    await prisma.acceptanceCriterion.create({
      data: { id: `DEMO-AC-${String(i + 1).padStart(2, "0")}`, ownerId: user.id, projectId: project.id, requirementId: c.req, text: c.text, done: false, ai: false, order: i },
    });
  }
  for (let i = 0; i < QUESTIONS.length; i++) {
    const q = QUESTIONS[i];
    await prisma.openQuestion.create({
      data: { id: `DEMO-Q-${String(i + 1).padStart(2, "0")}`, ownerId: user.id, projectId: project.id, requirementId: q.req, text: q.text, to: q.to, ai: false, answer: null, order: i },
    });
  }

  console.log(`OK: ${EMAIL} (PRO) — مشروع CUST-OPS: ${MODULES.length} وحدات، ${REQS.length} متطلبًا، ${CRITERIA.length} معايير قبول، ${QUESTIONS.length} أسئلة مفتوحة.`);
} finally {
  await prisma.$disconnect();
}
