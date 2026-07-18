# وثّق · Wathiq — Testing & Verification (current state)

> Honest snapshot of how the project is verified **today** (v2.5.0). Read this
> before assuming a safety net exists.

---

## The honest baseline

**There is no automated unit/integration/e2e test suite and no CI.** Evidence:

- `package.json` has **no** `test` script and **no** test-runner dependency
  (no Jest, Vitest, Playwright, Cypress, Testing Library).
- There is no CI config (no `.github/workflows`, etc.) in the repo.

Verification today rests on three things:

1. **Type checking** — `tsc --noEmit` (strict TypeScript).
2. **Production build** — `next build` (compile + lint + type-check).
3. **Manual QA** against a local Postgres, plus a handful of committed
   **logic-level QA scripts** (`scripts/qa-v2*.mts`) that assert on library
   functions against a real database.

Do **not** describe the project as "tested" in the automated sense. It is
**type-checked, build-verified, and manually QA'd.**

---

## 1) Type-check

```bash
cd wathiq-app
npx tsc --noEmit
```

`tsconfig.json` is strict. This is the fastest correctness gate and should pass
before any commit.

---

## 2) Production build

```bash
cd wathiq-app
npm run build     # = node scripts/db-setup.mjs && next build
```

Notes:
- `scripts/db-setup.mjs` runs first. With a database URL it does
  `prisma db push --accept-data-loss` **and** seeds. Set `SKIP_DB_PUSH=1` to skip
  schema push + seed (recommended when the schema is managed manually / in
  production) — otherwise every build can mutate the connected DB.
- With no database URL configured, `db-setup` exits cleanly and the app builds
  against in-code fallback data (`src/lib/data.ts`).

---

## 3) Local Postgres for manual QA

The full account system, admin, billing, and readiness only work with a database.

```bash
# Option A: local Docker Postgres
docker run --name wathiq-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16

# .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/wathiq?sslmode=disable"
ANTHROPIC_API_KEY="..."           # enables real analysis; without it the analyze routes return "no-key"
WATHIQ_SESSION_SECRET="dev-secret"

# create schema + seed, then run
cd wathiq-app
npm run db:push       # prisma db push
npm run db:seed       # prisma db seed (prisma/seed.ts)
npm run dev           # http://localhost:3000
```

Helper scripts:
- `scripts/make-admin.mjs <email>` — promote a signed-up user to `SUPER_ADMIN`
  (no one becomes admin automatically).
- `scripts/seed-demo-user.mjs` — seed a populated demo user/workspace.

The app also runs **without** a database (open mode / mock data) for pure UI work,
but auth, quotas, billing, admin, and persistence are inactive there.

---

## 4) Committed QA scripts (logic-level, DB-backed)

Run with `tsx` against a real database. They create throwaway rows, assert on the
actual library functions, clean up, and exit non-zero on failure.

| Script | Covers |
|--------|--------|
| `scripts/qa-credits.mts` | AI accounting core: entitlements, atomic reserve (10/30 concurrency), idempotency (double-click = one charge), commit/refund, daily limit, insufficient credits, disabled account, override, rejected logging (19) |
| `scripts/qa-reaper.mts` | Orphaned-RESERVED reaper (refund, idempotent re-run, two concurrent reapers = one refund each, no double refund), status transitions, window resets (no-reset-before-expiry, monthly, daily), concurrency at reset boundary (19) |
| `scripts/qa-operation.mts` | `runAiOperation` orchestrator via a **deterministic provider mock**: success→commit (tokens/cost), failure→refund, double-click→duplicate, entitlement/credit rejection, unmetered path (18) |
| `scripts/qa-settings.mts` | Settings normalization: hard ceilings, negatives, excessive credits, invalid task keys, malformed arrays, reaper-config floors/caps, fallback to defaults (18) |
| `scripts/qa-billing.mts` | Billing↔credits: grant is a SET (repeated activation never accumulates), override precedence, expiry→FREE grant, sync idempotency (10) |
| `scripts/qa-http.mts` | HTTP guards on `/api/analyze` against a live server: unauthenticated (307 middleware), missing idempotency key, disabled account, insufficient credits, provider-failure→refund, duplicate key (9). Needs `WATHIQ_TEST_URL` + a running server + a (fake) `ANTHROPIC_API_KEY` |
| `scripts/qa-v23.mts` | Readiness engine (pure unit) + full DB scenarios, document applicability, export gating, weight re-normalization, ownership isolation |
| `scripts/qa-v24.mts` | Access layer (owner-only), optimistic concurrency condition, collaboration feature-flag defaults |

