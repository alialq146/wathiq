# وثّق · Wathiq — Primary User Journeys

> Step-by-step flows with the route/action exercised at each step. Server Actions
> live in `src/app/actions.ts`; routes in `src/app/api/**`.

---

## (a) New user: signup → first project → analyze → save → export

1. **Land on marketing page** — `GET /` while signed out renders `LandingPage`
   (`src/app/page.tsx`; middleware allow-lists `/`).
2. **Sign up** — `/signup` posts to `POST /api/auth/signup`
   (`api/auth/signup/route.ts`). Validates name/email/password, enforces
   `publicRegistrationEnabled`, creates the `User`, and sets the signed session
   cookie. New workspace starts **empty**.
3. **Enter the workspace** — `GET /` now renders `WorkspaceClient`
   (`src/app/page.tsx` → `getWorkspaceData`). Screen defaults to `overview`.
4. **Create the first project** — `ProjectFormDialog` → Server Action
   `createProject`. FREE plan is limited to **1 project** (plan gate in
   `actions.ts`). The new project becomes active (stored in the `wathiq_project`
   cookie).
5. **(Optional) Fill project context** — `ContextScreens` → `saveProjectContext`
   (idea, goal, target users, scope, out-of-scope, related systems, constraints).
   This context is later fed to the AI provider for better per-requirement analysis.
6. **Open the analysis screen** — nav to `analysis` (`AnalysisScreen.tsx`). Paste
   requirements text or upload a PDF.
7. **Run extraction** — `POST /api/analyze` (`api/analyze/route.ts`). Server:
   verifies session → **atomically reserves credits** (`runAiOperation` → `reserveCredits`) → calls the AI
   provider (`lib/ai.ts` → `analyzeDocument` / `analyzePdf`) → returns structured
   requirements + confidence + reasoning. A failure refunds the reserved credits.
8. **Save extracted requirements** — Server Action `saveExtractedRequirements`
   bulk-inserts into the active project (skips duplicate IDs).
9. **Refine per requirement** — open a requirement (`RequirementDetailScreen`), run
   a full quality analysis or a light assistant task via
   `POST /api/analyze-requirement`. Full analysis persists the analysis JSON,
   confidence, and regenerates AI acceptance criteria + stakeholder questions.
10. **Export** — `ExportDialog` builds the report/BRD/SRS/CSV client-side
    (`lib/export.ts`, `lib/documents.ts`). Document exports first call
    `checkDocumentExportAction` (server gate), then `logDocumentExportAction`.

---

## (b) Returning user: managing requirements

1. **Sign in** — `/login` → `POST /api/auth/login`. Redirects to `?next=` if present.
2. **Resume the workspace** — `GET /`. `getWorkspaceData(uid, activeProjectId)`
   loads only rows owned by the user; `page.tsx` re-checks `isAccountActive`.
3. **Switch project** — `setActiveProject(id)` (Server Action) validates ownership
   via `requireProjectAccess(id, uid, "view")` and updates the `wathiq_project`
   cookie.
4. **Find requirements** — `RequirementsScreen` with status filter chips + the
   `AppShell` search box (client-side filter/sort over the loaded set).
5. **Edit a requirement** — `RequirementFormDialog` → `saveRequirement(input,
   originalId)`. The server re-checks ownership, applies field caps/whitelists, and
   — if `optimisticConcurrencyEnabled` — rejects a stale save (`expectedUpdatedAt`)
   with `error: "conflict"`. Content changes auto-bump the version and write an
   audit entry.
6. **Move through the lifecycle** — `updateRequirementStatus` (draft → analyzing →
   review → needs_info → approved / blocked).
7. **Criteria & questions** — `addAcceptanceCriterion` / `toggleAcceptanceCriterion`
   / `addOpenQuestion` / `answerOpenQuestion`, keeping summary counts in sync.
8. **Review the trail** — the `audit` screen surfaces `AuditEvent` rows.

---

## (c) Readiness assessment

1. **Open the Readiness Center** — nav `readiness` (visible only when
   `readiness.enabled`), backed by Server Action `getProjectReadiness(projectId)`.
