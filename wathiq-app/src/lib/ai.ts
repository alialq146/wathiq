import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisResult } from "./analysis-types";
import type { RequirementAnalysis } from "./data";

export type { AnalysisResult, ExtractedRequirement } from "./analysis-types";

export function hasAnthropicKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

// JSON Schema for structured output (no min/max constraints — not supported).
const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    confidence: { type: "integer" },
    reasoning: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
    acceptanceCriteriaCount: { type: "integer" },
    businessRulesCount: { type: "integer" },
    openQuestionsCount: { type: "integer" },
    requirements: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          status: {
            type: "string",
            enum: ["draft", "analyzing", "review", "needs_info", "approved", "blocked"],
          },
          priority: {
            type: "string",
            enum: ["critical", "high", "medium", "low"],
          },
          confidence: { type: "integer" },
          criteria: { type: "integer" },
          openQuestions: { type: "integer" },
          module: { type: "string" },
          stakeholders: { type: "array", items: { type: "string" } },
        },
        required: [
          "id",
          "title",
          "description",
          "status",
          "priority",
          "confidence",
          "criteria",
          "openQuestions",
          "module",
          "stakeholders",
        ],
      },
    },
  },
  required: [
    "summary",
    "confidence",
    "reasoning",
    "recommendations",
    "acceptanceCriteriaCount",
    "businessRulesCount",
    "openQuestionsCount",
    "requirements",
  ],
} as const;

const SYSTEM_PROMPT = `أنت "وثّق"، محلّل أعمال خبير ومساعد ذكاء اصطناعي متخصص في تحليل وثائق المتطلبات للأنظمة المؤسسية.
مهمتك: قراءة وثيقة المتطلبات المرفقة واستخراج المتطلبات الوظيفية وغير الوظيفية منها بدقة.

التزم بالتالي:
- اكتب كل المحتوى المُستخرَج بالعربية الفصحى الواضحة.
- أعطِ كل متطلب معرّفًا فريدًا: المتطلبات الوظيفية تبدأ بـ FR- (مثل FR-001) وغير الوظيفية بـ NFR- (مثل NFR-001).
- لكل متطلب: عنوان موجز، وصف دقيق، الحالة (draft إن كان مسودة)، الأولوية، نسبة ثقتك في الاستخراج (confidence من 0 إلى 100)، عدد معايير القبول المتوقّعة (criteria)، عدد الأسئلة المفتوحة (openQuestions)، الوحدة/الموديول، وقائمة أصحاب المصلحة المذكورين أو المتوقّعين.
- اجعل "status" غالبًا "draft" أو "needs_info" للمتطلبات المستخرجة حديثًا ما لم يدل النص على خلاف ذلك.
- في "summary": ملخّص شفّاف لما استخرجته بلغة واضحة.
- في "reasoning": ٢-٤ خطوات تشرح كيف حلّلت المستند (شفافية لا صندوق أسود).
- في "recommendations": ١-٣ توصيات عملية للمحلل البشري.
- إن كانت الوثيقة غامضة أو ناقصة، اخفض الثقة واذكر ذلك في التوصيات.
- لا تخترع متطلبات غير مدعومة بالنص؛ استخرج ما هو موجود فقط.`;

// Fallback model when the caller doesn't pass one (per-plan routing lives in
// lib/usage.ts and is passed in by the API routes).
const DEFAULT_MODEL = "claude-opus-4-8";


/**
 * يستخرج JSON المنظم من رد النموذج مع أخطاء مصنّفة تظهر كما هي في AiUsage
 * ولوحة الأدمن (السبب الحقيقي بدل SyntaxError غامضة):
 * - ai_response_truncated  → الرد انقطع عند حد الرموز (max_tokens).
 * - ai_response_parse_error → رد مكتمل لكنه ليس JSON صالحًا.
 * - ai_empty_response       → لا يوجد محتوى نصي في الرد.
 */
export function extractStructured<T>(
  response: Anthropic.Message,
  label: string
): T {
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error(`ai_empty_response [${label}]`);
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error(`ai_response_truncated: reached max_tokens before completing [${label}]`);
  }
  try {
    return JSON.parse(textBlock.text) as T;
  } catch (e) {
    throw new Error(`ai_response_parse_error: ${String(e).slice(0, 140)} [${label}]`);
  }
}

type UserContent = Anthropic.MessageParam["content"];

/** Token usage returned alongside every analysis, for cost tracking. */
export interface AiMeta {
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
}

export interface Analyzed<T> {
  result: T;
  meta: AiMeta;
}

/** Shared analysis runner — sends the user content and parses the structured result. */
async function runAnalysis(content: UserContent, model: string): Promise<Analyzed<AnalysisResult>> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    output_config: {
      format: { type: "json_schema", schema: ANALYSIS_SCHEMA },
    },
    messages: [{ role: "user", content }],
  } as Anthropic.MessageCreateParamsNonStreaming);

  return {
    result: extractStructured<AnalysisResult>(response, "document-analysis"),
    meta: {
      model,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
    },
  };
}

