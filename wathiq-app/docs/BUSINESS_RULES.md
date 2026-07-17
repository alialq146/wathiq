# وثّق · Wathiq — Enforced Business Rules

> Only rules **actually enforced in code** (v2.5.0), with the enforcing file and the
> behavior on violation. Not aspirational. Server logic is the source of truth; UI
> hiding is never treated as protection.

---

## Plan limits

| Rule | Enforced where | Behavior on violation |
|------|----------------|------------------------|
| FREE = 1 project; PRO/ENTERPRISE = unlimited (`null`) | `createProject` in `src/app/actions.ts` using `resolvedProjectLimitFor` (`lib/settings`) | Returns `{ ok:false, error:"plan-limit" }`; project not created |
| Monthly AI analyses: FREE 3, PRO 50, ENTERPRISE unlimited (`null`) | `reserveQuota` / `resolveQuota` in `src/lib/usage.ts` via `resolvedAnalysisLimitFor` | Over-limit → `POST /api/analyze[-requirement]` returns `error:"limit"`; a `BLOCKED_LIMIT` row logged; **no model call** |
| Plan/settings limits can only lower, never exceed hard ceilings (`analysisLimitMax 1000`, `projectLimitMax 500`) | `clampLimit` in `src/lib/settings/index.ts`; `HARD_CEILINGS` in `settings/defaults.ts` | Values above ceiling are clamped down |
| Per-user admin override wins over plan | `resolveQuota`/`reserveQuota` (`limitOverride ? user.analysisLimit : plan limit`) | Override limit applied; renewal won't touch `analysisLimit` while override is on (`lib/billing.ts`) |
| Light assistant tasks may require a paid plan / be disabled | `api/analyze-requirement/route.ts` + `assistantTaskBudget`, `getAssistantSettings` | Returns `task-disabled` / `assistant-plan-disabled` / `task-requires-paid`; quota released |

---

## Quota reservation & reset

| Rule | Enforced where | Behavior |
|------|----------------|----------|
| **Atomic reservation** closes the check-then-consume race | `reserveQuota` in `src/lib/usage.ts` — conditional `updateMany({ where:{ analysisCount:{ lt: limit } }, data:{ increment:1 } })` | Concurrent requests can never exceed the limit; a caller with no quota never reaches the model |
| Reservation happens **before** any model call | `api/analyze/route.ts`, `api/analyze-requirement/route.ts` | — |
| **Failure is not charged** | `releaseQuota` (decrement) called on any bail/error path in both AI routes | Reserved count is refunded; usage row logged `FAILED` |
| Monthly reset | `resolveQuota` / `reserveQuota` — if `resetDate` is null or elapsed, `analysisCount=0`, `resetDate=nextMonth(now)` | First use or new billing month starts a fresh counter |
| ENTERPRISE (unlimited) still increments count | `reserveQuota` (`limit == null` branch) | Counter is statistical only; never blocks |

---

## Account status gating (ACTIVE required)

| Rule | Enforced where | Behavior |
|------|----------------|----------|
| Every Server Action requires an existing, `ACTIVE` account | `requireActor` in `actions.ts` → `isAccountActive` (`lib/account.ts`) | Non-active/deleted → `unauthorized`; action denied |
| Quota reservation requires `accountStatus === "ACTIVE"` | `reserveQuota` (`lib/usage.ts`); `resolveQuota` rejects `DISABLED` | Returns `unauthorized`; no analysis, uncounted |
| Workspace page blocks non-active accounts | `src/app/page.tsx` → `isAccountActive` | Redirect `/login?err=disabled` |
| Login rejects `DISABLED` | `api/auth/login/route.ts` | `error:"disabled"` |
| `isAccountActive` fails **closed** on DB error | `lib/account.ts` (catch → `false`) | Denies rather than allowing an unknown-status session |
| Password reset ignores `DISABLED` accounts | `api/auth/forgot-password`, `api/auth/reset-password` | Generic response / invalid-token; no reset |

---

## Ownership isolation

