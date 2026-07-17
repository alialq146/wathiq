# مخطط قاعدة البيانات — Database Schema

Source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma). Provider: PostgreSQL (Neon on Vercel). Prisma Client generator targets `native` + `rhel-openssl-3.0.x` (Vercel Linux runtime).

The schema mirrors the shapes in `src/lib/data.ts`, so the UI renders identically whether data comes from the database or the in-code fallback (DB-less mode).

---

## KEY DESIGN DECISION — لا علاقات مفاتيح أجنبية (No FK relations)

**There is NOT a single Prisma relation (`@relation`) or database-level foreign key in the entire schema.** Ownership and parent/child links are modeled as **plain string columns** (`ownerId`, `projectId`, `requirementId`, `userId`, `subscriptionId`, …) with **`@@index` only** — never `@relation`.

Implications a new engineer must internalize:

| Aspect | Consequence |
|--------|-------------|
| **Ownership scoping** | Enforced **entirely in the application layer**. Every query must filter by `ownerId`/`userId` (e.g. `prisma.requirement.findFirst({ where: { id, ownerId: userId } })` in `src/app/api/analyze-requirement/route.ts`). The database will happily return another user's rows if you forget the filter. |
| **No cascades** | The DB performs **no** `ON DELETE CASCADE`. Deleting a `User`/`Project` does **not** delete its children. |
| **Orphan rows possible** | Deleting a user can leave orphaned `Requirement`/`Invoice`/`AiUsage` rows. **This is intentional** — it favors auditability/history retention and keeps writes simple. Cleanup, if ever needed, is an explicit app-layer job. |
| **Referential integrity** | Not guaranteed by the DB — a `Requirement.projectId` may point to a non-existent `Project`. Code tolerates this (`projectId`, `ownerId` are frequently nullable). |
| **Joins** | Done manually in code (e.g. `Promise.all` of separate `findFirst` calls), not via Prisma `include`. |

### Migrations: `prisma db push`, not migration files

There is **no `prisma/migrations/` directory**. The schema is applied with **`prisma db push --skip-generate --accept-data-loss`** during build (`scripts/db-setup.mjs`, invoked by the `build` script in `package.json`). Notes:

- `--accept-data-loss` runs on every production build — a destructive schema change **can drop production data**. The safety valve is `SKIP_DB_PUSH=1` (skips push + seed entirely; see `docs/ENVIRONMENT_VARIABLES.md`).
- Seeding runs afterward via `prisma db seed` (`tsx prisma/seed.ts`), idempotent upserts.
- If no DB URL is configured, `db-setup.mjs` exits cleanly and the app serves in-code fallback data.

---

## Identity / Auth — الهوية والدخول

### `User`
Purpose: a registered account (passwords stored as scrypt hashes, never plain).

| Field | Notes |
|-------|-------|
| `id` | cuid PK |
| `email` | `@unique` |
| `passwordHash` | scrypt hash |
| `plan` | `FREE \| PRO \| ENTERPRISE` (default `FREE`) — **source of truth for quota & model routing** |
| `analysisCount`, `analysisLimit` | monthly counter + cap (default limit 3) |
| `resetDate` | when the monthly counter resets (nullable) |
| `subscriptionStatus` | `ACTIVE \| INACTIVE \| TRIALING \| CANCELED \| MANUAL` |
| `role` | `USER \| ADMIN \| SUPER_ADMIN` — never self-assigned (set via `scripts/make-admin.mjs`) |
| `accountStatus` | `ACTIVE \| DISABLED` (disabled users get no quota) |
| `limitOverride` | when true, `analysisLimit` is an admin-set custom cap that overrides plan defaults |

Indexes: none beyond the unique `email`.

### `PasswordResetToken`
Purpose: رمز استعادة كلمة المرور — hash only, valid 60 min, single-use (`usedAt`). The raw token is never stored or logged.

Key fields: `tokenHash` (`@unique`), `expiresAt`, `usedAt?`, `userId`.
Indexes: `@@index([userId])`, `@@index([expiresAt])`.

---

## AI — الذكاء الاصطناعي