/** Analyze a pasted requirements document (plain text). */
export async function analyzeDocument(text: string, model: string = DEFAULT_MODEL): Promise<Analyzed<AnalysisResult>> {
  return runAnalysis(
    `حلّل وثيقة المتطلبات التالية واستخرج منها المتطلبات بشكل منظّم:\n\n---\n${text}\n---`,
    model
  );
}

/** Analyze an uploaded requirements PDF (base64, no data-URL prefix). */
export async function analyzePdf(base64: string, model: string = DEFAULT_MODEL): Promise<Analyzed<AnalysisResult>> {
  return runAnalysis(
    [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64 },
      },
      {
        type: "text",
        text: "حلّل وثيقة المتطلبات المرفقة (ملف PDF) واستخرج منها المتطلبات بشكل منظّم.",
      },
    ] as UserContent,
    model
  );
}

/* ============================================================
   Per-requirement quality analysis (axis 2). Reuses the same
   model/service — a single requirement in, a structured quality
   evaluation out.
   ============================================================ */

const SMART_ITEM = {
  type: "object",
  additionalProperties: false,
  properties: {
    rating: { type: "string", enum: ["pass", "partial", "fail"] },
    reason: { type: "string" },
  },
  required: ["rating", "reason"],
} as const;

const REQ_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    qualityScore: { type: "integer" },
    status: {
      type: "string",
      enum: ["ready", "needs_info", "needs_improvement", "high_risk"],
    },
    summary: { type: "string" },
    ambiguity: {
      type: "object",
      additionalProperties: false,
      properties: {
        vagueWords: { type: "array", items: { type: "string" } },
        missingInfo: { type: "array", items: { type: "string" } },
        assumptions: { type: "array", items: { type: "string" } },
        risks: { type: "array", items: { type: "string" } },
      },
      required: ["vagueWords", "missingInfo", "assumptions", "risks"],
    },
    stakeholderQuestions: { type: "array", items: { type: "string" } },
    acceptanceCriteria: { type: "array", items: { type: "string" } },
    smart: {
      type: "object",
      additionalProperties: false,
      properties: {
        specific: SMART_ITEM,
        measurable: SMART_ITEM,
        achievable: SMART_ITEM,
        relevant: SMART_ITEM,
        testable: SMART_ITEM,
      },
      required: ["specific", "measurable", "achievable", "relevant", "testable"],
    },
    improvedVersion: { type: "string" },
  },
  required: [
    "qualityScore",
    "status",
    "summary",
    "ambiguity",
    "stakeholderQuestions",
    "acceptanceCriteria",
    "smart",
    "improvedVersion",
  ],
} as const;

const REQ_SYSTEM_PROMPT = `أنت "وثّق"، محلّل أعمال خبير. مهمتك تقييم جودة متطلب واحد بدقة وشفافية، وليس استخراج متطلبات.

أعد النتائج بالعربية الفصحى الواضحة، والتزم بالتالي:
- qualityScore: درجة جودة المتطلب من ٠ إلى ١٠٠ بناءً على الوضوح والاكتمال وقابلية الاختبار وغياب الغموض.
- status: اختر واحدة — "ready" (جاهز)، "needs_info" (بحاجة لمعلومات)، "needs_improvement" (بحاجة لتحسين)، "high_risk" (مخاطر عالية).
- summary: جملة أو جملتان تلخّصان تقييمك.
- ambiguity: حلّل الغموض — vagueWords (كلمات غامضة كـ«سريع»، «سهل»)، missingInfo (معلومات ناقصة)، assumptions (افتراضات غير مؤكدة)، risks (مخاطر محتملة). كل حقل قائمة قد تكون فارغة.
- stakeholderQuestions: أسئلة دقيقة يجب الرجوع بها لأصحاب المصلحة لسد النواقص.
- acceptanceCriteria: معايير قبول قابلة للاختبار (صيغة واضحة قابلة للتحقق).
- smart: قيّم المتطلب وفق SMART. لكل عنصر (specific/measurable/achievable/relevant/testable) أعطِ rating من ["pass" مستوفٍ، "partial" جزئي، "fail" غير مستوفٍ] مع reason سبب مختصر بالعربية.
- improvedVersion: أعد صياغة المتطلب بنسخة محسّنة أوضح وأكثر قابلية للاختبار، مع الحفاظ على القصد الأصلي.
- كن صادقًا: إذا كان المتطلب غامضًا اخفض الدرجة واذكر السبب. لا تخترع تفاصيل غير مذكورة، بل اطرحها كأسئلة أو معلومات ناقصة.`;

export interface RequirementForAnalysis {
  id: string;
  title: string;
  description: string;
  module?: string;
  priority?: string;
  type?: string | null;
  stakeholders?: string[];
  notes?: string | null;
}

/* ------------------------------------------------------------
   مهام المساعد الخفيفة: كل مهمة ترسل prompt مركزًا وترجع الجزء
   المطلوب فقط — أرخص وأسرع من التحليل الشامل، وبنفس توجيه النماذج.
   ------------------------------------------------------------ */

