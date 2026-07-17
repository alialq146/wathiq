# الحالة الحالية · Current Status (v2.5.0)

> **ابدأ من هنا.** هذا الملف هو نقطة الانطلاق لأي مهندس أو وكيل ذكاء اصطناعي جديد على المشروع.
> اقرأه بالكامل أولًا، ثم `README.md` و `AGENTS.md` و `docs/ARCHITECTURE.md`.
> آخر تحديث: تدقيق تأسيسي شامل v2.5.0 (2026-07).

---

## 1. ما هو المشروع؟ (سطر واحد)

**وثّق (Wathiq)** منصة SaaS عربية-أولاً (RTL) لتحليل متطلبات الأعمال: يلصق المستخدم مستندًا أو نصًا،
فيستخرج الذكاء الاصطناعي المتطلبات ومعايير القبول وقواعد العمل والأسئلة المفتوحة، ثم يديرها في مساحة عمل،
ويقيّم جاهزية المشروع/الوثائق، ويصدّر وثائق BRD/SRS/CSV.

## 2. الحالة العامة

| البند | الحالة |
|------|--------|
| الإصدار | **2.5.0** (`src/lib/version.ts`) |
| الجاهزية | **جاهز للإطلاق** (production-ready) مع ملاحظات تشغيلية مذكورة أدناه |
| البناء | `tsc --noEmit` نظيف، `next build` ناجح، First Load JS ≈ 102 kB |
| الأمان | لا ثغرات حرجة/عالية مفتوحة بعد إصلاحات v2.5؛ التصنيف الكامل في `docs/SECURITY.md` |
| الأداء | صحّي؛ الحد الوحيد المعروف = حمولة HTML لمساحة العمل تنمو خطيًا (الترقيم مؤجَّل بقرار) |
| الاختبارات الآلية | **لا يوجد** suite/CI — التحقق عبر tsc + build + QA يدوي (انظر `docs/TESTING.md`) |

## 3. البنية باختصار

- **Next.js 15 App Router** + React 19 + TypeScript. التطبيق في `wathiq-app/`.
- **Prisma + Postgres (Neon)**. **بدون علاقات FK** — أعمدة `ownerId`/`projectId` نصية + فهارس فقط.
- **Server Actions** لكل الكتابات (`src/app/actions.ts`) — كلها مُنطّقة بالملكية عبر `ownedBy`→`scopeWhere`.
- **طبقة وصول مركزية** `src/lib/access.ts` — نقطة التوسّع الوحيدة للتعاون متعدد المستخدمين لاحقًا.
- **مصادقة بلا حالة**: كوكي HMAC-SHA256 موقّع (`src/lib/auth.ts`)، صالح 7 أيام.
- **إعدادات مركزية**: `SystemSettings` مفرد + دمج عميق فوق الافتراضيات (`src/lib/settings/`).
- **الذكاء الاصطناعي اختياري بالكامل** — لا يعمل إلا بضغطة صريحة؛ التطبيق يعمل بدون مفتاح على بيانات احتياطية.
- التفاصيل الكاملة في `docs/ARCHITECTURE.md`.

## 4. ماذا أُنجز في v2.5 (التدقيق التأسيسي)

إصلاحات مؤكَّدة طُبّقت (الأدلة في `docs/SECURITY.md` والتقرير النهائي):