### `AiUsage`
Purpose: one row per AI analysis attempt (success or blocked) for cost/usage monitoring.

Key fields: `userId`, `projectId?`, `requirementId?`, `documentId?`, `modelUsed`, `inputTokens?`, `outputTokens?`, `estimatedCost?`, `status` (`SUCCESS \| FAILED \| BLOCKED_LIMIT \| BLOCKED_AUTH \| BLOCKED_SIZE`), `errorMessage?`.
Indexes: `@@index([userId])`, `[projectId]`, `[requirementId]`, `[createdAt]`, and composite `@@index([status, createdAt])` (v2.4 — for counting blocks/errors over a time range in the cockpit).

Token/cost columns are nullable when the provider omits usage.

---

## Workspace / Requirements — مساحة العمل والمتطلبات

### `Project`
Purpose: a workspace/project; requirements and analyses belong to exactly one.

Key fields: `ownerId`, `name`, `code`, `status` (`draft \| active \| completed`), presentation (`color`, `icon`, `order`). Optional AI-context fields (improve assistant/BRD/SRS accuracy): `projectIdea`, `projectGoal`, `targetUsers`, `projectScope`, `outOfScope`, `relatedSystems`, `constraints`. Document applicability (v2.3): `brdApplicability`, `srsApplicability` — each `REQUIRED \| OPTIONAL \| NOT_APPLICABLE` (default `REQUIRED`; not booleans — `OPTIONAL` stays visible with no readiness impact, `NOT_APPLICABLE` is logically hidden, no data deleted).
Indexes: `@@index([ownerId])`.

### `ProjectModule`
Purpose: an optional module inside a project to organize requirements of large projects.

Key fields: `ownerId?`, `projectId`, `name`, `order`, `updatedAt`.
Indexes: `@@index([projectId])`, `@@index([ownerId])`.

### `Requirement`
Purpose: a single requirement (functional/non-functional). Links to a project and optionally a module via string columns.

Key fields: `id` (caller-supplied, e.g. `FR-001`), `ownerId?`, `projectId?`, `title`, `description`, `status`, `priority`, `type?`, `confidence?`, `criteria`, `openQuestions`, `module`, `stakeholders` (`String[]`), `source?`, `assignee?`, `version` (manual, default 1), `moduleId?`, `analysis` (`Json?` — the stored AI quality analysis), `order`, `updatedAt` (`@updatedAt` — used for v2.4 optimistic concurrency).
Indexes: `@@index([ownerId])`, `[projectId]`, `[moduleId]`.

### `AcceptanceCriterion`
Purpose: an acceptance criterion attached to a requirement. `ai:true` rows are regenerated by full analysis; manual rows are preserved.
Key fields: `requirementId?`, `text`, `done`, `ai`, `order`. Indexes: `@@index([requirementId])`, `[ownerId]`, `[projectId]`.

### `BusinessRule`
Purpose: a business rule tied to a requirement.
Key fields: `requirementId?`, `text`, `source`, `order`. Indexes: `@@index([requirementId])`, `[ownerId]`, `[projectId]`.

### `OpenQuestion`
Purpose: an open/stakeholder question tied to a requirement.
Key fields: `requirementId?`, `text`, `to`, `ai`, `answer?`, `order`. Indexes: `@@index([requirementId])`, `[ownerId]`, `[projectId]`.

### `AuditEvent`
Purpose: append-only activity log for the audit-trail screen.
Key fields: `ownerId?`, `projectId?`, `requirementId?`, `action`, `detail`, `actor` (default `"سارة العتيبي"`). Indexes: `@@index([requirementId])`, `[createdAt]`, composite `[action, createdAt]` (v2.4 launch-dashboard counters), `[ownerId]`, `[projectId]`.

---

## Analytics — التحليلات وملاحظات المستخدمين

### `UserFeedback`
Purpose: in-product user feedback (v1.9.11), a post-launch improvement channel. Stores no secrets/page content — only user input + light context.
Key fields: `userId`, `type`, `severity`, `message`, `currentPath?`, `plan?`, `userAgent?`, `status` (`open \| in_review \| closed`), `adminNote?`. Indexes: `@@index([status])`, `[createdAt]`, `[userId]`.

