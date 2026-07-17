# مساعد وثّق الذكي — The AI Assistant

How Wathiq uses the AI provider. Sources: [`src/lib/ai.ts`](../src/lib/ai.ts), [`src/lib/analysis-types.ts`](../src/lib/analysis-types.ts), [`src/lib/usage.ts`](../src/lib/usage.ts), [`src/app/api/analyze/route.ts`](../src/app/api/analyze/route.ts), [`src/app/api/analyze-requirement/route.ts`](../src/app/api/analyze-requirement/route.ts).

> **Naming convention:** in this document the model is referred to generically as **"the AI provider" / مزوّد الذكاء الاصطناعي**. Configuration keys (`ANTHROPIC_API_KEY`, `AI_MODEL_FREE/PRO/ENTERPRISE`) are the only vendor-specific names used, because they are config keys. No marketing model names appear in prose.

---

## What the assistant does — ماذا يفعل المساعد

The assistant is a business-analyst helper built on structured (JSON-schema) outputs. It has three surfaces:

1. **Document analysis → requirement extraction** (`/api/analyze`)
   Reads a pasted requirements document (plain text) **or** an uploaded PDF (base64) and extracts structured functional (`FR-…`) and non-functional (`NFR-…`) requirements. Output shape: `AnalysisResult` (`analysis-types.ts`): `summary`, `confidence`, `reasoning[]`, `recommendations[]`, `requirements[]`, plus criteria/rules/questions counts. `reasoning` is deliberately transparent ("not a black box").

2. **Per-requirement quality analysis** (`/api/analyze-requirement`, task `"full"`)
   Evaluates a single requirement and returns a rich `RequirementAnalysis`: `qualityScore` (0–100, weighted: clarity 30 + completeness 30 + testability 25 + unambiguity 15), `status`, SMART breakdown, ambiguity (vague words / missing info / assumptions / risks), stakeholder questions, acceptance criteria, and an `improvedVersion`. On success it **persists** the analysis, regenerates AI-authored criteria + questions (preserving manual ones), updates `confidence`/counts, and writes an `AuditEvent` — all inside one Prisma transaction (`maxWait 10s`, `timeout 30s`).

3. **Light assistant tasks** (`/api/analyze-requirement`, task ∈ `improve | criteria | questions | ambiguity | risks`)
   Focused, cheaper prompts that return only the requested slice (e.g. just acceptance criteria). Results are returned to the UI for the user to **decide whether to apply** — they are not auto-saved.

### BRD / SRS document generation
BRD/SRS documents are **not** produced by the AI provider. Only three files touch the provider SDK client (`src/lib/ai.ts` and the two analyze routes) — a grep for the SDK client constructor / `messages.create` confirms this. BRD/SRS are generated **deterministically from stored project/requirement data** (with section toggles in Document settings). The AI provider's only role there is upstream — extracting/analyzing the requirements that feed the documents. The `aiDisclosureText` document setting notes that some parts were prepared with AI assistance.

---

## OPTIONAL and explicit — اختياري وبتصرّف صريح من المستخدم

- The assistant is **entirely optional**. Every AI call runs only on an explicit user action hitting `/api/analyze` or `/api/analyze-requirement` — there is no background/automatic invocation.
- If `ANTHROPIC_API_KEY` is absent, both routes return `{ ok:false, error:"no-key" }` **before any other work** (`hasAnthropicKey()`), and the UI shows a connect-a-key notice. The rest of the app works normally without a key.
- The assistant can also be gated by admin settings (`features.assistantEnabled`, per-plan `enabledForFree/Pro/Enterprise`, per-task `enabled`/`requiresPaidPlan`) — see `docs/ADMIN_SETTINGS.md`.

---

## Model routing per plan — توجيه النماذج حسب الخطة

Routing is **server-side only** (`src/lib/usage.ts:modelForPlan`). The client never sends or sees a model name.

| Plan | Env override | Fallback (code default) |
|------|--------------|--------------------------|
| FREE | `AI_MODEL_FREE` | cheapest default in `DEFAULT_MODELS.FREE` |
| PRO | `AI_MODEL_PRO` | balanced default in `DEFAULT_MODELS.PRO` |
| ENTERPRISE | `AI_MODEL_ENTERPRISE` | most-capable default in `DEFAULT_MODELS.ENTERPRISE` |

