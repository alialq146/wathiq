# البنية المعمارية · Architecture

> نظرة تقنية شاملة على كيفية عمل وثّق. للبدء السريع اقرأ `CURRENT_STATUS.md` أولًا.

## 1. المكدّس التقني (Stack)

| الطبقة | التقنية |
|--------|---------|
| الإطار | Next.js 15 (App Router) + React 19 |
| اللغة | TypeScript |
| قاعدة البيانات | PostgreSQL (Neon) عبر Prisma |
| المصادقة | كوكي HMAC-SHA256 موقّع بلا حالة (Edge-compatible) |
| الذكاء الاصطناعي | مزوّد خارجي عبر `@anthropic-ai/sdk` (اختياري) |
| البريد | Resend (اختياري) |
| النشر | Vercel (Fluid Compute، `maxDuration` حتى 300s للمسارات الذكية) |
| الأيقونات | lucide-react |

الاعتماديات وقت التشغيل قليلة عمدًا: `next`, `react`, `react-dom`, `@prisma/client`, `@anthropic-ai/sdk`, `lucide-react`.

## 2. مسار الطلب (Request → DB)

```
المتصفح
  → middleware.ts (Edge)         ← يمنع المسارات غير العامة بلا كوكي جلسة صالح
  → صفحة Server Component        ← تقرأ الجلسة، تستدعي طبقة البيانات
      · workspace-data.ts / admin-data.ts / readiness.ts …
  → Prisma → Postgres
  ← Server Component يصيّر HTML/RSC

الكتابات:
المتصفح → Server Action (actions.ts) → requireActor() → ownedBy()/scopeWhere() → Prisma
أو:      → API Route (/api/*) → حارس (session/role/CRON_SECRET) → طبقة الخدمة → Prisma
```

نقاط مهمة:
- **`"use server"`** في `src/app/actions.ts` — كل عمليات الكتابة للمتطلبات/المشاريع/الوحدات/السياق تمر منه.
- كل Server Action يبدأ بـ **`requireActor()`** الذي: يقرأ الجلسة من الخادم، ويرفض غير المصادَق عند تفعيل الحسابات، ويعيد التحقق من `accountStatus=ACTIVE` عبر `isAccountActive`.
- الملكية تُلحق بكل استعلام عبر **`ownedBy(uid)` → `scopeWhere(uid)`** (`src/lib/access.ts`) = `{ ownerId: uid }`. لا يُوثق أبدًا بـ `ownerId`/`userId` القادم من العميل.

## 3. المصادقة (Auth path)

- `src/lib/auth.ts` — توكن جلسة **بلا حالة**: HMAC-SHA256 فوق الحمولة (uid, name, email, iat)، صالح 7 أيام، كوكي `httpOnly` + `secure`(في الإنتاج) + `sameSite=lax`.
- **سلسلة سرّ التوقيع** `sessionSecret()`: `WATHIQ_SESSION_SECRET` → `WATHIQ_AUTH_PASSWORD` → `DATABASE_URL` (احتياطي). **يُنصح دائمًا بضبط `WATHIQ_SESSION_SECRET` صراحةً في الإنتاج** (تغيّر `DATABASE_URL` يبطل كل الجلسات).
- **`middleware.ts`** (Edge) هو الطبقة الأولى: يمرّر المسارات العامة (`/`, `/login`, `/signup`, `/pricing`, `/privacy`, `/terms`, `/security`, `/samples`, `/api/auth`, `/api/health`, `/api/cron`)، ويعيد توجيه الباقي بلا جلسة صالحة إلى `/login?next=…`. **لا فحص أدوار في الـ Edge** (لا يصل للقاعدة).
- **الأدوار** تُفحص في الخادم: `requireSuperAdmin()` يقرأ الدور **طازجًا من القاعدة** في كل استدعاء — لا يثق بالكوكي أبدًا.
- كلمات المرور: **scrypt** (N=16384, r=8, p=1) عبر `node:crypto`، الصيغة `scrypt$N$r$p$saltHex$hashHex` (`src/lib/password.ts`).

## 4. نموذج البيانات (Data model)

انظر `docs/DATABASE_SCHEMA.md` للتفاصيل الكاملة. القرار المحوري:

> **لا علاقات Foreign-Key في Prisma.** كل نموذج مُنطَّق يحمل أعمدة `ownerId` و`projectId` **نصية** + `@@index`، بلا `@relation` ولا `onDelete`.

الأثر:
- العزل يتم في **طبقة التطبيق** (scopeWhere)، لا في القاعدة.
- **لا cascade** عند حذف مستخدم → صفوف يتيمة ممكنة (مقصود؛ الحذف نادر ويُدار يدويًا). موثّق في ADR-001.
- المخطط يُطبَّق عبر **`prisma db push`** (لا ملفات migration). البذر idempotent.

## 5. طبقة الوصول المركزية (Access layer)