Example (service-level suites — need `DATABASE_URL` + `SKIP_DB_PUSH=1`):

```bash
cd wathiq-app
DATABASE_URL=... SKIP_DB_PUSH=1 npx tsx scripts/qa-credits.mts
DATABASE_URL=... SKIP_DB_PUSH=1 npx tsx scripts/qa-reaper.mts
# HTTP suite: start the server first (with a fake ANTHROPIC_API_KEY), then:
WATHIQ_TEST_URL=http://localhost:3111 DATABASE_URL=... npx tsx scripts/qa-http.mts
```

> **Real-provider success path is NOT covered by these suites** — they use a deterministic mock. See the manual test guide for verifying a real AI success against a live key.

These are **regression checks for specific releases**, not a general suite, and are
run manually — nothing invokes them automatically.

---

## 5) Manual persona QA (historical approach)

Because permission/isolation rules live server-side, QA has historically been done
by driving the app as distinct **personas** and confirming each one sees only what
it should. Set up an account per persona and exercise the flows with a browser (or
`curl` with a per-persona cookie jar, since sessions are cookie-based):

| Persona | Setup | What to verify |
|---------|-------|----------------|
| **FREE** | fresh signup | 1-project limit, 3 analyses/month then `error:"limit"`, readiness shows summary-only |
| **PRO** | admin `set-plan PRO` | multiple projects, 50 analyses, full readiness detail |
| **ENTERPRISE** | admin `set-plan ENTERPRISE` | unlimited analyses/projects, full features |
| **Admin** | `make-admin.mjs` | `/admin` loads; a non-admin persona gets the locked notice / 403 |

Cross-persona isolation is the key manual check: with persona A's session, attempts
to read/edit persona B's project, requirement, or invoice must return `not-found` /
be denied.

> Note: the committed scripts above are logic/DB-level. The persona/cookie-jar
> checks are manual and not captured as automated tests.

---

## 6) What a future test setup SHOULD add (recommended, NOT present)

These do **not** exist yet — they are recommendations, in rough priority order:

1. **Permission / ownership-isolation tests** — cross-user access to projects,
   requirements, criteria, questions, invoices, and readiness must return
   `not-found` / deny (`lib/access.ts`, `scopeWhere`, the AI routes).
2. **Open-redirect test** — the `?next=` parameter on `/login` and admin redirects
   must only accept same-origin, app-relative paths (guard against `//evil.com`
   and absolute URLs).
3. **CSV-injection test** — assert `csvCell` (`lib/export.ts`) prefixes cells
   starting with `= + - @` / tab / CR, so exported spreadsheets can't execute
   formulas.
4. **Credit-race test** — concurrent `POST /api/analyze` calls must never exceed the
   credit grant (`reserveCredits` atomic `updateMany`), failures must refund, and
   commit/refund transitions must be an atomic compare-and-set (no double refund
   under concurrency). Covered by `qa-credits.mts` + `qa-reaper.mts`.
5. **Readiness invariants** — weights-sum-100 validation, threshold ordering, and
   `clampScore` (no NaN / negatives / >100) as property tests.
6. **Billing lifecycle** — single-ACTIVE invariant, atomic activation rollback,
   expiry → FREE, paid-invoice lock.
7. **Auth** — signup/login validation, DISABLED gating, reset-token TTL/cooldown,
   no user enumeration on forgot-password.
8. **A CI pipeline** running `tsc --noEmit` + `next build` (with `SKIP_DB_PUSH=1`)
   + the above suite on every PR.