`modelForPlan(plan)` resolves the plan id, checks `process.env["AI_MODEL_<ID>"]`, and falls back to the code default. The chosen model is recorded in `AiUsage.modelUsed`, and `estimateCost()` uses per-model USD rate tables for the `estimatedCost` column (best-effort, null when tokens are missing).

---

## Quota reservation — الحجز الذري للحصة

Quota is enforced with an **atomic reserve/release** pattern (`src/lib/usage.ts`) that closes the "check-then-consume" race:

- **`reserveQuota(userId)`** — reloads the user (rejects missing/`DISABLED` accounts as `unauthorized`), resets the monthly counter if `resetDate` has passed, then increments `analysisCount` with a **conditional `updateMany` (`where analysisCount < limit`)**. If `res.count === 0`, the limit is already reached → `{ ok:false, reason:"limit" }`. Parallel requests therefore **cannot** exceed the limit. Unlimited plans (ENTERPRISE, `limit == null`) increment the counter for statistics only.
- **`releaseQuota(userId)`** — decrements the counter (guarded `analysisCount > 0`). Called on **any** exit after reservation but before a successful model call, because **failures do not consume quota** (documented decision).
- The reservation happens **before any provider call**. A user with no remaining quota never reaches the AI provider at all; the blocked attempt is logged to `AiUsage` with status `BLOCKED_LIMIT` and is not billed against the balance.
- The per-user limit comes from `resolvedAnalysisLimitFor(plan)` unless `limitOverride` is set (admin custom cap), and is subject to the hard ceiling (`analysisLimitMax = 1000`).

---

## Input caps & token bounds — حدود المدخلات والرموز

| Guard | Value | Location |
|-------|-------|----------|
| PDF base64 cap | `MAX_PDF_BASE64 = 4,400,000` (~3.3 MB PDF) → over it: log `BLOCKED_SIZE`, return `too-large` | `api/analyze/route.ts` |
| Pasted text — min | `< 20` trimmed chars → `too-short` | `api/analyze/route.ts` |
| Pasted text — max | `> 200,000` chars → `too-large` | `api/analyze/route.ts` (`MAX_TEXT_LEN`) |
| Full document analysis `max_tokens` | `8000` | `ai.ts:runAnalysis` |
| Per-requirement quality `max_tokens` | `3500` | `ai.ts:analyzeRequirement` |
| Light task `max_tokens` | per-task `500–700`, overridable down via settings, hard ceiling `1500` | `ai.ts:TASK_CONFIG`, `settings:assistantTaskBudget` |
| Full-analysis token setting ceiling | `12000` | `settings/defaults.ts:HARD_CEILINGS` |
| Route `maxDuration` | `300` seconds (Fluid Compute) | both routes |
| Context field clip | `400` chars/field; light-task description clip `4000`; notes `800` | `ai.ts` |

Additionally, **post-response guards** (`clip`, `clipArr`, `clampAnalysis`, `clampTaskResult`) trim over-long/over-count arrays and strings **after** parsing rather than rejecting the response. Length/count constraints deliberately live here, not in the JSON schema, so the code does not depend on `maxItems`/`maxLength` schema support. Parse failures surface classified errors: `ai_response_truncated` (hit `max_tokens`), `ai_response_parse_error`, `ai_empty_response`.

---

## Security properties — الخصائص الأمنية

1. **No model-name leak to the client.** The model is chosen server-side (`modelForPlan`) and never accepted from the request body. Model names appear only in server logs / the `AiUsage` table / admin cockpit — never in public UI (`PublicSettings` explicitly excludes model names).
2. **System / user separation.** The instruction set is passed as the `system` prompt (`SYSTEM_PROMPT`, `REQ_SYSTEM_PROMPT`, `BASE_RULES`), while user-supplied text/PDF is passed only as `messages[].content` (role `user`). User input never merges into the system prompt, limiting prompt-injection blast radius. `BASE_RULES` also instructs the model to work only on the given text, invent nothing, and treat empty lists as valid.
3. **Input validation before spend.** Auth → atomic quota reservation → ownership check (`findFirst` with `ownerId`) → size/length caps all run **before** the provider is contacted. A user can only analyze a requirement they own; over-limit or oversized requests are blocked and logged, never sent.
4. **Ownership-scoped context.** Project/module context passed to the model (`buildContextBlock`) is loaded only from rows owned by the same user; missing context degrades gracefully to "not defined yet" placeholders and never fails the call.
5. **No secret leakage in logs.** Error messages stored in `AiUsage.errorMessage` are sliced to 300 chars; usage logging is best-effort and never throws into the request path.
