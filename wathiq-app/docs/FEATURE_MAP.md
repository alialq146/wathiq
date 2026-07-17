# وثّق · Wathiq — Feature Map

> Feature → route/action → key files. All paths are relative to `wathiq-app/`.
> Server Actions live in `src/app/actions.ts`; API routes in `src/app/api/**`.

Legend: **(SA)** = Server Action, **(API)** = route handler, **(page)** = App Router page.

---

## Authentication & account

| Feature | User-facing route | Key files | Notes |
|---------|-------------------|-----------|-------|
| Sign up | `/signup` | `src/app/signup/*`, `api/auth/signup/route.ts` (API) | Gated by `publicRegistrationEnabled`; name ≤120, email regex, password ≥8; sets signed session cookie |
| Log in | `/login` | `src/app/login/*`, `api/auth/login/route.ts` (API) | Accounts mode first, owner-mode fallback; DISABLED account rejected; `?next=` redirect, `?err=disabled` message |
| Log out | (action) | `api/auth/logout/route.ts` (API) | Clears session cookie |
| Forgot password | `/forgot-password` | `src/app/forgot-password/*`, `api/auth/forgot-password/route.ts` (API) | Always returns generic `{ok:true}` (no user enumeration); SHA-256 token, 60-min TTL, 5-min cooldown; email via Resend if configured |
| Reset password | `/reset-password?token=` | `src/app/reset-password/*`, `api/auth/reset-password/route.ts` (API) | Validates token hash + expiry + not-used; password ≥8; updates hash + marks token used in one transaction |
| Session layer | — | `src/lib/auth.ts`, `src/lib/session.ts`, `src/middleware.ts` | Signed HMAC-SHA256 cookie, 7-day TTL, Edge-safe; middleware gates non-public routes |
| Account active gate | — | `src/lib/account.ts` (`isAccountActive`) | Session alone is not enough — account must exist and be `ACTIVE` |

---

## Workspace (projects, requirements, context)

Main entry: `/` → `src/app/page.tsx` renders `WorkspaceClient` (signed in) or
`LandingPage` (guest). Screens are client-routed in
`src/components/workspace/WorkspaceClient.tsx`; nav in `AppShell.tsx`
(`ScreenId = overview | requirements | analysis | readiness | stakeholders | rules | audit`).

| Feature | Screen / action | Key files | Notes |
|---------|-----------------|-----------|-------|
| Overview (project health) | `overview` | `workspace/OverviewScreen.tsx` | Readiness band, criteria coverage, avg confidence, missing-info, recent reqs |
| Requirements list + search/filter/sort | `requirements` | `workspace/RequirementsScreen.tsx`, `AppShell.tsx` (search box) | Status filter chips, grid of `RequirementCard`; search wired through `AppShell` |
| Requirement detail | `detail` | `workspace/RequirementDetailScreen.tsx` | Tabs: acceptance criteria / business rules / open questions + AI insight rail |
| Create / edit requirement | (SA) `saveRequirement` | `actions.ts`, `workspace/RequirementFormDialog.tsx` | Field caps + whitelists (see BUSINESS_RULES); optimistic concurrency via `expectedUpdatedAt` |
| Bulk import extracted reqs | (SA) `saveExtractedRequirements` | `actions.ts` | Skips duplicate IDs; `moduleId` nulled on import |
| Change status | (SA) `updateRequirementStatus` | `actions.ts` | Ownership-checked; audit-logged |
| Delete requirement | (SA) `deleteRequirement` | `actions.ts` | Ownership-checked |
| Acceptance criteria (add/toggle) | (SA) `addAcceptanceCriterion`, `toggleAcceptanceCriterion` | `actions.ts` | Keeps requirement `criteria` count in sync |
| Open questions (add/answer) | (SA) `addOpenQuestion`, `answerOpenQuestion` | `actions.ts` | AI-suggested or manual |
| Append note / apply improved text | (SA) `appendRequirementNote`, `applyImprovedRequirement` | `actions.ts` | Used by the assistant apply-flow |
| Projects (create/edit/switch) | (SA) `createProject`, `updateProject`, `setActiveProject` | `actions.ts`, `workspace/ProjectFormDialog.tsx` | `createProject` is plan-gated (FREE = 1); active project stored in `wathiq_project` cookie |
| Project context | (SA) `saveProjectContext` | `actions.ts`, `workspace/ContextScreens.tsx`, `ProjectContextSection.tsx` | Idea/goal/users/scope/out-of-scope/systems/constraints, each ≤2000 chars |
| Project modules | (SA) `createProjectModule`, `updateProjectModule`, `deleteProjectModule` | `actions.ts` | Delete blocked if requirements are linked |
| Stakeholders view | `stakeholders` | `AppShell.tsx`, `ds/StakeholderGroup.tsx` | Derived from requirements |
| Business rules view | `rules` | `workspace/*` | |
| Audit log | `audit` | `actions.ts` (`logAudit`), `AuditEvent` model | Per-project change trail; `projectAuditLogEnabled` flag |
| Onboarding checklist | overview | `workspace/OnboardingChecklist.tsx` | |
| Feedback | (SA) `submitFeedback` | `actions.ts`, `workspace/FeedbackDialog.tsx` | Gated by `feedbackEnabled` |

