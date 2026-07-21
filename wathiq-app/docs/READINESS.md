# مركز جاهزية المشروع والوثائق · Project Readiness Center

> **المصدر المرجعي الوحيد** لمركز الجاهزية (القاعدة 13). الوثائق الأخرى تربط هنا ولا تكرّر.
> الكود: [`src/lib/readiness.ts`](../src/lib/readiness.ts) · الشاشة: [`src/components/workspace/ReadinessScreen.tsx`](../src/components/workspace/ReadinessScreen.tsx) · الأفعال: [`src/app/actions.ts`](../src/app/actions.ts).

## 1. ما هو؟
خدمة مركزية تجيب سؤالًا واحدًا قبل تسليم المشروع أو إصدار BRD/SRS: **«هل المشروع جاهز، وما الذي ينقصه بالتحديد، وماذا أفعل الآن؟»**. تعمل على البيانات المحفوظة فقط:

- **لا تستدعي ذكاءً اصطناعيًا ولا تستهلك نقاطًا إطلاقًا** (عقد ثابت — انظر [`docs/AI_ACCOUNTING.md`](./AI_ACCOUNTING.md)).
- **ملكية مفروضة في الخادم** (`ownerId`) — مشروع الغير يُعامل كـ 404.
- المحرّك `computeReadiness` **نقيّ** (بيانات + إعدادات → نتيجة): يُعاد استخدامه في الشاشة والتصدير والترتيب بالأثر.

## 2. المحاور السبعة والدرجة العامة
`computeReadiness` يحسب 7 محاور موزونة (`AxisKey`): سياق المشروع، اكتمال المتطلبات، الجودة (من التحليلات المحفوظة)، معايير القبول، الأسئلة/المعلومات الناقصة، حالة الاعتماد، بيانات الوثائق المطلوبة.

- كل محور: درجة 0–100 + حالة + وزن + ملاحظات.
- **الدرجة العامة** = متوسط موزون على **المحاور المطبَّقة فقط** (تُعاد تطبيع الأوزان عند استبعاد محور غير منطبق)، بحماية كاملة من القسمة على صفر/NaN/السالب/تجاوز 100.
- الأوزان والعتبات **قابلة للتهيئة** من إعدادات الأدمن (`ReadinessSettings.weights` مجموعها 100، يتحقّق الخادم).

## 3. التصنيف (Readiness Levels)
`ReadinessStatus` بأربع درجات حسب العتبات (`thresholds`): `ready` (جاهز للإصدار) · `ready_with_notes` (جاهز مع ملاحظات) · `needs_work` (يحتاج استكمال) · `not_ready` (غير جاهز).

## 4. الملاحظات: الحاجب مقابل التحذير
كل ملاحظة (`ReadinessIssue`) لها **خطورة** (`IssueSeverity`):

- `critical` = **نقص حرج (Blocking)** — قد يمنع تصدير الوثيقة المطلوبة (§7).
- `important` / `optional` = **تحذيرات/اقتراحات** لا تمنع.

كل ملاحظة قابلة للتنفيذ تحمل `fixAction` رمزيًا (تنقّل داخلي، **ليس URL**): `requirements` · `context` · `requirement:<id>` — تفهمها مساحة العمل فتنقل المستخدم للمكان الصحيح.

## 5. «الإجراء التالي» — الترتيب بالأثر (v2.7)
الفلسفة: **قل للمستخدم ماذا يفعل الآن**، لا إغراقه بالأرقام. `rankActionsByImpact(input, settings)` طبقة نقية فوق الملاحظات:

1. لكل ملاحظة قابلة للتنفيذ، يُحاكى «كأنها عولجت» (`simulateFix`) ثم يُعاد حساب الدرجة.
2. يُقاس **مقدار ارتفاع الدرجة** و**هل يفتح تصدير وثيقة مطلوبة** (تحت سياسة `block_critical`).
3. الترتيب: **يفتح تصديرًا ← الأعلى رفعًا للدرجة ← الأشد خطورة**؛ وتُدمج الأكواد المتشابهة في إجراء واحد.

المخرج `RankedAction[]` على `ReadinessResult.topActions` — يُحسب في **مسار الشاشة فقط** (علم `withActions` في `calculateProjectReadiness`)، لا في مسار التصدير. الواجهة تعرض أعلى 3 كجُمل أمر + زر ذكي («ابدأ الآن»/«انتقل») ينقل عبر `fixAction`. **الترتيب الرقمي داخلي ولا يُعرض** (بلا نسب مئوية على الشاشة). أثر الجودة **تقديري** (يعتمد على تحليل لاحق) بينما أثر المعايير/الأسئلة/السياق **دقيق**.

## 6. جاهزية الوثائق BRD/SRS
لكل وثيقة **مفعّلة** (`REQUIRED`/`OPTIONAL`) درجة وحالة مستقلة (`DocReadiness`) بمزيج داخلي موثّق من المحاور + بيانات الوثيقة. الوثيقة `NOT_APPLICABLE` **لا تدخل الحساب** ولا تُمنح صفرًا. الاختيارية لا تؤثر على الدرجة العامة.

## 7. بوابة التصدير (Export Readiness)
`checkDocumentExport` تُفرض **خادميًا** قبل بناء الوثيقة (لا يكفي إخفاء الزر):

- `NOT_APPLICABLE` → **block** (رفض).
- سياسة `allow` أو الميزة معطّلة → **allow** مباشرة.
- سياسة `block_critical` + وثيقة `REQUIRED` + نواقص حرجة → **block**.
- غير ذلك → **warn** (تصدير رغم ذلك) أو **allow**.

كل محاولة تصدير/منع تُسجَّل في `ReadinessExportLog`. الواجهة: [`ExportDialog.tsx`](../src/components/workspace/ExportDialog.tsx) تعرض warn/blocked قبل التوليد.

## 8. الإعدادات (`ReadinessSettings`)
قابلة للتهيئة من `/admin/settings` (SUPER_ADMIN): `enabled`، `brd/srsReadinessEnabled`، `thresholds`، `weights`، `missingAnalysisPolicy`، `requireAcceptanceCriteria`، `criticalNoCriteriaForCritical`، `minCriteriaPerRequirement`، `minQualityScore`، `minApprovedPercent`، `exportPolicy`، `defaultBrd/SrsApplicability`، `planAccess` (FREE = ملخص)، `freeMaxIssues`. التفاصيل: [`docs/ADMIN_SETTINGS.md`](./ADMIN_SETTINGS.md).

## 9. التخزين
- **`ReadinessSnapshot`** — لقطة تاريخية خفيفة (درجة + أعداد + ملاحظات مقصوصة، بلا نصوص متطلبات) تُكتب عند الطلب أو كل ~10 دقائق. (غير معروضة بعد — تحسين مستقبلي: اتجاه/Trend.)
- **`ReadinessExportLog`** — سجل تصدير/منع الوثائق.

المخطّط الكامل: [`docs/DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md).

## 10. مراجع الكود
| ماذا | أين |
|------|-----|
| المحرّك النقيّ + الترتيب بالأثر | `src/lib/readiness.ts` (`computeReadiness`, `rankActionsByImpact`) |
| الغلاف الخادمي + اللقطة | `calculateProjectReadiness` |
| بوابة التصدير | `checkDocumentExport` |
| الأفعال | `getProjectReadiness`, `updateProjectDocuments`, `checkDocumentExportAction`, `logDocumentExportAction` |
| الشاشة | `ReadinessScreen.tsx` · التصدير `ExportDialog.tsx` |
| الإعدادات | `src/lib/settings/` (`ReadinessSettings`) |
