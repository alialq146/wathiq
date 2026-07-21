# مساعد وثّق الذكي — The AI Assistant

How Wathiq uses the AI provider. Sources: [`src/lib/ai.ts`](../src/lib/ai.ts), [`src/lib/analysis-types.ts`](../src/lib/analysis-types.ts), [`src/lib/ai-operation.ts`](../src/lib/ai-operation.ts), [`src/lib/ai-runtime.ts`](../src/lib/ai-runtime.ts), [`src/app/api/analyze/route.ts`](../src/app/api/analyze/route.ts), [`src/app/api/analyze-requirement/route.ts`](../src/app/api/analyze-requirement/route.ts). Credit accounting: `docs/AI_ACCOUNTING.md`.

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

Routing is **server-side only** and settings-driven (`src/lib/ai-runtime.ts:resolveRuntimeConfig`). The client never sends or sees a model name. Per request the model resolves in order: env `AI_MODEL_<PLAN>` override → `ai.modelRouting[plan]` (admin settings) → `ai.fallbackModel`.

| Plan | Env override | Settings fallback |
|------|--------------|-------------------|
| FREE | `AI_MODEL_FREE` | `ai.modelRouting.FREE` → `ai.fallbackModel` |
| PRO | `AI_MODEL_PRO` | `ai.modelRouting.PRO` → `ai.fallbackModel` |
| ENTERPRISE | `AI_MODEL_ENTERPRISE` | `ai.modelRouting.ENTERPRISE` → `ai.fallbackModel` |

`resolveRuntimeConfig(plan, task, level)` returns the provider/model plus timeout, retry count, and output-token cap (all from editable AI settings). The chosen model is recorded on `AiOperation.model`, and `estimateCostUsd()` derives the `estimatedCostUsd` column from the editable cost-rate table (best-effort, null when tokens are missing). Changing provider is a settings change, not code — see `docs/AI_ACCOUNTING.md` (§5).

---

## AI credit accounting — محاسبة النقاط

Since v2.6 the old single "analysis counter" is replaced by a full **credit accounting** system: `src/lib/ai-operation.ts` (`runAiOperation`), backed by `src/lib/entitlements.ts`, `src/lib/ai-credits.ts`, and `src/lib/ai-runtime.ts`. Each request runs an atomic, idempotent **reserve → execute → commit / refund** cycle against a per-user credit wallet, with an append-only ledger for audit:

- **Reserve before any provider call.** Entitlements resolve what the plan may run and the credit cost; an atomic reservation (guarded `updateMany` on the wallet + daily limit) either succeeds or is rejected (over-limit / insufficient balance / disabled account) **before** the provider is contacted. A rejected attempt is logged (`AiOperation` status `REJECTED`) and not billed.
- **Commit on success, refund on failure.** Success commits the actual cost (with token/cost figures); any failure or timeout **refunds** the reservation, so failures are never charged. State transitions use compare-and-set, so concurrent commit/refund cannot double-count.
- **Idempotency.** A client-supplied idempotency key makes retries safe — one charge per key.
- **Orphaned reservations.** A reservation left `RESERVED` by a crash is auto-refunded by a scheduled reaper.

Full detail (wallet fields, ledger, entitlements, reaper, admin controls) is the single source of truth in `docs/AI_ACCOUNTING.md`, `docs/DECISIONS/ADR-013-ai-credit-accounting.md`, and `docs/DECISIONS/ADR-014-orphaned-reservation-reaper.md`. This document does not duplicate it.

---

## Input caps & token bounds — حدود المدخلات والرموز

| Guard | Value | Location |
|-------|-------|----------|
| PDF base64 cap | `MAX_PDF_BASE64 = 4,400,000` (~3.3 MB PDF) → over it: log `BLOCKED_SIZE`, return `too-large` | `api/analyze/route.ts` |
| Pasted text — min | `< 20` trimmed chars → `too-short` | `api/analyze/route.ts` |
| Pasted text — max | `> 200,000` chars → `too-large` | `api/analyze/route.ts` (`MAX_TEXT_LEN`) |
| Full document analysis `max_tokens` | `8000` | `ai.ts:runAnalysis` |
| Per-requirement quality `max_tokens` | `3500` | `ai.ts:analyzeRequirement` |
| Light task `max_tokens` | per-task `ai.tasks[task].maxOutputTokens` × level `tokenMultiplier`, clamped to hard ceiling `outputTokensMax` (12000) | `ai-runtime.ts:resolveRuntimeConfig` (settings `ai.tasks`) |
| Full-analysis token setting ceiling | `12000` | `settings/defaults.ts:HARD_CEILINGS` |
| Route `maxDuration` | `300` seconds (Fluid Compute) | both routes |
| Context field clip | `400` chars/field; light-task description clip `4000`; notes `800` | `ai.ts` |

Additionally, **post-response guards** (`clip`, `clipArr`, `clampAnalysis`, `clampTaskResult`) trim over-long/over-count arrays and strings **after** parsing rather than rejecting the response. Length/count constraints deliberately live here, not in the JSON schema, so the code does not depend on `maxItems`/`maxLength` schema support. Parse failures surface classified errors: `ai_response_truncated` (hit `max_tokens`), `ai_response_parse_error`, `ai_empty_response`.

---

## Security properties — الخصائص الأمنية

1. **No model-name leak to the client.** The model is chosen server-side (`resolveRuntimeConfig`) and never accepted from the request body. Model names appear only in server logs / the `AiOperation` table / admin cockpit — never in public UI (`PublicSettings` explicitly excludes model names).
2. **System / user separation.** The instruction set is passed as the `system` prompt (`SYSTEM_PROMPT`, `REQ_SYSTEM_PROMPT`, `BASE_RULES`), while user-supplied text/PDF is passed only as `messages[].content` (role `user`). User input never merges into the system prompt, limiting prompt-injection blast radius. `BASE_RULES` also instructs the model to work only on the given text, invent nothing, and treat empty lists as valid.
3. **Input validation before spend.** Auth → atomic credit reservation → ownership check (`findFirst` with `ownerId`) → size/length caps all run **before** the provider is contacted. A user can only analyze a requirement they own; over-limit or oversized requests are blocked and logged, never sent.
4. **Ownership-scoped context.** Project/module context passed to the model (`buildContextBlock`) is loaded only from rows owned by the same user; missing context degrades gracefully to "not defined yet" placeholders and never fails the call.
5. **No secret leakage in logs.** Error messages stored in `AiOperation.errorMessage` are sliced to 300 chars; operation logging is best-effort and never throws into the request path.