2. **Server computes readiness** — `calculateProjectReadiness` (`lib/readiness.ts`)
   loads the project + requirements + criteria counts + unanswered questions
   (ownership-scoped, no N+1) and runs the **pure** `computeReadiness` engine.
   **No AI is called and no credits are consumed.**
3. **Scoring** — 7 weighted axes (context, requirements, quality, acceptance,
   questions, status, docData). Non-applicable documents are excluded and weights
   are re-normalized over applied axes. Overall status: ready / ready_with_notes /
   needs_work / not_ready per thresholds.
4. **Plan trimming** — FREE (or any plan set to `summary` in `planAccess`) receives
   only the score, summary, and a capped list of issues (`freeMaxIssues`);
   per-axis and per-document detail is stripped **server-side**.
5. **Fix issues** — each issue carries a symbolic `fixAction` the UI uses to
   navigate to the relevant screen (context, requirements, a specific requirement).
6. **Adjust document applicability** — `updateProjectDocuments` (REQUIRED / OPTIONAL
   / NOT_APPLICABLE) changes what counts toward readiness.
7. **Recalculate** — passing `{ recalculate: true }` writes a fresh
   `ReadinessSnapshot`.
8. **Export decision** — before exporting a BRD/SRS, `checkDocumentExportAction`
   returns `allow` / `warn` / `block` based on applicability, `exportPolicy`, and
   critical-issue count.

---

## (d) Upgrade / subscription flow (manual, admin-activated)

1. **See limits** — the user runs out of AI credits or hits the project limit (e.g.
   `POST /api/analyze` rejected as over-limit) or visits `/pricing` /
   `/account/billing`.
2. **Request upgrade** — pricing/billing render a pre-filled WhatsApp link
   (`whatsappUpgradeLink` in `lib/plans.ts` / `buildWhatsappLink` in `lib/settings`).
   The user's email is **not** injected (privacy). Click is tracked
   (`upgrade_clicked`).
3. **Admin activates** — a SUPER_ADMIN opens the admin billing tab and calls
   `activateOrRenewSubscription` (`lib/billing.ts`): in one atomic transaction it
   creates the `Subscription`, optional `Invoice` + items, a `Payment`, syncs
   `User.plan` and the analysis limit, and writes billing audit rows. Immediate
   activation supersedes any current ACTIVE subscription; future start dates become
   `SCHEDULED`.
4. **User sees the new plan** — `/account/billing` (`account/billing/page.tsx`)
   calls `syncSubscriptionStatuses` on load, then shows the active subscription,
   usage, invoices, and history.
5. **Lifecycle** — on expiry, `processSubscriptionLifecycle` / `syncSubscriptionStatuses`
   flips the subscription to `EXPIRED` and returns the user to FREE (all data kept).
   Reminders (7/3/1/expiry-day by default) are generated idempotently.

---

## (e) Admin: managing settings & users

1. **Reach the admin dashboard** — `/admin` (`admin/page.tsx`). Requires accounts
   mode + DB; `requireSuperAdmin()` reads the role fresh from the DB. Non-admins get
   a locked notice; unauthenticated users are redirected to `/login?next=/admin`.
2. **Review overview / launch KPIs** — `getAdminOverview` (props) and
   `GET /api/admin/launch` (7/30-day metrics from internal tables only).
3. **Manage a user** — `GET /api/admin/users` (paginated + search),
   `GET /api/admin/users/[id]` (detail). Mutations via `POST /api/admin/users`:
   - `set-plan` (resets the credit grant for the new plan, clears any override),
   - `set-credits` / `clear-credits` (per-user credit grant override),
   - `reset-credits` (resets the user's credit-wallet usage),
   - `set-status` (ACTIVE / DISABLED — cannot disable yourself).
4. **Edit system settings** — `/admin/settings` → `PUT /api/admin/settings`
   (`lib/settings`). Each section is validated + clamped server-side; changes write
   a `SettingsAuditLog` diff and invalidate the settings cache.
5. **Billing administration** — `/admin/billing/settings` (issuer/tax/invoice
   config) and the billing subscription/invoice endpoints under `api/admin/billing`.
6. **Feedback triage** — `GET`/`PATCH /api/admin/feedback`.