---

## AI analysis

| Feature | Route | Key files | Notes |
|---------|-------|-----------|-------|
| Document analysis (text or PDF) | `POST /api/analyze` (API) | `api/analyze/route.ts`, `lib/ai.ts` | Atomic quota reserve → model call → structured JSON extraction; text ≤200k chars, PDF base64 ≤~4.4MB; `maxDuration=300` |
| Per-requirement full quality analysis | `POST /api/analyze-requirement` (task `full`) | `api/analyze-requirement/route.ts`, `lib/ai.ts` | Saves analysis JSON, confidence, regenerates AI criteria + questions; SMART scoring |
| Light assistant tasks | `POST /api/analyze-requirement` (`improve`/`criteria`/`questions`/`ambiguity`/`risks`) | same + `lib/settings` | Cheaper focused prompts; per-task enable / paid-plan / token budget from settings |
| Model routing & quota | — | `src/lib/usage.ts` | Per-plan model via env; atomic `reserveQuota` / `releaseQuota`; monthly reset; `AiUsage` logging |
| Analysis screen (UI) | `analysis` | `workspace/AnalysisScreen.tsx`, `ds/AIInsightPanel.tsx`, `ConfidenceMeter.tsx` | Transparent step-by-step pipeline |

---

## Readiness Center

| Feature | Route / action | Key files | Notes |
|---------|----------------|-----------|-------|
| Project readiness | (SA) `getProjectReadiness` | `actions.ts`, `lib/readiness.ts`, `workspace/ReadinessScreen.tsx` | Pure engine, 7 weighted axes, no AI/no quota; FREE = summary-only (plan-trimmed server-side) |
| Document (BRD/SRS) readiness | part of `getProjectReadiness` | `lib/readiness.ts` | Independent of overall score; respects applicability |
| Document applicability | (SA) `updateProjectDocuments` | `actions.ts` | REQUIRED / OPTIONAL / NOT_APPLICABLE per doc; no data deletion |
| Export gating check | (SA) `checkDocumentExportAction` | `actions.ts`, `lib/readiness.ts` (`checkDocumentExport`) | Enforces applicability + export policy server-side |
| Export logging | (SA) `logDocumentExportAction` | `actions.ts` | Writes `ReadinessExportLog` |
| Readiness snapshots | — | `lib/readiness.ts` | Lightweight history, written on demand or when >10 min stale |

---

## Documents & export (client-side)