### `ProductEvent`
Purpose: internal lightweight product-usage events (v1.9.11), no external tooling. `metadata` is light only (task/export type, counters) — no requirement text or documents.
Key fields: `userId?`, `eventName`, `plan?`, `projectId?`, `requirementId?`, `metadata (Json?)`. Indexes: composite `@@index([eventName, createdAt])`, `[createdAt]`, `[userId]`.

---

## Billing & Subscriptions — الفوترة والاشتراكات (v2.0/v2.1)

Design principle: `User.plan` stays the source of truth for quota/routing; `Subscription` is the financial/temporal record. Activation/renewal updates `User.plan` inside the same atomic transaction.

### `Subscription`
Purpose: a historical subscription record — **each period is its own row, never overwritten**. "Current subscription" is computed (latest `ACTIVE` row covering today), not stored.
Key fields: `userId`, `plan`, `status` (`TRIAL \| SCHEDULED \| ACTIVE \| EXPIRED \| CANCELED \| SUSPENDED \| SUPERSEDED`), `billingCycle`, `startDate`, `endDate`, `price (Decimal 10,2)`, `currency` (default `SAR`), `autoRenew`, `source` (`MANUAL \| PAYMENT_GATEWAY \| ADMIN_GRANT \| TRIAL \| MIGRATED`), `previousSubscriptionId?`, `renewedFromId?`, `canceledAt?`, `supersededAt?`, `createdByAdminId?`.
Indexes: `@@index([userId, createdAt])`, `[userId, status]`, `[endDate, status]`, `[renewedFromId]`.

### `Invoice`
Purpose: an invoice with a **snapshot** of customer + issuer data at issue time, so historical invoices never change if the user later edits their name/settings.
Key fields: `invoiceNumber` (`@unique`), `userId`, `subscriptionId?`, `status` (`DRAFT \| PENDING \| PAID \| OVERDUE \| CANCELED \| REFUNDED`), amounts (`subtotal`, `discount`, `taxAmount`, `total` — all `Decimal 10,2`), `currency`, billing period, `customer*Snapshot`, `issuer*Snapshot`, `taxRateSnapshot (Decimal 5,2)`, `notes?` (shown to customer), `internalNote?` (**admin-only, never sent to customer**).
Indexes: `@@index([userId])`, `[status]`, `[issueDate]`.

### `InvoiceItem`
Purpose: a line item on an invoice. Key fields: `invoiceId`, `description`, `quantity`, `unitPrice`, `total` (`Decimal 10,2`). Index: `@@index([invoiceId])`.

### `Payment`
Purpose: a payment (cash/transfer now; `provider`/`providerPaymentId` reserved for future gateways). **No card data is ever stored.**
Key fields: `userId`, `invoiceId?`, `subscriptionId?`, `amount (Decimal 10,2)`, `currency`, `method` (`CASH \| BANK_TRANSFER \| MANUAL \| CARD \| PAYMENT_GATEWAY \| OTHER`), `status` (`PENDING \| COMPLETED \| FAILED \| REFUNDED \| CANCELED`), `paidAt`, `referenceNumber?`, `receivedByAdminId?`.
Indexes: `@@index([userId])`, `[invoiceId]`, `[paidAt]`.

### `SubscriptionReminder`
Purpose: subscription-expiry reminders; `scheduledFor` derived from `endDate`.
Key fields: `userId`, `subscriptionId`, `type` (`EXPIRY_7_DAYS \| EXPIRY_3_DAYS \| EXPIRY_1_DAY \| EXPIRED \| ADMIN_FOLLOW_UP`), `scheduledFor`, `sentAt?`, `channel` (`IN_APP \| EMAIL`), `status` (`PENDING \| SENT \| SKIPPED \| FAILED`).
Constraints: `@@unique([subscriptionId, type, scheduledFor, channel])` prevents duplicate reminders for the same period. Indexes: `@@index([userId])`, `[status, scheduledFor]`.

