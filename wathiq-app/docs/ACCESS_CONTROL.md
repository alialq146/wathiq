# الصلاحيات والعزل · Access Control

> كيف تُفرض الملكية والأدوار والعزل بين المستأجرين. **هذا ملف حسّاس — أي تعديل هنا يمسّ الأمان.**

## 1. المبدأ

وثّق **single-owner** اليوم: كل مشروع وكل متطلب يملكه مستخدم واحد. لا فرق، لا مشاركة.
كل عزل بيانات يتم في **طبقة التطبيق** (لا في قاعدة البيانات — لا علاقات FK).

## 2. طبقات الفرض (Defense in depth)

| # | الطبقة | الملف | ماذا تفعل |
|---|--------|------|-----------|
| 1 | Middleware (Edge) | `src/middleware.ts` | يمنع المسارات غير العامة بلا كوكي جلسة صالح. **لا فحص أدوار** (لا وصول للقاعدة في Edge). |
| 2 | حارس الـ Action | `requireActor()` في `src/app/actions.ts` | يقرأ الجلسة، يرفض غير المصادَق (عند تفعيل الحسابات)، يعيد التحقق من `accountStatus=ACTIVE`. |
| 3 | عزل الملكية | `ownedBy(uid)` → `scopeWhere(uid)` في `src/lib/access.ts` | يُلحق `{ ownerId: uid }` بكل استعلام قراءة/كتابة حسّاس. |
| 4 | طبقة الوصول للمشروع | `getProjectAccess` / `requireProjectAccess` في `access.ts` | تحقق الوصول لمشروع محدد بصلاحية محددة (view/edit/delete/assistant/export). |
| 5 | حارس الأدمن | `requireSuperAdmin()` في `src/lib/admin.ts` | كل مسار `/api/admin/**`. **يقرأ الدور طازجًا من القاعدة** — لا يثق بالكوكي. |
| 6 | حارس الـ Cron | `CRON_SECRET` | `/api/cron/**` يرد 403 بلا السرّ. |

## 3. القاعدة الذهبية

> **لا تثق أبدًا بـ `ownerId` أو `userId` أو `role` القادم من العميل.**
> الملكية تأتي من الجلسة الموقّعة في الخادم؛ الدور يُقرأ من القاعدة.

## 4. العقد الموحّد `ProjectAccess`

```ts
interface ProjectAccess {
  userId, projectId, role;              // OWNER | EDITOR | REVIEWER
  canView, canEdit, canDelete, canUseAssistant, canExport; // booleans
}
```

مصفوفة `ROLE_CAPS` (في `access.ts`) تحوّل الدور إلى صلاحيات. اليوم `OWNER` فقط مُستخدَم؛
`EDITOR`/`REVIEWER` معرّفان ومجهّزان للمستقبل لكن لا مسار يُصدرهما بعد.

## 5. كيف تضيف فحص صلاحية لمسار جديد

- **قراءة/كتابة على صفوف المستخدم**: استخدم `...ownedBy(actor.uid)` في شرط `where`.
- **عملية على مشروع محدد**: `const access = await requireProjectAccess(projectId, uid, "edit"); if (!access) return denied;`
- **مسار أدمن**: `const admin = await requireSuperAdmin(); if (!admin) return 403;` أولًا.
- **لا تكتب فحص ملكية يدويًا مبعثرًا** — مرّ عبر هذه الدوال.

## 6. نقطة التوسّع للتعاون متعدد المستخدمين (مستقبلًا)

التعاون (ميزة #10 في `docs/ROADMAP.md`) هو التغيير الوحيد الذي يمسّ هذه الطبقة، ويتم **في ملف واحد** (`access.ts`):
1. جدول جديد `ProjectMember { projectId, userId, role }`.
2. `getProjectAccess` يستعلم العضوية إضافةً للملكية.
3. `scopeWhere` يتوسّع من `{ ownerId }` إلى `{ OR: [{ ownerId }, { project: { members: userId } }] }` (بأعمدة نصية، عبر استعلام مسبق لمعرّفات المشاريع المسموحة).
4. علم الميزة `projectCollaborationEnabled` موجود مسبقًا في الإعدادات.

لا حاجة لتعديل المسارات المستهلكة — كلها تقرأ العقد الموحّد.

## 7. الأدوار على مستوى النظام

| الدور | المصدر | الصلاحية |
|------|--------|----------|
| مستخدم عادي | `User.role = USER` | مساحة عمله فقط |
| مدير أعلى | `User.role = SUPER_ADMIN` | `/admin/**` + الإعدادات + الفوترة. يُمنح عبر `scripts/make-admin` |
| مالك (وضع legacy) | جلسة `uid="owner"` | وضع أحادي المستأجر (بلا حسابات) |

## 8. تحذيرات

- **لا تجعل طبقة الوصول Feature Flag** — لا يجوز تعطيل فحص الملكية من الإعدادات.
- **لا تُرجِع بيانات مستخدم آخر** حتى لو خُمِّن المعرّف — المعرّفات UUID لكن الاعتماد على العزل لا التخمين.
- عند إضافة نموذج جديد مُنطَّق: أضف `ownerId` (+ `projectId` إن لزم) + `@@index`، ومرّر استعلاماته عبر `scopeWhere`.