export type AssistantTask = "improve" | "criteria" | "questions" | "ambiguity" | "risks";

export interface AssistantTaskResult {
  improvedVersion?: string;
  acceptanceCriteria?: string[];
  stakeholderQuestions?: string[];
  vagueWords?: string[];
  missingInfo?: string[];
  risks?: string[];
}

const STR_ARR = { type: "array", items: { type: "string" } } as const;

const TASK_CONFIG: Record<
  AssistantTask,
  { schema: object; instruction: string; maxTokens: number }
> = {
  improve: {
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { improvedVersion: { type: "string" } },
      required: ["improvedVersion"],
    },
    instruction:
      "أعد صياغة المتطلب بنسخة محسنة أوضح وأكثر قابلية للاختبار مع الحفاظ على القصد الأصلي. أعد improvedVersion فقط.",
    maxTokens: 2000,
  },
  criteria: {
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { acceptanceCriteria: STR_ARR },
      required: ["acceptanceCriteria"],
    },
    instruction:
      "اكتب ٣–٦ معايير قبول قابلة للاختبار لهذا المتطلب (صيغة واضحة يمكن التحقق منها). أعد acceptanceCriteria فقط.",
    maxTokens: 2000,
  },
  questions: {
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { stakeholderQuestions: STR_ARR },
      required: ["stakeholderQuestions"],
    },
    instruction:
      "اكتب ٢–٥ أسئلة دقيقة يجب الرجوع بها إلى العميل أو أصحاب المصلحة لسد نواقص هذا المتطلب. أعد stakeholderQuestions فقط.",
    maxTokens: 2000,
  },
  ambiguity: {
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { vagueWords: STR_ARR, missingInfo: STR_ARR },
      required: ["vagueWords", "missingInfo"],
    },
    instruction:
      "حلل غموض المتطلب: vagueWords (كلمات غامضة كـ«سريع»، «سهل») وmissingInfo (معلومات ناقصة تمنع التنفيذ). القوائم قد تكون فارغة.",
    maxTokens: 2000,
  },
  risks: {
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { risks: STR_ARR },
      required: ["risks"],
    },
    instruction:
      "استخرج المخاطر المحتملة في هذا المتطلب (تقنية، تنظيمية، أو تنفيذية) بصيغة مختصرة عملية. أعد risks فقط.",
    maxTokens: 2000,
  },
};

/** Run one focused assistant task on a requirement (cheaper than a full analysis). */
export async function runAssistantTask(
  req: RequirementForAnalysis,
  task: AssistantTask,
  model: string = DEFAULT_MODEL
): Promise<Analyzed<AssistantTaskResult>> {
  const cfg = TASK_CONFIG[task];
  const client = new Anthropic();
  const userText = `المتطلب:
الرقم: ${req.id}
العنوان: ${req.title}
الوصف: ${req.description}
${req.type ? `النوع: ${req.type}\n` : ""}${req.notes ? `ملاحظات: ${req.notes}\n` : ""}
المهمة: ${cfg.instruction}`;

  const response = await client.messages.create({
    model,
    max_tokens: cfg.maxTokens,
    system:
      "أنت «وثّق»، محلل أعمال خبير. نفذ المهمة المطلوبة فقط بدقة وبالعربية الفصحى، دون اختراع تفاصيل غير مذكورة.",
    output_config: { format: { type: "json_schema", schema: cfg.schema } },
    messages: [{ role: "user", content: userText }],
  } as Anthropic.MessageCreateParamsNonStreaming);

  return {
    result: extractStructured<AssistantTaskResult>(response, `task-${task}`),
    meta: {
      model,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
    },
  };
}

/** Analyze a single requirement's quality and return a structured evaluation. */
export async function analyzeRequirement(
  req: RequirementForAnalysis,
  model: string = DEFAULT_MODEL
): Promise<Analyzed<RequirementAnalysis>> {
  const client = new Anthropic();
  const userText = `قيّم جودة المتطلب التالي:

الرقم: ${req.id}
العنوان: ${req.title}
الوصف: ${req.description}
${req.type ? `النوع: ${req.type}\n` : ""}الوحدة: ${req.module ?? "—"}
الأولوية: ${req.priority ?? "—"}
أصحاب المصلحة: ${(req.stakeholders ?? []).join("، ") || "—"}${req.notes ? `\nملاحظات: ${req.notes}` : ""}`;

  const response = await client.messages.create({
    model,
    max_tokens: 8000,
    system: REQ_SYSTEM_PROMPT,
    output_config: {
      format: { type: "json_schema", schema: REQ_ANALYSIS_SCHEMA },
    },
    messages: [{ role: "user", content: userText }],
  } as Anthropic.MessageCreateParamsNonStreaming);

  return {
    result: extractStructured<RequirementAnalysis>(response, "requirement-quality"),
    meta: {
      model,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
    },
  };
}
