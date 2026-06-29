<div align="center">

# وثّق · Wathiq Workspace

**مساحة عمل ذكية لتحليل متطلبات الأعمال — عربية أولاً (RTL)**
**An AI-first workspace for Business Analysts — Arabic-first (RTL)**

`Next.js` · `React` · `TypeScript` · `Arabic-first / RTL`

</div>

---

# 🇸🇦 بالعربية

## نبذة عن المشروع

**وثّق (Wathiq)** هو منصة احترافية موجّهة لـ **محللي الأعمال (Business Analysts)** الذين يعملون على مشاريع برمجية مؤسسية. الفكرة أن تكون مساحة عمل هادئة وموثوقة تُحلَّل فيها المتطلبات وتُراجَع وتُنقّح — لا لوحة تحكم عامة، بل أداة مصمّمة خصيصاً لمجال تحليل الأعمال.

كل شاشة تعزّز هذا المجال عبر عناصره الحقيقية:
- **أرقام المتطلبات** (FR-014, NFR-003)
- **شارات الحالة** (مسودة، قيد التحليل، قيد المراجعة، بحاجة لمعلومات، معتمد، محظور)
- **مؤشرات ثقة الذكاء الاصطناعي** (Confidence)
- **أصحاب المصلحة، معايير القبول، قواعد العمل، الأسئلة المفتوحة، المعلومات الناقصة، الأولويات**

تجربة الذكاء الاصطناعي **شفّافة** عمداً — تعرض التقدّم والاستنتاج ودرجة الثقة والتوصيات بدل أن تتصرّف كصندوق أسود.

## الهوية البصرية

- **الألوان:** كحلي (Navy) للهوية، أزرق الثقة (Trust Blue) للتفاعل، وتركواز (Teal) يرمز دائماً للذكاء الاصطناعي.
- **الخطوط:** IBM Plex Sans Arabic للنصوص، و IBM Plex Mono لأرقام المتطلبات والبيانات التقنية.
- **الطابع:** مستوحى من Linear و Notion و GitHub و Vercel — مساحات بيضاء سخيّة، ظلال خفيفة، زوايا 12px، تباين واضح في الخطوط.

## الشاشات الأربع

| الشاشة | الوصف |
|--------|-------|
| **نظرة عامة** | صحّة المشروع: شريط جاهزية المتطلبات، تغطية معايير القبول، متوسط ثقة الذكاء الاصطناعي، قائمة المعلومات الناقصة، وأحدث المتطلبات. |
| **المتطلبات** | خلاصة الذكاء الاصطناعي، شرائح تصفية حسب الحالة، وشبكة بطاقات المتطلبات (اضغط أي بطاقة → التفاصيل). |
| **تفاصيل المتطلب** | ترويسة (المعرّف + الحالة + الأولوية + أصحاب المصلحة)، تبويبات (معايير القبول / قواعد العمل / الأسئلة المفتوحة)، ولوحة جانبية فيها تحليل وثّق الشفّاف + أزرار الاعتماد. |
| **تحليل وثّق** | خط أنابيب الذكاء الاصطناعي الشفّاف: رفع مستند ← تقدّم خطوة بخطوة مباشر ← النتائج (الأعداد + الثقة + التوصيات). اضغط **«ابدأ التحليل التجريبي»** لمشاهدته يعمل. |

## التقنيات المستخدمة