### `BillingAuditLog`
Purpose: a separate financial audit log — every subscription/invoice/payment operation recorded with its actor. `metadata` is light (plan/amount/status), no secrets/card data.
Key fields: `actorId?` (null for automated ops), `userId`, `entityType` (`SUBSCRIPTION \| INVOICE \| PAYMENT \| REMINDER \| EMAIL`), `entityId?`, `action`, `metadata (Json?)`. Indexes: `@@index([userId])`, `[createdAt]`.

### `CustomerBillingProfile`
Purpose: optional customer billing data used as a snapshot source when issuing invoices.
Key fields: `userId` (**PK** — one row per user), `legalName?`, `organizationName?`, `taxNumber?`, `commercialRegistration?`, `address?`, `billingEmail?`, `internalNote?` (admin-only). Indexes: none (PK is `userId`).

### `InvoiceCounter`
Purpose: per-year invoice-number counter; atomic increment inside a transaction guarantees uniqueness under concurrency (never `count+1`).
Key fields: `year` (**PK, Int**), `value`.

### `BillingSettings`
Purpose: centralized billing settings (v2.1) — **singleton row** (`id @default("singleton")`), fully admin-editable. **No secrets here** (email/payment/cron keys stay in env vars).
Key fields: `issuerName` (default `"وثّق"`), issuer identity fields, `defaultCurrency` (`SAR`), `taxEnabled`, `defaultTaxRate (Decimal 5,2)`, `taxLabel`, `invoicePrefix` (`INV`), `invoiceFooterText`, `defaultDueDays`, `paymentInstructions?`, `supportEmail?`. Indexes: none (singleton).

---

## Settings — الإعدادات المركزية (v2.2)

### `SystemSettings`
Purpose: centralized system settings — **singleton row**; each group is a typed JSON column deep-merged over safe code defaults (`src/lib/settings/defaults.ts`). Missing row/field = current default behavior verbatim. **No secrets here** (AI/DB/Session/Cron/Resend keys stay env vars).
Key fields: `id @default("singleton")`, `schemaVersion`, JSON columns: `general`, `contact`, `notifications`, `documents`, `plans`, `assistant`, `features`, `readiness`, `updatedByAdminId?`. See `docs/ADMIN_SETTINGS.md` + `docs/SETTINGS.md`.

### `SettingsAuditLog`
Purpose: audit log for settings changes — who changed which section, which fields, and safely-clipped old/new values (no secrets, no long full text).
Key fields: `adminId`, `section`, `action` (`*_SETTINGS_UPDATED \| SETTINGS_RESET_TO_DEFAULT`), `changedKeys (Json?)`, `diff (Json?)` (values clipped ≤120 chars), `reason?`. Indexes: `@@index([section, createdAt])`, `[createdAt]`.

---

## Readiness — مركز جاهزية المشروع والوثائق (v2.3)

### `ReadinessSnapshot`
Purpose: a lightweight historical readiness snapshot (the score is always recomputed from live data; the snapshot supports "last calculated" display without recomputing on every open).
Key fields: `projectId`, `ownerId`, `overallScore`, `brdScore?`, `srsScore?` (null when the document is not applicable — never zero), issue counts (`critical/important/optional`), `calculationVersion`, `settingsVersion`, `issues (Json?)` (clipped `[{code, severity, scope, entityType, entityId, count}]` — no requirement text). Indexes: `@@index([projectId, calculatedAt])`, `[ownerId]`.

### `ReadinessExportLog`
Purpose: log of document exports with readiness — who exported what, at what score, with which warnings.
Key fields: `projectId`, `userId`, `documentType` (`BRD \| SRS`), `readinessScore?`, `criticalIssuesCount`, `exportedWithWarnings`, `blocked` (attempt prevented by block policy). Indexes: `@@index([projectId, exportedAt])`, `[userId]`.

---

## Singletons & special primary keys (reference)

| Model | PK / special |
|-------|--------------|
| `BillingSettings` | `id @default("singleton")` |
| `SystemSettings` | `id @default("singleton")` |
| `CustomerBillingProfile` | PK is `userId` (one per user) |
| `InvoiceCounter` | PK is `year` (Int) |
| `Requirement` / `AcceptanceCriterion` / `BusinessRule` / `OpenQuestion` | `id` is caller-supplied (no `@default`) |