| Rule | Enforced where | Behavior |
|------|----------------|----------|
| A user may only read/write their own rows | `scopeWhere(uid)` = `{ ownerId: uid }` (`lib/access.ts`), used as `ownedBy` in every mutating Server Action | Other users' rows are invisible → `not-found` |
| Project access is centralized (owner-only today) | `getProjectAccess` / `requireProjectAccess` (`lib/access.ts`) | Non-owner → `null` → route treats as 404/deny |
| AI routes scope the requirement to the owner | `api/analyze-requirement/route.ts` (`findFirst({ id, ownerId })`) | Cannot analyze a requirement you don't own |
| `moduleId` from the client must be owned **and** in the same project | `validModuleId` in `actions.ts` | Invalid module silently nulled (not stored) |
| Readiness/export queries are ownership-scoped | `calculateProjectReadiness`, `checkDocumentExport` (`lib/readiness.ts`) | Other project → `null` |
| Isolation is **not** a feature flag | `lib/access.ts` header contract | Ownership check cannot be disabled from settings |

---

## Requirement field validation & caps (v2.5)

Enforced in `clean()` / `cap()` in `src/app/actions.ts`. Over-cap input is **truncated**
(not rejected); invalid enums are normalized to a safe default.

| Field | Cap / rule | Behavior on violation |
|-------|-----------|------------------------|
| `title` | ≤ 300 chars; required non-empty | Truncated; empty → `missing-title` |
| `description` | ≤ 8000 chars | Truncated |
| `notes` | ≤ 4000 chars | Truncated (empty → `null`) |
| `type` | ≤ 120 chars | Truncated |
| `module` | ≤ 200 chars | Truncated |
| `source` | ≤ 200 chars | Truncated |
| `assignee` | ≤ 200 chars | Truncated |
| `moduleId` | ≤ 200 chars + ownership/project check | Truncated then validated → nulled if invalid |
| `stakeholders` | each ≤ 120 chars, max **50** items | Trimmed/sliced |
| `status` | whitelist: draft, analyzing, review, needs_info, approved, blocked | Unknown → `"draft"` |
| `priority` | whitelist: critical, high, medium, low | Unknown → `"medium"` |
| `confidence` | clamped 0–100 (or null) | Clamped |
| `criteria`, `openQuestions` | `max(0, round)` | Normalized |
| `version` | `max(1, round)` | Floored to 1 |
| Signup `name` | ≤ 120 chars, ≥ 2 | Truncated / `bad-name` |
| Project context fields | each ≤ 2000 chars | Truncated (`ctxField`) |
| Module name / description | ≤ 120 / ≤ 600 chars | Truncated |

---

## Optimistic concurrency

| Rule | Enforced where | Behavior |
|------|----------------|----------|
| A stale edit is rejected | `saveRequirement` in `actions.ts` — compares `expectedUpdatedAt` to `target.updatedAt` (1s tolerance) | If the row changed after the client loaded it → `error:"conflict"` (semantic 409) |
| Only when enabled | `getFeatureSettings().optimisticConcurrencyEnabled` (default `true`) | Disabled → last-write-wins |
| Missing `expectedUpdatedAt` skips the check | same | Legacy/import writes are not blocked |
| Content change auto-bumps version | `saveRequirement` | `version = version + 1` if title/description/notes changed and user didn't bump |

---

## Readiness rules

| Rule | Enforced where | Behavior |
|------|----------------|----------|
| Axis weights **must sum to 100** | `normalizers.readiness` in `src/lib/settings/index.ts` | Save rejected with `error:"weights-sum-invalid"` |
| Thresholds strictly ordered `readyMin > notesMin > needsWorkMin` | same normalizer | Rejected `thresholds-invalid` |
| Weights re-normalized over **applied** axes only | `computeReadiness` (`lib/readiness.ts`) | Non-applicable doc axis excluded; guarded against divide-by-zero / NaN / negatives / >100 (`clampScore`) |
| NOT_APPLICABLE documents are excluded (not scored 0) | `computeReadiness`, `buildDoc` | Doc contributes nothing to the overall score |
| Readiness never calls AI / never consumes quota | `lib/readiness.ts` (module contract) | Uses saved data + prior analyses only |
| Plan trimming for `summary` access | `getProjectReadiness` in `actions.ts` (`cfg.planAccess`, `freeMaxIssues`) | FREE gets score + capped issues; axis/doc detail stripped server-side |

---

## Document export gating

