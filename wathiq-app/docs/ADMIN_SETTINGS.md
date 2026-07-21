# إعدادات النظام المركزية — Admin System Settings (v2.2)

A new-engineer guide to the central settings system. Sources: [`src/lib/settings/types.ts`](../src/lib/settings/types.ts), [`src/lib/settings/defaults.ts`](../src/lib/settings/defaults.ts), [`src/lib/settings/index.ts`](../src/lib/settings/index.ts), [`src/app/api/admin/settings/route.ts`](../src/app/api/admin/settings/route.ts), and the developer reference [`docs/SETTINGS.md`](./SETTINGS.md).

> This document is the architectural overview. For the "how to add a new setting" step-by-step, defer to **`docs/SETTINGS.md`** rather than duplicating it.

---

## The `SystemSettings` singleton — صف واحد

Persistence is a **single row** `SystemSettings` with `id @default("singleton")`. Each setting group is its own **typed JSON column**. There is no per-user or per-tenant settings row — this is a global, platform-wide configuration.

| Group (JSON column) | Purpose | Type |
|---------------------|---------|------|
| `general` | Platform name/tagline, logo/favicon, locale/timezone, footer, social links, `showVersion` | `GeneralSettings` |
| `contact` | WhatsApp/email/phone, business hours, upgrade/renewal message + CTA text, show-toggles | `ContactSettings` |
| `notifications` | Subscription reminder days (30/14/7/3/1/expiry) + enable flags, in-app/email toggles, admin alerts, custom texts | `NotificationSettings` |
| `documents` | BRD/SRS section toggles, print options (A4), issuer/classification/version/disclosure text | `DocumentSettings` |
| `plans` | Per-plan (FREE/PRO/ENTERPRISE) display + AI entitlements (`monthlyCredits`, `dailyCreditLimit`, `perRequestCreditLimit`, `fullAnalysisEnabled`, `allowedTasks/Levels/Personas`), `projectLimit`, features, visibility | `PlanSettings` (`PlanDisplaySettings`) |
| `ai` | AI accounting & runtime (v2.6): per-task credit cost + token cap (`credits`, `maxOutputTokens`, `enabled`), level multipliers, personas, model routing/fallback, cost rates, timeout/retries, reservation-reaper timeout/batch | `AiSettings` |
| `features` | Feature flags (public registration, maintenance mode, demo, feedback, samples, assistant, export, billing, billing emails, future collaboration/comments) | `FeatureSettings` |
| `readiness` | Project/document readiness (v2.3): weights (sum = 100), thresholds, policies, per-plan access, default BRD/SRS applicability | `ReadinessSettings` |

Billing settings are **not** here — they live in the separate typed `BillingSettings` singleton (v2.1), to avoid duplication.

---

## Deep-merge over defaults — الدمج فوق الافتراضي

The stored value is a **partial** (`Partial`). On read, `readMerged()` (`settings/index.ts`) fetches the singleton and deep-merges each column over `SETTINGS_DEFAULTS` (`settings/defaults.ts`) via `mergeOverDefaults`:

- Missing row, missing field, or a DB read failure ⇒ **the exact historical default behavior** — this is the migration strategy: **no seed required, no automatic behavior change**.
- The merge only accepts keys that exist in the defaults and match the default's type (unknown keys ignored, arrays replaced whole, type-mismatches dropped). Defaults themselves are the golden "matches pre-v2.2 behavior verbatim" baseline.

`src/lib/settings/index.ts` is the **only** read/write entry point — no component reads the DB directly. Consume per-section getters server-side (`getContactSettings()`, `getAiSettings()`, …) and pass down via props; never fetch sensitive settings from the client.

---

## Caching & invalidation — التخزين المؤقت والإبطال

Two cache layers (`settings/index.ts`):

1. **Process-memory cache, TTL 60s** — `globalThis.__wathiqSettingsCache` boxes the merged value with a timestamp.
2. **Per-request React `cache()`** — `getSystemSettings = cache(readMerged)` dedupes reads within a single request.

