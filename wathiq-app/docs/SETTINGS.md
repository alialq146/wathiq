# نظام الإعدادات المركزية (v2.2) — البنية ودليل المطور

## البنية

- **التخزين**: صف `SystemSettings` واحد (singleton) بأعمدة JSON typed لكل مجموعة:
  `general / contact / notifications / documents / plans / assistant / features`
  + `schemaVersion` + `updatedByAdminId`. إعدادات الفوترة تبقى في `BillingSettings`
  (Module Typed مستقل من v2.1 — لا تكرار).
- **الحل**: القيمة المخزنة جزئية (Partial) وتُدمج فوق `src/lib/settings/defaults.ts`.
  **غياب السجل أو الحقل أو فشل القراءة = السلوك التاريخي حرفيًا** — هذه هي
  استراتيجية الـ Migration: لا seed مطلوب، ولا تغيير سلوك تلقائي.
- **الخدمة**: `src/lib/settings/index.ts` هي نقطة القراءة/الكتابة الوحيدة.
  لا يقرأ أي Component قاعدة البيانات مباشرة.
- **Cache**: ذاكرة العملية TTL 60 ثانية + دمج لكل طلب عبر `React cache()`.
  الحفظ يستدعي `invalidateSettingsCache()` — نفس الـ instance فوري،
  وبقية الـ serverless instances تلتقط القيمة خلال ≤ 60 ثانية (موثق ومقبول).
- **السقوف الصلبة** (`HARD_CEILINGS` في defaults.ts): النظام يستطيع تخفيض
  الحدود، لا تجاوزها — تُفرض عند الحفظ وعند القراءة معًا:
  تحليلات ≤ 1000، مشاريع ≤ 500، مهمة مساعد ≤ 1500 token، تحليل كامل ≤ 12000.
- **التدقيق**: كل حفظ يكتب `SettingsAuditLog` (القسم، الأدمن، الحقول المتغيرة،
  diff مقصوص ≤ 120 حرفًا للقيمة — لا أسرار ولا نصوص كاملة) + ProductEvent.
- **الواجهة**: `/admin/settings` (SUPER_ADMIN فقط) عبر
  `GET/PUT /api/admin/settings` و`GET /api/admin/settings/audit`.

## ما يبقى Environment Variables (لا يُنقل أبدًا إلى القاعدة)

`ANTHROPIC_API_KEY`، `AI_MODEL_FREE/PRO/ENTERPRISE` (توجيه النماذج — أسماء
النماذج لا تظهر في أي واجهة عامة)، `DATABASE_URL`، سر الجلسات، `CRON_SECRET`،
`RESEND_API_KEY`، `EMAIL_FROM`، `BILLING_EMAIL_ENABLED` (بوابة رئيسية —
إعداد `billingEmailsEnabled` يعمل AND معها)، `APP_URL`، وأي مفاتيح بوابات دفع
مستقبلية.

## ما يبقى في الكود (ليس إعدادًا)

فحوصات الملكية، حارس SUPER_ADMIN، الحجز الذري للحصة، رموز الخطط
(FREE/PRO/ENTERPRISE)، تعليمات الذكاء الاصطناعي وschemas (منطق جودة)،
عبارات منع اختراع البيانات (النص قابل للتخصيص لكن الافتراضي الآمن في الكود
ولا يُقبل فارغًا)، السقوف الصلبة، أكواد الأخطاء.

## How to Add a New System Setting

1. **Type**: أضف الحقل إلى الواجهة المناسبة في `src/lib/settings/types.ts`.
2. **Default**: أضف قيمة افتراضية تطابق السلوك الحالي في
   `src/lib/settings/defaults.ts` (وسقفًا صلبًا في `HARD_CEILINGS` إن كان حدًا).
3. **Validation**: أضف تطبيع الحقل في normalizer القسم داخل
   `src/lib/settings/index.ts` (نص مقصوص / رقم ضمن مدى / boolean / safeUrl).
4. **Admin UI**: أضف الحقل في قسمه داخل
   `src/app/admin/settings/SystemSettingsClient.tsx` (Txt/Area/Bool/Num/LimitField).
5. **Audit**: تلقائي — flatDiff يلتقط أي مفتاح جديد؛ لا خطوة إضافية.
6. **Cache invalidation**: تلقائي — updateSystemSettings يلغي الكاش.
7. **الاستهلاك**: اقرأ عبر getter القسم (`getContactSettings()` …) في الخادم،
   ومرر لمكونات العميل عبر props/context — لا fetch من العميل للإعدادات الحساسة.
8. **Tests**: أضف فحصًا في `scripts/qa-v22.mts` (default + validation + انعكاس).
9. **ممنوع**: لا تضع أي Secret أو مفتاح في القاعدة — Environment Variables فقط.