| Rule | Enforced where | Behavior |
|------|----------------|----------|
| NOT_APPLICABLE document cannot be exported | `checkDocumentExport` (`lib/readiness.ts`) | `{ ok:false, reason:"not-applicable", mode:"block" }` — enforced server-side even if the UI button is bypassed |
| `exportPolicy = block_critical` blocks a REQUIRED doc with critical issues | `checkDocumentExport` | `reason:"blocked", mode:"block"`; a blocked `ReadinessExportLog` row written |
| `exportPolicy = allow` (or feature disabled) → direct export | `checkDocumentExport` | `mode:"allow"` with no computation |
| Warnings when score/critical issues exist | `checkDocumentExport` | `mode:"warn"` (OPTIONAL docs always exportable with notes) |
| Export must pass access + is logged | `logDocumentExportAction` in `actions.ts` (`requireProjectAccess(..., "export")`) | Non-access → `not-found`; else `ReadinessExportLog` written |
| CSV formula-injection neutralized | `csvCell` in `src/lib/export.ts` | Cells starting `= + - @` / tab / CR prefixed with `'` |
| HTML output escaped (incl. single quote) | `esc` in `src/lib/export.ts` | `& < > " '` escaped |

---

## Billing lifecycle

Statuses (`lib/billing.ts`): `TRIAL, SCHEDULED, ACTIVE, EXPIRED, CANCELED, SUSPENDED, SUPERSEDED`.

| Rule | Enforced where | Behavior |
|------|----------------|----------|
| `User.plan` is the source of truth for quota/model | `lib/billing.ts` header + `lib/usage.ts` | Subscription is the financial/temporal record; activation/renewal syncs `User.plan` in the same transaction |
| At most one ACTIVE subscription per user | `syncSubscriptionStatuses`, `activateOrRenewSubscription` | Immediate activation supersedes the current ACTIVE (→ `SUPERSEDED`) |
| Activation is atomic | `activateOrRenewSubscription` | Subscription + payment + optional invoice/items + plan sync + audit succeed or fully roll back |
| Expiry → back to FREE, data kept | `syncSubscriptionStatuses`, `processSubscriptionLifecycle` | Sub → `EXPIRED`, `subscriptionStatus:"INACTIVE"`; projects/requirements/invoices preserved |
| Suspend stops paid features immediately | `setSubscriptionStatus("SUSPENDED")` | User → FREE now; data kept |
| Cancel keeps the plan until period end | `setSubscriptionStatus("CANCELED")` | Lifecycle downgrades at expiry, not immediately |
| Future start date → SCHEDULED | `activateOrRenewSubscription` (`startImmediate` false) | Plan not changed until start; activated later by sync |
| Admin `limitOverride` survives renewal | `activateOrRenewSubscription`, `syncSubscriptionStatuses` | Renewal skips `analysisLimit` when override is on |
| Paid invoice is locked | `updateInvoiceStatus` (`lib/billing.ts`) | PAID → only CANCELED/REFUNDED/PAID allowed (`paid-invoice-locked`) |
| Server-side input validation on activation | `activateOrRenewSubscription` | Invalid plan/cycle/method/dates/price → typed error, no write |
| Invoice numbers unique & sequential | `nextInvoiceNumber` (atomic `InvoiceCounter` upsert) | `INV-<year>-<6-digit seq>` |

---

## Other enforced gates

| Rule | Enforced where |
|------|----------------|
| Public registration can be disabled | `api/auth/signup/route.ts` (`publicRegistrationEnabled`) → `403 registration-disabled` |
| Maintenance mode blocks non-admins from the workspace | `src/app/page.tsx` (`maintenanceMode` + `requireSuperAdmin`) |
| Feedback gated | `submitFeedback` (`feedbackEnabled`) |
| Admin role read fresh from DB every request | `requireSuperAdmin` (`lib/admin.ts`) — revocation is immediate; never trusted from the cookie |
| Cron endpoint disabled without secret | `api/cron/subscription-reminders/route.ts` (`CRON_SECRET`) → `403` |
| Password reset: no user enumeration | `api/auth/forgot-password/route.ts` (always generic response, 5-min cooldown, 60-min token TTL) |
| Settings URLs must be http(s) | `safeUrl` in `lib/settings/index.ts` (rejects `javascript:` / `data:`) |
| Text-analysis size caps | `api/analyze/route.ts` — text ≤ 200,000 chars, PDF base64 ≤ ~4.4 MB |
