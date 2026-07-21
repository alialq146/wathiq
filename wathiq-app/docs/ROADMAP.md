# الخارطة المستقبلية · Roadmap & Scalability Readiness

> جاهزية المخطط الحالي لكل ميزة قادمة (Phase B من تدقيق v2.5).
> **الخلاصة**: التصميم بلا-FK (أعمدة نصية + فهارس) يجعل كل ميزة تقريبًا **إضافية** (جدول جديد أو عمود nullable) — **لا refactor كبير مطلوب لأي ميزة.**

## 1. المهمة التالية المخطّطة

**رحلة محلل الأعمال (BA journey) + الثيمات (Themes)** — لم تبدأ. راجع الجداول أدناه لجاهزية كل جزء.

## 2. مصطلحات الحكم

| الحكم | المعنى |
|------|--------|
| **جاهز (ready)** | لا تغيير مخطّط — يُبنى فوق ما هو موجود |
| **تحضير الآن (prep-now)** | تحضير رخيص يقلّل مخاطر لاحقة — يُنصح به الآن |
| **تغيير عند البناء (at-build)** | يؤجَّل بلا عقوبة — جدول/عمود جديد وقت البناء |
| **refactor كبير** | إعادة هيكلة واسعة (لا شيء من ميزاتنا هنا) |

## 3. جدول الجاهزية لكل ميزة

| # | الميزة | الحكم | ما تحتاجه | الدليل |
|---|--------|------|-----------|--------|
| 1 | مبادرة/ميثاق فوق المشروع | at-build | جدول `Initiative` + `initiativeId` nullable على Project | schema:Project |
| 2 | نطاق المشروع (داخل/خارج) | **ready** | لا شيء | Project.`projectScope`/`outOfScope` موجودة |
| 3 | أصحاب المصلحة كيانات مستقلة | at-build | جدول `Stakeholder` (+ ترحيل من `string[]`) | Requirement.`stakeholders String[]` |
| 4 | جلسات التحليل (تاريخ) | **prep-now** | جدول `AnalysisSession` أو مصفوفة | Requirement.`analysis Json?` يُكتب فوقه (فقدان تاريخ) |
| 5 | علاقات المتطلبات (أب/ابن، يرتبط بـ) | at-build | جدول ربط `RequirementLink` | Requirement (لا حقول علاقة) |
| 6 | تبعيات المتطلبات (حجب) | at-build | جدول ربط (جزء من #5) | — |
| 7 | طلبات التغيير | at-build | جدول `ChangeRequest` | Requirement.`version`/`updatedAt` فقط |
| 8 | التنفيذ/التحقق (حالة الاختبار) | at-build | عمود `verificationStatus` nullable أو جدول `TestCase` | Requirement.`status` دورة حياة فقط |
| 9 | إغلاق/أرشفة المشروع | **ready** | إضافة `"archived"` لقائمة الحالة البيضاء | Project.`status` نصّ حرّ + whitelist في actions.ts |
| 10 | أعضاء المشروع + الأدوار | at-build (يمسّ access.ts) | جدول `ProjectMember` + توسيع `access.ts` | access.ts: OWNER فقط + `ROLE_CAPS` جاهزة + علم `projectCollaborationEnabled` |
| 11 | الإشعارات | at-build | جدول `Notification` | `SubscriptionReminder` للفوترة فقط |
| 12 | تكاملات خارجية (Jira/ADO/GitHub) | at-build | جدول `IntegrationConnection` + `externalId/System/lastSyncedAt` nullable | Requirement (لا حقول خارجية)؛ نمط Payment.provider |
| 13 | مصفوفة التتبّع (RTM) | at-build | جداول ربط (تعتمد على #5/#8/#12) | Requirement.`source` نصّ حرّ + علم `rtm` |
| 14 | الثيمات/التصنيف | at-build | جدول `Theme` + `themeId` nullable (نمط ProjectModule) | Requirement.`type/module/moduleId` → ProjectModule سابقة مطابقة |

## 4. جاهز اليوم بلا تغيير مخطّط

- **#2 نطاق المشروع** — الحقول موجودة، تحتاج واجهة فقط.
- **#9 أرشفة المشروع** — إضافة `"archived"` لقوائم الحالة البيضاء في `createProject`/`updateProject` (actions.ts). بلا تغيير مخطّط.

> **ملاحظة**: هذان **ميزتان** لا إصلاحان — لم يُنفَّذا في v2.5 عمدًا (نطاق التدقيق التأسيسي = بلا ميزات جديدة).

## 5. التحضير الموصى به الآن (رخيص + يقلّل مخاطر)

1. **تاريخ التحليل يُفقد اليوم (#4)**: `Requirement.analysis Json?` عمود مفرد يُكتب فوقه كل إعادة تحليل، و`AiOperation` يسجّل العملية (لا محتوى نتيجة التحليل التاريخي). إن كانت الجلسات/التاريخ محتملة، فالتحضير الأرخص = التوقّف عن الكتابة فوقه (إلحاق بمصفوفة أو جدول `AnalysisSession`) **قبل فقدان مزيد من التاريخ**. هذا البند الوحيد الذي للتأجيل فيه كلفة مستمرة.

## 6. الديون التقنية المعمارية

- **لا cascade** عند حذف مستخدم/مشروع (بلا FK) → صفوف يتيمة. عند تفعيل حذف المستخدمين: اكتب سكربت تنظيف يحذف الصفوف المُنطَّقة بـ `ownerId`.
- **الترقيم (pagination)** مؤجَّل لمساحة العمل — راجعه إذا تجاوز مشروع ~1–2k متطلب (حمولة HTML تنمو خطيًا؛ ~412KB عند 500 متطلب).
- **CSP** غير صارمة — إضافتها تتطلّب nonce على inline scripts.

## 7. تحسينات تشغيلية مستقبلية

راجع `docs/OPERATIONS.md §10`: logger منظّم، correlation IDs، بطاقة مراقبة أدمن، نسخ احتياطي مؤتمت، migrations مُدارة، صفحة حالة عامة.
