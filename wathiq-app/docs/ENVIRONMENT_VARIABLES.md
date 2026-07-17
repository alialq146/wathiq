# متغيرات البيئة — Environment Variables

All secrets live in environment variables — **never** in the database or in `SystemSettings`/`BillingSettings`. Sources verified: [`.env.example`](../.env.example), [`scripts/db-setup.mjs`](../scripts/db-setup.mjs), [`src/lib/auth.ts`](../src/lib/auth.ts), [`src/lib/usage.ts`](../src/lib/usage.ts), [`src/lib/ai.ts`](../src/lib/ai.ts).

This file documents **names and behavior only** — never commit real values.

> **Graceful degradation is a core principle:** with no `DATABASE_URL` the app runs on in-code fallback data; with no `ANTHROPIC_API_KEY` the analysis screen shows a "connect a key" notice; with no email/cron config those features simply stay off. Nothing breaks.

---

## Documented in `.env.example`

| Variable | Required? | Purpose | Default / Fallback |
|----------|-----------|---------|--------------------|
| `DATABASE_URL` | Optional (recommended) | Postgres connection string (Neon/Vercel Postgres). Presence turns on the full account system + persistence. | If unset → app uses **in-code fallback data**, accounts off. |
| `ANTHROPIC_API_KEY` | Optional | Enables real AI document/requirement analysis (the AI provider key). | If unset → `hasAnthropicKey()` is false; analyze routes return `{ ok:false, error:"no-key" }` and the UI shows a connect-a-key notice. |
| `AI_MODEL_FREE` | Optional | Overrides the model used for FREE-plan analysis. | Falls back to the code default for FREE (`src/lib/usage.ts` `DEFAULT_MODELS`). |
| `AI_MODEL_PRO` | Optional | Overrides the model used for PRO-plan analysis. | Falls back to the code default for PRO. |
| `AI_MODEL_ENTERPRISE` | Optional | Overrides the model used for ENTERPRISE-plan analysis. | Falls back to the code default for ENTERPRISE. |
| `WATHIQ_SESSION_SECRET` | Optional (**strongly recommended in production**) | Secret used to HMAC-sign session cookies (`src/lib/auth.ts`). | Has a fallback chain — see below. |
| `USD_TO_SAR` | Optional | SAR conversion rate used for admin cost estimates only. | `.env.example` shows `"3.75"`. |
| `APP_URL` | Optional | Public origin used to build password-reset links, e.g. `https://…vercel.app`. | Falls back to `VERCEL_URL`. |
| `EMAIL_FROM` | Optional | Sender identity for outbound email, e.g. `وثّق <no-reply@domain>`. | If unset → email sends are skipped. |
| `RESEND_API_KEY` | Optional | Resend API key for password-reset (and billing) emails. | If unset → reset request logs `email_provider_not_configured` internally; user still sees the generic message. |
| `WATHIQ_AUTH_EMAIL` | Optional (DB-less only) | Owner-mode single fixed login email. Only used when there is **no** database. | Empty → owner mode off. |
| `WATHIQ_AUTH_PASSWORD` | Optional (DB-less only) | Owner-mode single fixed login password. Both email + password required to enable owner mode. | Empty → owner mode off. Also participates in the session-secret fallback chain. |
| `BILLING_EMAIL_ENABLED` | Optional | Master gate for billing emails (invoices/renewal/expiry). Must be `true` **and** `RESEND_API_KEY` + `EMAIL_FROM` set. AND-ed with the `billingEmailsEnabled` setting. | Default `"false"` — billing emails off. |
| `CRON_SECRET` | Optional | Enables `/api/cron/subscription-reminders`; sent as `Authorization: Bearer <secret>`. | If unset → cron endpoint **disabled entirely**; the same lifecycle processing runs when an admin opens the billing tab. |

---

## Read in code but NOT in `.env.example`

| Variable | Required? | Purpose | Default / Fallback |
|----------|-----------|---------|--------------------|
| `SKIP_DB_PUSH` | Optional | Operational safety valve (`scripts/db-setup.mjs`). When set to `1` or `true`, the build **skips `prisma db push --accept-data-loss` and the seed** — for safe deploys when the schema is managed manually/reviewed. | Unset → default behavior (push + seed run on every build). |
| `POSTGRES_PRISMA_URL` | Optional | Alternative Postgres URL — a fallback for `DATABASE_URL` in `db-setup.mjs`, `src/lib/auth.ts` (`hasDatabaseEnv`), and `db.ts`. | Used only if `DATABASE_URL` is empty. |
| `POSTGRES_URL` | Optional | Same fallback role as above (Vercel-injected variant). | Next in the fallback order after `POSTGRES_PRISMA_URL`. |
| `DATABASE_URL_UNPOOLED` | Optional | Non-pooled Postgres URL fallback. | Next in the fallback order. |
| `POSTGRES_URL_NON_POOLING` | Optional | Non-pooled Postgres URL fallback. | Last in the fallback order. |
| `VERCEL_URL` | Optional (auto) | Injected by Vercel; used as the origin fallback when `APP_URL` is unset. | Vercel-provided. |

**Database URL resolution order** (identical in `scripts/db-setup.mjs` and `src/lib/auth.ts:hasDatabaseEnv`):
`DATABASE_URL` → `POSTGRES_PRISMA_URL` → `POSTGRES_URL` → `DATABASE_URL_UNPOOLED` → `POSTGRES_URL_NON_POOLING`. The Prisma CLI itself only reads `env("DATABASE_URL")`, so `db-setup.mjs` normalizes the resolved value into `DATABASE_URL` before invoking Prisma.

---

## `WATHIQ_SESSION_SECRET` fallback chain — اقرأ هذا بعناية

`sessionSecret()` in `src/lib/auth.ts` resolves the cookie-signing key in this priority order:

1. `WATHIQ_SESSION_SECRET` (explicit secret — the intended production value)
2. `WATHIQ_AUTH_PASSWORD` (legacy owner-mode password)
3. `DATABASE_URL`
4. `POSTGRES_PRISMA_URL`
5. `POSTGRES_URL`
6. `DATABASE_URL_UNPOOLED`
7. `POSTGRES_URL_NON_POOLING`

**Why this matters — always set `WATHIQ_SESSION_SECRET` explicitly in production:**

- If you rely on the DB-URL fallback, **rotating or changing the database connection string silently invalidates every existing session cookie** (the HMAC key changes), logging all users out.
- An explicit, stable, long random `WATHIQ_SESSION_SECRET` decouples session validity from infrastructure changes and is the only value guaranteed to be intentional.
- The auth module is **Edge-compatible** (imported by `middleware.ts`) — it uses Web Crypto/`TextEncoder` only; do not add Node-only imports here.

**Recommendation:** In every production/preview deployment, set `WATHIQ_SESSION_SECRET` to a long random string and treat it as a rotating secret you control — never depend on the fallback chain.
