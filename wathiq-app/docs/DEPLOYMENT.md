# النشر · Deployment

> كيف يُنشر وثّق ويُشغّل. راجع `docs/OPERATIONS.md` للتراجع والمراقبة، و`docs/ENVIRONMENT_VARIABLES.md` للمتغيّرات.

## 1. المنصّة

- **Vercel** (استضافة + Fluid Compute حتى `maxDuration=300s` للمسارات الذكية).
- **Neon Postgres** لقاعدة البيانات.
- الدفع إلى `main` → بناء + نشر تلقائي.

## 2. التشغيل محليًا

```bash
cd wathiq-app
npm install                 # يشغّل prisma generate عبر postinstall
npm run dev                 # http://localhost:3000
```

- **بلا `DATABASE_URL`**: يعمل على بيانات احتياطية مدمجة (قراءة فقط، للعرض).
- **مع قاعدة محلية**: اضبط `DATABASE_URL` ثم `npm run db:push && npm run db:seed`.

## 3. الفحص قبل الدفع (إلزامي)

```bash
npx tsc --noEmit            # يجب أن يكون نظيفًا
npx next build              # يجب أن ينجح
```

لا تدفع بدون نجاح الاثنين. راجع `docs/TESTING.md`.

## 4. متغيّرات البيئة للإنتاج

الأدنى المطلوب:

| المتغيّر | لماذا |
|---------|-------|
| `DATABASE_URL` | القاعدة (أو متغيّرات Postgres البديلة) |
| `WATHIQ_SESSION_SECRET` | **اضبطه صراحةً** — وإلا يسقط إلى `DATABASE_URL` |

موصى به حسب الميزات المفعّلة: `ANTHROPIC_API_KEY` + `AI_MODEL_*` (الذكاء)، `RESEND_API_KEY` + `EMAIL_FROM` + `BILLING_EMAIL_ENABLED` (البريد)، `CRON_SECRET` (المهام المجدولة)، `APP_URL`، `USD_TO_SAR`.

القائمة الكاملة: `docs/ENVIRONMENT_VARIABLES.md`. **الأسرار في بيئة Vercel فقط — لا في الكود ولا الإعدادات.**

## 5. بناء قاعدة البيانات وقت النشر

- سكربت البناء: `node scripts/db-setup.mjs && next build`.
- `db-setup.mjs`: مع `DATABASE_URL` → `prisma db push --accept-data-loss` + بذر idempotent؛ بلا قاعدة → يتخطّى.
- **⚠️ `--accept-data-loss` يعمل كل بناء.** قبل تغييرات المخطّط الخطرة: خذ نسخة Neon احتياطية، أو اضبط **`SKIP_DB_PUSH=1`** وأدر المخطّط يدويًا. راجع `docs/OPERATIONS.md §1`.

## 6. المهام المجدولة

- أنشئ Vercel Cron لـ `/api/cron/subscription-reminders` يمرّر `Authorization: Bearer <CRON_SECRET>`.
- بلا `CRON_SECRET` يرد المسار 403 (آمن افتراضيًا).

## 7. منح صلاحية مدير

```bash
node scripts/make-admin.mjs <email>   # يرفع المستخدم إلى SUPER_ADMIN
```

## 8. قائمة تحقق النشر

- [ ] `tsc --noEmit` نظيف و`next build` ناجح.
- [ ] `WATHIQ_SESSION_SECRET` مضبوط وثابت.
- [ ] نسخة Neon احتياطية إن كان هناك تغيير مخطّط.
- [ ] المتغيّرات المطلوبة للميزات المفعّلة مضبوطة.
- [ ] `CRON_SECRET` مضبوط إن كانت الفوترة مفعّلة.
- [ ] `/api/health` يرد `ok:true, db:up` بعد النشر.
- [ ] تحديث `CHANGELOG.md` + `JOURNEY.md` + `src/lib/version.ts`.
