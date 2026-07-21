# وثّق · Wathiq — Project Overview

> Handoff documentation · version **2.5.0** (`src/lib/version.ts`)
> Arabic-first (RTL) Business-Analysis SaaS.

---

## ما هو وثّق؟ / What Wathiq is

**وثّق (Wathiq)** هي منصة **تحليل متطلبات الأعمال (Business Analysis)** موجّهة لمحللي
الأعمال العرب. الفكرة الأساسية: يبدأ المحلل من وثيقة متطلبات خام (لصق نص أو رفع PDF)،
فيستخرج **مزوّد الذكاء الاصطناعي** منها متطلبات منظّمة، ثم يديرها المحلل ويصقلها داخل
مساحة عمل، ويقيس جاهزية المشروع، ويصدّر وثائق احترافية (BRD / SRS / CSV).

In one line: **paste or upload a requirements document → the AI provider extracts
structured requirements, acceptance criteria, ambiguity/missing-info, and
stakeholder questions → manage & refine them in an Arabic workspace → assess
project/document readiness → export a BRD / SRS / CSV.**

The product is deliberately *not* a generic dashboard. Every screen speaks the BA
domain: requirement IDs (`FR-014`, `NFR-003`), status badges, AI confidence, SMART
quality scoring, stakeholders, acceptance criteria, business rules, open questions.
The AI experience is intentionally **transparent** — it shows reasoning, confidence,
and recommendations rather than acting as a black box.

Evidence: `README.md` (repo root + `wathiq-app/README.md`),
`src/components/landing/LandingPage.tsx`, `src/app/page.tsx`, `src/lib/ai.ts`.

---

## The core loop (what the product does)

| Stage | Where |
|-------|-------|
| Sign up / sign in (own isolated, empty workspace) | `src/app/api/auth/*`, `src/lib/auth.ts` |
| Create a project + fill project context (idea, goal, scope, users…) | `src/app/actions.ts` (`createProject`, `saveProjectContext`) |
| Analyze a document (paste text or upload PDF) → extracted requirements | `src/app/api/analyze/route.ts`, `src/lib/ai.ts` |
| Save extracted requirements into the workspace | `saveExtractedRequirements` in `src/app/actions.ts` |
| Manage requirements (CRUD, status, priority, modules, stakeholders) | `src/app/actions.ts`, `src/components/workspace/*` |
| Per-requirement AI assist (quality score, criteria, questions, ambiguity, risks, rewrite) | `src/app/api/analyze-requirement/route.ts`, `src/lib/ai.ts` |
| Readiness Center (project + BRD/SRS readiness, issues, weighted score) | `src/lib/readiness.ts`, `src/components/workspace/ReadinessScreen.tsx` |
| Export BRD / SRS / report (PDF via print, Word `.doc`, CSV) | `src/lib/export.ts`, `src/lib/documents.ts`, `src/components/workspace/ExportDialog.tsx` |
| Billing / subscription (manual, admin-activated) | `src/lib/billing.ts`, `src/app/account/billing/*` |

---

## Target users

- **Primary:** Business Analysts, requirements engineers, and project managers
  working on enterprise software, **Arabic-first**.
- Secondary: agencies / PMOs / government entities (the ENTERPRISE plan copy targets
  "الجهات الحكومية، الشركات، ومكاتب إدارة المشاريع" — see `src/lib/plans.ts`).

---

## Plans

Defined in `src/lib/plans.ts` and overridable through System Settings
(`src/lib/settings/defaults.ts` → `plans`), always clamped by hard ceilings.

| Plan | Arabic | Monthly AI credits\* | Projects | Price (display) | Upgrade path |
|------|--------|--------------------:|---------:|-----------------|--------------|
| **FREE** | مجاني | 30 (daily 10) | 1 | 0 | self-signup |
| **PRO** | احترافي | 400 | unlimited | 149 SAR/mo | WhatsApp → admin activates |
| **ENTERPRISE** | الأعمال | 5000 | unlimited / custom | "تواصل معنا" | WhatsApp → admin activates |

\* Credit grants are **admin-configurable defaults** (`settings.plans`), not hard-coded; every plan has a finite grant (cost protection). AI work is metered per task in credits — full model in `docs/AI_ACCOUNTING.md`.

- `projectLimit: null` means unlimited/custom; AI usage is metered in **credits** (per-task cost), not a single analysis cap.
- There is **no payment gateway**. Upgrades are manual: the user contacts sales via
  a pre-filled WhatsApp link, and a SUPER_ADMIN activates the subscription from the
  admin billing tab (`src/lib/billing.ts` → `activateOrRenewSubscription`).