| Feature | Where | Key files | Notes |
|---------|-------|-----------|-------|
| Analysis report (PDF/Word) | `ExportDialog` | `lib/export.ts` | `exportDocumentPDF` (print window), `exportDocumentWord` (`.doc`) |
| BRD / SRS documents | `ExportDialog` | `lib/documents.ts`, `lib/report-config.ts` | Section toggles from document settings; AI disclosure line |
| CSV export | `ExportDialog` | `lib/export.ts` (`exportCSV`) | UTF-8 BOM; **CSV-injection neutralized** (cells starting `= + - @` prefixed with `'`) |
| Sample BRD / SRS (public) | `/samples/brd`, `/samples/srs` | `src/app/samples/*`, `components/samples/SampleDocShell.tsx`, `lib/sample-project.ts` | Gated by `samplesEnabled` |

---

## Billing / subscription / account

| Feature | Route | Key files | Notes |
|---------|-------|-----------|-------|
| Account & subscription page | `/account/billing` | `account/billing/page.tsx`, `BillingClient.tsx` | Syncs sub statuses, shows plan/usage/invoices/history; gated by `billingEnabled` |
| Invoice view | `/account/billing/invoices/[invoiceId]` | `account/billing/invoices/[invoiceId]/*` | Customer invoice (no internal notes) |
| Billing profile | (SA) `saveBillingProfile` | `actions.ts` | Optional customer billing snapshot data |
| Pricing page | `/pricing` | `src/app/pricing/*`, `TrackedUpgradeLink.tsx` | Reads plan settings; WhatsApp upgrade CTA |
| Billing core | — | `src/lib/billing.ts` | Activate/renew, cancel/suspend, invoice status, MRR, lifecycle |

---

## Admin (SUPER_ADMIN only)

Guarded by `requireSuperAdmin()` (`src/lib/admin.ts`) — role read fresh from DB on
every request. Dashboard: `/admin` → `AdminClient` (tabs: Overview / Users /
AI-Usage / Errors / Launch / Billing).

| Feature | Route | Key files |
|---------|-------|-----------|
| Admin dashboard shell | `/admin` (page) | `admin/page.tsx`, `admin-data.ts`, `components/admin/AdminClient.tsx` |
| Users list (paginated, search) | `GET /api/admin/users` | `api/admin/users/route.ts` |
| User mutations (set-plan / set-limit / clear-limit / reset-count / set-status) | `POST /api/admin/users` | `api/admin/users/route.ts` |
| User detail (usage, cost, projects) | `GET /api/admin/users/[id]` | `api/admin/users/[id]/route.ts` |
| AI usage analytics | `GET /api/admin/usage` | `api/admin/usage/route.ts` |
| User feedback (list/update) | `GET`/`PATCH /api/admin/feedback` | `api/admin/feedback/route.ts` |
| Launch dashboard (7/30-day KPIs) | `GET /api/admin/launch` | `api/admin/launch/route.ts` |
| System settings | `/admin/settings`, `GET`/`PUT /api/admin/settings` | `admin/settings/*`, `api/admin/settings/route.ts`, `lib/settings/*` |
| Settings audit log | `GET /api/admin/settings/audit` | `api/admin/settings/audit/route.ts` |
| Billing admin (subscriptions/invoices) | `GET /api/admin/billing`, `.../subscription`, `.../invoice` | `api/admin/billing/*`, `components/admin/BillingAdmin.tsx` |
| Billing settings (issuer, tax, invoice) | `/admin/billing/settings`, `GET`/`PUT /api/admin/billing/settings` | `admin/billing/settings/*`, `api/admin/billing/settings/route.ts` |

---

## Legal, security, samples, health, cron

| Feature | Route | Key files | Notes |
|---------|-------|-----------|-------|
| Privacy policy | `/privacy` | `src/app/privacy/*`, `components/legal/LegalShell.tsx` | Public |
| Terms | `/terms` | `src/app/terms/*` | Public |
| Security page | `/security` | `src/app/security/*` | Public |
| Health check | `GET /api/health` | `api/health/route.ts` | Public (middleware allow-listed) |
| Subscription cron | `GET /api/cron/subscription-reminders` | `api/cron/subscription-reminders/route.ts` | 403 until `CRON_SECRET` set; `Authorization: Bearer <secret>` |
| Landing (marketing) | `/` (guest) | `components/landing/LandingPage.tsx` | Shown to signed-out users in accounts mode |