- **F1** منع open-redirect في `/login` (رفض `//` و `/\`).
- **F3** تحييد حقن الصيغ في CSV (`csvCell`) + **F10** ترميز `'` في HTML export.
- **F4** حدود طول على حقول المتطلب + قائمة بيضاء للحالة/الأولوية (`clean()` في actions.ts).
- **F8** إصلاح تسريب أعداد عبر المستأجرين في `/api/health`.
- **F9** تنطيق aggregate الترتيب في `saveExtractedRequirements`.
- **F11** حد أعلى لنص التحليل (200k) واسم التسجيل (120).
- **F2** ترويسات أمان (`next.config.mjs`).
- **F12** حدود أخطاء واجهة: `error.tsx` + `global-error.tsx` + `not-found.tsx`.
- **H1** مخرج `SKIP_DB_PUSH` في `scripts/db-setup.mjs` (حماية بيانات الإنتاج).
- **تحسين تشغيلي**: `/api/health` صار مسبارًا حقيقيًا (فحص DB + إصدار + طابع زمني).

## 5. أهم القرارات المعمارية (لا تغيّرها دون سبب)

انظر `docs/DECISIONS/` (ADRs). أبرزها:
1. **بدون علاقات FK** في Prisma — العزل في طبقة التطبيق (ADR-001).
2. **مالك واحد لكل مشروع** حاليًا؛ التعاون يُبنى لاحقًا في `access.ts` فقط (ADR-002).
3. **بدون Redis/Inngest/R2** — لا حاجة مثبتة (ADR-003/004/005).
4. **`prisma db push`** بدل ملفات migration (ADR-007).
5. **السياسات من الإعدادات، الأسرار من متغيّرات البيئة** (ADR-006).

## 6. الملاحظات التشغيلية المفتوحة (موصى بها، غير حرجة)

هذه **توصيات** لم تُنفّذ (خارج نطاق v2.5 عمدًا) — انظر `docs/OPERATIONS.md` و `docs/ROADMAP.md`:
- لا logging منظّم (46 `console.*`) → يُقترح `src/lib/log.ts`.
- لا correlation/request IDs.
- لا نسخ احتياطي/استرجاع موثّق (نعتمد على مزوّد Postgres المُدار).
- `db push --accept-data-loss` يعمل كل بناء إنتاجي — خُفّف بمخرج `SKIP_DB_PUSH` (v2.5) لكن يُنصح بإدارة المخطط يدويًا في الإنتاج.
- الترقيم (pagination) لمساحة العمل مؤجَّل — راجعه إذا تجاوز مشروع ~1–2k متطلب.
- لا rate-limit على تسجيل الدخول (مُخفَّف بـ scrypt) — توصية F6.
- تغيير كلمة المرور لا يُبطل الجلسات القائمة (توكن HMAC بلا نسخة) — توصية F7.

## 7. ما هي المهمة التالية؟

**رحلة محلل الأعمال (BA journey) + الثيمات (themes)** — ميزة جديدة كبيرة. لم تبدأ بعد.
راجع `docs/ROADMAP.md` لجاهزية المخطط لكل ميزة قادمة (معظمها إضافية: جدول جديد أو عمود nullable، بلا refactor كبير).

## 8. كيف تشتغل؟ (أوامر سريعة)

```bash
cd wathiq-app
npm install
# محليًا بدون قاعدة بيانات: يعمل على بيانات احتياطية مدمجة
npm run dev
# فحص قبل أي دفع:
npx tsc --noEmit && npx next build
```

**تشغيل مع قاعدة بيانات حقيقية محليًا** (المطلوب الأدنى):
```bash
export DATABASE_URL="postgresql://<user>@localhost:5432/<db>"
export WATHIQ_SESSION_SECRET="<سرّ ثابت>"   # مطلوب: وإلا يسقط إلى DATABASE_URL
# اختياري حسب الميزة: ANTHROPIC_API_KEY + AI_MODEL_* (ذكاء)، RESEND_API_KEY (بريد)، CRON_SECRET
npm run db:push && npm run db:seed         # إنشاء المخطّط + بذر idempotent
npm run dev
```

**النشر (المسار السعيد)**:
```
1) تأكّد: npx tsc --noEmit && npx next build نظيفان.
2) اضبط متغيّرات البيئة في Vercel (DATABASE_URL + WATHIQ_SESSION_SECRET إلزاميان).
3) إن كان هناك تغيير مخطّط خطر: خذ نسخة Neon احتياطية، أو اضبط SKIP_DB_PUSH=1 وأدر المخطّط يدويًا.
4) ادفع إلى main → Vercel يبني وينشر (البناء يشغّل db-setup.mjs ثم next build).
5) تحقّق بعد النشر: /api/health يرد ok:true, db:up.
```

التفاصيل الكاملة (متغيّرات البيئة، التراجع، المراقبة) في `docs/DEPLOYMENT.md` و `docs/OPERATIONS.md` و `docs/ENVIRONMENT_VARIABLES.md`.

## 9. خريطة الوثائق

| تريد أن تعرف… | اقرأ |
|--------------|------|
| نظرة عامة على المنتج | `docs/PROJECT_OVERVIEW.md` |
| كيف يعمل النظام تقنيًا | `docs/ARCHITECTURE.md` |
| قاعدة البيانات | `docs/DATABASE_SCHEMA.md` |
| الصلاحيات والعزل | `docs/ACCESS_CONTROL.md` |
| قواعد العمل المفروضة | `docs/BUSINESS_RULES.md` |
| الميزات ومساراتها | `docs/FEATURE_MAP.md` |
| رحلات المستخدم | `docs/USER_JOURNEYS.md` |
| مساعد الذكاء الاصطناعي | `docs/AI_ASSISTANT.md` |
| الإعدادات المركزية | `docs/ADMIN_SETTINGS.md` · `docs/SETTINGS.md` |
| متغيّرات البيئة | `docs/ENVIRONMENT_VARIABLES.md` |
| النشر | `docs/DEPLOYMENT.md` |
| الاختبار والتحقق | `docs/TESTING.md` |
| الأمان | `docs/SECURITY.md` |
| التشغيل والصيانة | `docs/OPERATIONS.md` |
| حل المشكلات | `docs/TROUBLESHOOTING.md` |
| الخارطة المستقبلية | `docs/ROADMAP.md` |
| القرارات المعمارية | `docs/DECISIONS/` |
| سجل التغييرات | `../CHANGELOG.md` · `../JOURNEY.md` |