- Hard ceilings (cannot be exceeded even by settings): `projectLimitMax: 500`,
  `monthlyCreditsMax`, `perRequestCreditMax`, `taskCreditMax`, … — `src/lib/settings/defaults.ts` (`HARD_CEILINGS`).

---

## Core value proposition

1. **Arabic-native BA tooling** — full RTL, Arabic domain vocabulary, Arabic export
   documents. Not a translated afterthought.
2. **Transparent AI** — extraction and per-requirement quality use structured JSON
   schemas with SMART scoring, confidence, and reasoning surfaced to the analyst
   (`src/lib/ai.ts`).
3. **Readiness before delivery** — a pure, deterministic engine scores project and
   document readiness (no AI, no credit cost) so teams catch gaps before issuing a
   BRD/SRS (`src/lib/readiness.ts`).
4. **Professional exports** — BRD, SRS, and analysis reports rendered client-side,
   Arabic/RTL-safe, print-to-PDF or editable Word, plus CSV for spreadsheets.

---

## Tech stack (summary)

| Layer | Choice | Evidence |
|-------|--------|----------|
| Framework | Next.js 15 (App Router) | `package.json`, `src/app/` |
| UI | React 19 + TypeScript (strict) | `package.json`, `tsconfig.json` |
| Styling | CSS custom-property design tokens (no Tailwind) | `src/styles/tokens/*` |
| Icons | `lucide-react` | `package.json` |
| ORM / DB | Prisma 6 + PostgreSQL (Neon on Vercel) | `prisma/schema.prisma`, `src/lib/db.ts` |
| AI | The AI provider's official SDK, settings-driven model routing + credit accounting | `src/lib/ai.ts`, `src/lib/ai-runtime.ts`, `src/lib/ai-operation.ts` |
| Auth | Signed HMAC-SHA256 session cookie (Edge-safe), scrypt passwords | `src/lib/auth.ts`, `src/lib/password.ts` |
| Email | Resend adapter (optional, off until configured) | `src/lib/mailer.ts`, `src/lib/billing-mailer.ts` |
| Hosting | Vercel (Fluid Compute, `maxDuration = 300` on AI routes) | `src/app/api/analyze/route.ts` |

**Model naming policy:** AI model IDs are never hard-coded into product copy. Per-plan
routing lives server-side in `src/lib/ai-runtime.ts` (settings `modelRouting` + `fallbackModel`)
and is overridable via the `AI_MODEL_FREE` / `AI_MODEL_PRO` / `AI_MODEL_ENTERPRISE` env vars;
the client never chooses a model. The API key is `ANTHROPIC_API_KEY`.

### Run modes (auth)

The app adapts to its environment (`src/lib/auth.ts`):

1. **Accounts mode** — a database URL is configured → full sign-up/sign-in, per-user
   isolated workspaces. This is the production mode.
2. **Owner mode (legacy)** — no DB, but `WATHIQ_AUTH_EMAIL` + `WATHIQ_AUTH_PASSWORD`
   set → single fixed credential.
3. **Open mode** — neither configured → no auth, in-code mock data
   (`src/lib/data.ts`). Safe default so the app runs out of the box.

---

## What the product does NOT do yet

Grounded in the code, not aspirations:

- **No payment gateway / self-serve checkout.** All upgrades are manual, admin-
  activated (`src/lib/billing.ts`). Payment methods are recorded, not charged.
- **No real team collaboration.** Access is **owner-only** today. `lib/access.ts`
  models `OWNER / EDITOR / REVIEWER` roles and `projectCollaborationEnabled` /
  `commentsEnabled` feature flags exist but default to `false` and expose no
  sharing UI (`src/lib/settings/defaults.ts`).
- **No comments feature** (flagged off — `commentsEnabled: false`).
- **No automated cron by default.** Subscription lifecycle runs opportunistically
  when the admin billing tab is opened; the `/api/cron/subscription-reminders`
  endpoint stays 403 until `CRON_SECRET` is set (`src/app/api/cron/...`).
- **Billing emails off by default** — gated by `BILLING_EMAIL_ENABLED` env AND the
  settings flag; nothing sends without a configured Resend provider.
- **PDF export is print-based**, not a server-generated PDF: it opens a print window
  and the user chooses "Save as PDF" (`src/lib/export.ts` → `exportDocumentPDF`).
- **No automated test suite / CI** — see `docs/TESTING.md`.
- Requirement extraction accepts **pasted text or PDF only** (size-capped); no
  DOCX/other formats (`src/app/api/analyze/route.ts`).