`src/lib/access.ts` هي **نقطة التوسّع الوحيدة** للصلاحيات:
- عقد موحّد `ProjectAccess { role, canView, canEdit, canDelete, canUseAssistant, canExport }`.
- `getProjectAccess()` / `requireProjectAccess(need)` — اليوم استعلام ملكية واحد يعيد `OWNER` فقط.
- `scopeWhere(uid)` — شرط النطاق للاستعلامات الجماعية.
- مصفوفة `ROLE_CAPS` جاهزة لأدوار `EDITOR`/`REVIEWER` مستقبلًا.
- **إضافة التعاون متعدد المستخدمين لاحقًا تحدث هنا فقط** (جدول `ProjectMember` + توسيع `scopeWhere` إلى «مالك أو عضو») دون لمس عشرات المسارات. تفاصيل في `docs/ACCESS_CONTROL.md`.

## 6. مسار الذكاء الاصطناعي (AI path)

- `src/lib/ai.ts` — يفصل **prompt النظام** (معامل `system`) عن نص المستخدم (في `messages[]`) — منع لحقن التعليمات. أسماء النماذج **لا تُرسل للعميل أبدًا**.
- التوجيه حسب الباقة عبر `src/lib/ai-runtime.ts` (إعدادات `modelRouting` + تجاوز بيئة `AI_MODEL_<PLAN>`).
- `/api/analyze` (تحليل مستند/PDF) و `/api/analyze-requirement` (تحليل متطلب مفرد).
- **محاسبة نقاط ذرّية (Idempotent)** قبل الاستدعاء عبر `runAiOperation` (`src/lib/ai-operation.ts` + `ai-credits.ts` + `entitlements.ts`): حجز → تنفيذ → تثبيت/استرجاع؛ الفشل يُسترجَع تلقائيًا، وحجوزات يتيمة يعالجها منظّف مجدول. التفاصيل في `docs/AI_ACCOUNTING.md`.
- حدود المدخلات: PDF base64 ≤ 4.4MB، النص 20–200,000 حرف، `max_tokens` مقيّد، `maxDuration=300`.
- **اختياري بالكامل**: بلا مفتاح ترد المسارات `{ok:false,error:"no-key"}` والتطبيق يعمل على بيانات احتياطية. تفاصيل في `docs/AI_ASSISTANT.md`.

## 7. الإعدادات المركزية (Settings path)

- مفرد `SystemSettings` بأعمدة JSON (general/contact/notifications/documents/plans/assistant/features/readiness).
- **دمج عميق** فوق افتراضيات الكود + **cache ذاكرة 60s** + `React cache()` لكل طلب + إبطال عند الحفظ.
- سقوف صلبة تُفرض في الخادم. تحرير عبر `/admin/settings` (SUPER_ADMIN فقط) مع `SettingsAuditLog`.
- **الأسرار ليست في الإعدادات** — تبقى في متغيّرات البيئة. تفاصيل في `docs/ADMIN_SETTINGS.md`.

## 8. التصدير (Export path)

- `src/lib/export.ts` — توليد BRD/SRS (HTML قابل للطباعة) و CSV.
- **تحصين الإخراج**: `esc()` يرمّز `< > & " '` لـ HTML؛ `csvCell()` يحيّد حقن الصيغ (يسبق `= + - @ \t \r` بفاصلة علوية) ويقتبس القيم.
- التصدير مُبوّب بالباقة/الإعدادات (documentExport).

## 9. مسار التدقيق (Audit path)

- `AuditEvent` (أحداث مساحة العمل، ~25 نوعًا عبر `logAudit`)، `BillingAuditLog` (الفوترة)، `SettingsAuditLog` (تغييرات الإعدادات).
- `logAudit` **best-effort** — فشل التسجيل لا يُفشل العملية.

## 10. الاعتماديات الخارجية

| الخدمة | الاستخدام | إلزامية؟ |
|--------|-----------|----------|
| Neon Postgres | التخزين | يُنصح بشدة (بدونها = بيانات احتياطية للقراءة فقط) |
| Vercel | الاستضافة + Fluid Compute | نعم للنشر |
| مزوّد الذكاء الاصطناعي | التحليل | لا (اختياري) |
| Resend | البريد (استعادة كلمة المرور، تذكيرات الفوترة) | لا (اختياري) |

## 11. طبقات الأمان (ملخّص)

1. **Middleware (Edge)** — بوابة الكوكي للمسارات غير العامة.
2. **`requireActor()`** — كل Server Action: جلسة + حساب فعّال.
3. **`ownedBy`/`scopeWhere`** — عزل الملكية في كل استعلام.
4. **`requireSuperAdmin()`** — كل مسار `/api/admin/**`، دور طازج من القاعدة.
5. **`CRON_SECRET`** — مسار الـ Cron.
6. **تحقق المدخلات + تحصين الإخراج** — حدود الطول، قوائم بيضاء، ترميز CSV/HTML.
7. **ترويسات أمان** (`next.config.mjs`).

التصنيف الكامل والثغرات المعالَجة في `docs/SECURITY.md`.