- **[Next.js 15](https://nextjs.org/)** (App Router) — إطار العمل
- **[React 19](https://react.dev/)** — واجهة المستخدم
- **[TypeScript](https://www.typescriptlang.org/)** — أنواع صارمة
- **[lucide-react](https://lucide.dev/)** — الأيقونات
- **CSS Custom Properties (Design Tokens)** — نظام التصميم بالكامل (ألوان، خطوط، مسافات، ظلال) منقول داخل التطبيق
- **IBM Plex Sans Arabic + IBM Plex Mono** — عبر Google Fonts

## من وين بدأنا ووين وصلنا

1. **نقطة البداية:** حزمة تسليم من [Claude Design](https://claude.ai/design) — نماذج تصميم بـ HTML/CSS/JS مبنية من وصف المنتج + الشعار فقط (بدون كود سابق أو Figma). موجودة في مجلد [`project/`](./project) وتفاصيل المحادثة في [`chats/`](./chats).
2. **القراءة والفهم:** قرأنا حزمة التصميم كاملة — `ui_kits/workspace/index.html` وكل مستورداته، ملفات التوكنز، و13 مكوّناً.
3. **إعادة البناء:** حوّلنا النماذج إلى **تطبيق حقيقي** بـ Next.js + TypeScript في [`wathiq-app/`](./wathiq-app):
   - نقل **التوكنز** (ألوان، خطوط، مسافات، تأثيرات) إلى CSS.
   - نقل **13 مكوّناً** إلى مكوّنات React مُوثّقة الأنواع وقابلة لإعادة الاستخدام.
   - بناء **الهيكل + الشاشات الأربع** مع تنقّل تفاعلي.
4. **التحقق:** `npm run build` نجح بدون أخطاء (Compile + Type-check + Lint)، والتطبيق يعمل ويعرض المحتوى العربي بشكل صحيح (RTL).
5. **النشر:** المشروع كامل مرفوع على هذا المستودع. ✅

## التشغيل

```bash
git clone https://github.com/alialq146/wathiq.git
cd wathiq/wathiq-app
npm install
npm run dev      # http://localhost:3000
```

## بنية المستودع

```
.
├── README.md            ← هذا الملف
├── HANDOFF.md           ← ملاحظات حزمة التسليم الأصلية
├── project/             ← حزمة تصميم Wathiq الأصلية (نماذج HTML، توكنز، مكوّنات)
├── chats/               ← محادثة التصميم الأصلية
└── wathiq-app/          ← ⭐ التطبيق الفعلي (Next.js + TS)
    └── src/
        ├── app/             ← التخطيط (RTL) + التوجيه + globals.css
        ├── styles/tokens/   ← توكنز التصميم (ألوان، خطوط، مسافات...)
        ├── components/ds/    ← الـ13 مكوّناً + مساعد الأيقونات
        ├── components/workspace/ ← الهيكل + الشاشات الأربع
        └── lib/data.ts       ← بيانات تجريبية (مشاريع، متطلبات، معايير...)
```

## ملاحظات

- البيانات **تجريبية** لأن التصميم مبني على الوصف + الشعار فقط (لا منتج حقيقي أو Figma).
- الأيقونات: **Lucide**، والخطوط من **Google Fonts** (يمكن استضافتها محلياً لاحقاً).

---

# 🇬🇧 In English

## About

**Wathiq (وثّق)** is a professional platform built specifically for **Business Analysts** working on enterprise software projects. It's a calm, trustworthy workspace where requirements are analyzed, reviewed, and refined — **not** a generic dashboard, but a tool designed for the Business Analysis domain.

Every screen reinforces that domain through its real artifacts:
- **Requirement IDs** (FR-014, NFR-003)
- **Status badges** (Draft, Analyzing, In Review, Needs Info, Approved, Blocked)
- **AI Confidence indicators**
- **Stakeholders, Acceptance Criteria, Business Rules, Open Questions, Missing Information, Priorities**

The AI experience is deliberately **transparent** — it shows progress, reasoning, confidence, and recommendations instead of acting like a black box.

## Visual identity

- **Colors:** Navy (brand), Trust Blue (interactive), and Teal — which always means "AI".
- **Type:** IBM Plex Sans Arabic for UI text, IBM Plex Mono for requirement IDs and technical metadata.
- **Feel:** Inspired by Linear, Notion, GitHub, and Vercel — generous whitespace, subtle shadows, 12px radii, strong typographic hierarchy.

## The four screens

| Screen | Description |
|--------|-------------|
| **Overview** | Project health: requirements-readiness band, acceptance-criteria coverage, average AI confidence, a Missing-Information list, and recent requirements. |
| **Requirements** | AI summary banner, status filter chips, and a grid of requirement cards (click a card → detail). |
| **Requirement detail** | Header (ID + status + priority + stakeholders), tabs (Acceptance Criteria / Business Rules / Open Questions), and a right rail with the transparent AI panel + approval actions. |
| **Analysis** | The transparent AI pipeline: upload → live step-by-step progress → results (counts + confidence + recommendations). Click **«ابدأ التحليل التجريبي»** to watch it run. |

## Tech stack

- **[Next.js 15](https://nextjs.org/)** (App Router)
- **[React 19](https://react.dev/)**
- **[TypeScript](https://www.typescriptlang.org/)** (strict)
- **[lucide-react](https://lucide.dev/)** — icons
- **CSS Custom Properties (Design Tokens)** — the full design system, ported into the app
- **IBM Plex Sans Arabic + IBM Plex Mono** — via Google Fonts

## Where we started & where we landed

1. **Starting point:** a handoff bundle from [Claude Design](https://claude.ai/design) — HTML/CSS/JS prototypes built from a product brief + logo only (no prior code, no Figma). See [`project/`](./project) and the design conversation in [`chats/`](./chats).
2. **Read & understood:** the full design bundle — `ui_kits/workspace/index.html` and all its imports, token files, and 13 components.
3. **Rebuilt:** converted the prototypes into a **real Next.js + TypeScript app** in [`wathiq-app/`](./wathiq-app):
   - Ported the **tokens** (colors, type, spacing, effects) to CSS.
   - Ported **13 components** into typed, reusable React components.
   - Built the **shell + four screens** with interactive routing.
4. **Verified:** `npm run build` passes clean (compile + type-check + lint); the app runs and renders Arabic content correctly (RTL).
5. **Shipped:** the complete project lives in this repository. ✅

## Run it

```bash
git clone https://github.com/alialq146/wathiq.git
cd wathiq/wathiq-app
npm install
npm run dev      # http://localhost:3000
```

## Repository structure

```
.
├── README.md            ← this file
├── HANDOFF.md           ← original handoff-bundle notes
├── project/             ← original Wathiq design bundle (HTML prototypes, tokens, components)
├── chats/               ← original design conversation
└── wathiq-app/          ← ⭐ the real application (Next.js + TS)
    └── src/
        ├── app/             ← layout (RTL) + routing + globals.css
        ├── styles/tokens/   ← design tokens
        ├── components/ds/    ← the 13 components + Icon helper
        ├── components/workspace/ ← shell + four screens
        └── lib/data.ts       ← mock data (projects, requirements, criteria...)
```

## Notes

- Data is **mock** — the design was built from a brief + logo only (no real product or Figma).
- Icons: **Lucide**; fonts via **Google Fonts** (can be self-hosted later).

---

<div align="center">
<sub>Designed with Claude Design · Implemented with Claude Code</sub>
</div>