On save, `updateSystemSettings()` calls **`invalidateSettingsCache()`**: the writing serverless instance sees the new value immediately; other instances pick it up within **≤ 60 seconds** (documented and accepted for operational settings). DB read failure falls back to defaults without breaking the platform.

---

## Server-side hard ceilings — السقوف الصلبة

`HARD_CEILINGS` (`settings/defaults.ts`) — the system can **lower** limits, never **raise** them past these. Enforced at **both** save (validation/normalizers) and read (`getResolvedPlan`, `getResolvedAiSettings`) time:

| Ceiling | Value |
|---------|-------|
| `projectLimitMax` | 500 |
| `monthlyCreditsMax` / `dailyCreditMax` | 1,000,000 |
| `perRequestCreditMax` | 5000 |
| `taskCreditMax` | 1000 |
| `levelMultiplierMax` | 10 |
| `outputTokensMax` | 12000 |
| `reservationTimeoutMinutesMax` / `reservationCleanupBatchSizeMax` | 1440 / 1000 |
| `reminderDaysMax` | 60 |
| `textMax` / `longTextMax` | 1000 / 4000 |

Each section has a **normalizer** in `index.ts` that clips strings, clamps numbers into range, validates booleans, and enforces `safeUrl` (http(s) only — rejects `javascript:`/`data:`). Cross-field invariants are rejected server-side, e.g. readiness weights must sum to 100 (`weights-sum-invalid`), thresholds must be strictly descending (`thresholds-invalid`), not all plans may be hidden (`all-plans-hidden`), invalid WhatsApp digits (`invalid-whatsapp`). **The server is the source of truth — never trust the client.**

---

## Audit — سجل التدقيق (`SettingsAuditLog`)

Every save writes a `SettingsAuditLog` row inside the same transaction as the upsert: `adminId`, `section` (uppercased), `action` (`<SECTION>_SETTINGS_UPDATED` or `SETTINGS_RESET_TO_DEFAULT`), `changedKeys`, and a `diff` produced by `flatDiff` with **each value clipped to ≤120 chars** (no secrets, no long full text), plus an optional `reason`. A `system_settings_updated` `ProductEvent` is also tracked. `changedKeys`/`diff` are captured automatically for any new field — no extra wiring.

---

## Access control — الصلاحيات

Editing is restricted to **`SUPER_ADMIN`** accounts only, via **`/admin/settings`** backed by:

- `GET /api/admin/settings` — merged settings + last-updated meta + `HARD_CEILINGS` (for display).
- `PUT /api/admin/settings` — `{ section, values, reason?, resetToDefault? }`.
- `GET /api/admin/settings/audit` — the audit log.

Both handlers call `requireSuperAdmin()` first and return `403` (`ADMIN_FORBIDDEN`) otherwise. Owner-mode sessions (`uid === "owner"`) and non-`SUPER_ADMIN` users are rejected.

---

## Secrets are NOT settings — الأسرار تبقى في البيئة

**No secret or key ever lives in `SystemSettings`.** The following stay Environment Variables (see `docs/ENVIRONMENT_VARIABLES.md`): `ANTHROPIC_API_KEY`, `AI_MODEL_FREE/PRO/ENTERPRISE` (model routing — model names never appear in any public UI), `DATABASE_URL`, the session secret, `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `BILLING_EMAIL_ENABLED`, `APP_URL`, and any future payment-gateway keys.

Two settings are deliberately **AND-ed** with an env master gate — the setting alone cannot enable the feature:

- `features.billingEmailsEnabled` **AND** `BILLING_EMAIL_ENABLED` (env) → billing emails.
- `notifications.emailRemindersEnabled` is likewise subordinate to the `BILLING_EMAIL_ENABLED` master gate.

Also kept **in code, not as settings**: ownership checks, the `SUPER_ADMIN` guard, atomic credit reservation, plan codes (FREE/PRO/ENTERPRISE), AI instructions/schemas (quality logic), the anti-hallucination phrasing (customizable text but the safe default lives in code and is never accepted empty), the hard ceilings, and error codes.

---

For adding a new setting (Type → Default → Validation → Admin UI → Audit → Cache → Consumption → Tests), follow the numbered checklist in **`docs/SETTINGS.md`**.
