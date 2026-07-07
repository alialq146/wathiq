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

/* ------------------------------------------------------------------
   قاعدة النظام الموحدة لكل مهام مساعد وثّق — منع الهلوسة والإسهاب
   من المصدر: العمل على النص المعطى فقط، والقوائم الفارغة صحيحة.
   ------------------------------------------------------------------ */
const BASE_RULES = `أنت «وثّق»، محلل أعمال محترف. قواعد ملزمة:
- اعمل على النص المعطى فقط؛ لا تفترض ولا تخترع تفاصيل غير مذكورة.
- إن لم يكفِ النص، أعد قوائم فارغة أو صِغ النقص كسؤال أو معلومة ناقصة.
- عربية فصحى موجزة؛ كل عنصر سطر واحد لا يتجاوز 120 حرفًا.
- لا مقدمات ولا اعتذارات ولا ذكر لهويتك التقنية.
- أعد JSON مطابقًا للمخطط فقط.`;

/* ------------------------------------------------------------------
   حراس ما بعد الاستجابة (validation آمن): نقصّ الفائض بدل رفض الرد —
   القيود تعيش هنا لا في مخطط الإرسال حتى لا نراهن على دعم مفاتيح
   maxItems/maxLength في واجهة المخططات، مع بقاء أخطاء
   ai_response_truncated / parse_error / empty_response كما هي.
   ------------------------------------------------------------------ */
const clip = (s: string | undefined | null, max: number): string => {
  const v = (s ?? "").trim();
  return v.length <= max ? v : v.slice(0, max - 1).trimEnd() + "…";
};
const clipArr = (a: string[] | undefined | null, maxItems: number, maxLen: number): string[] =>
  (Array.isArray(a) ? a : []).slice(0, maxItems).map((s) => clip(String(s), maxLen));

/** قصّ وصف المدخلات الطويل عند حد آمن — يوفر رموز الإدخال ويحد الإسهاب. */
const clipInput = (s: string | null | undefined, max: number): string => {
  const v = (s ?? "").trim();
  return v.length <= max ? v : v.slice(0, max) + "\n…[اقتُطع النص لطوله]";
};

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
    strengths: { type: "array", items: { type: "string" } },
    issues: { type: "array", items: { type: "string" } },
    recommendations: { type: "array", items: { type: "string" } },
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
    "strengths",
    "issues",
    "recommendations",
    "ambiguity",
    "stakeholderQuestions",
    "acceptanceCriteria",
    "smart",
    "improvedVersion",
  ],
} as const;

const REQ_SYSTEM_PROMPT = `${BASE_RULES}

مهمتك: تقييم جودة متطلب واحد بدقة واتساق (وليس استخراج متطلبات). التزم بالتالي:
- qualityScore (0–100) بمعايير مرجحة ثابتة: الوضوح 30 + الاكتمال 30 + قابلية الاختبار 25 + خلو الصياغة من الالتباس 15.
- status حسب العتبات: "ready" إذا كانت الدرجة 80+ ولا معلومات ناقصة جوهرية · "needs_info" إذا يمنع نقصُ معلوماتٍ التنفيذَ · "needs_improvement" إذا الصياغة ضعيفة لكنها مفهومة · "high_risk" عند تعارض أو أثر أمني/تنظيمي/تشغيلي واضح.
- summary: جملتان كحد أقصى (سبب الدرجة الرئيسي + أهم إجراء).
- strengths: حتى 4 نقاط قوة فعلية في المتطلب (قائمة فارغة إن لم توجد).
- issues: حتى 4 مشكلات جوهرية مرتبة بالأثر.
- recommendations: حتى 4 توصيات عملية مباشرة.
- ambiguity: vagueWords حتى 5 كلمات/عبارات وردت حرفيًا في النص · missingInfo حتى 5 معلومات يمنع غيابها التنفيذ · assumptions افتراضات مبنية على النص · risks حتى 4 مخاطر (تقنية/تنظيمية/تشغيلية).
- stakeholderQuestions: 3–5 أسئلة مغلقة قابلة للإجابة المباشرة، مرتبة بالأهمية، ولا تسأل عن مذكورٍ صراحة.
- acceptanceCriteria: 3–6 معايير بصيغة «يتحقق عندما …» قابلة للقياس.
- smart: لكل بعد rating من [pass, partial, fail] وreason بجملة واحدة تستشهد بالنص.
- improvedVersion: فقرة واحدة بنفس القصد؛ لا تضف نطاقًا جديدًا؛ ضع [يُحدد لاحقًا] مكان أي قيمة ناقصة بدل اختراعها.`;

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

/** خطر مُهيكل — أوضح للقارئ وأسهل للحفظ كملاحظة من سطر نصي حر. */
export interface RiskItem {
  title: string;
  category: "technical" | "operational" | "regulatory" | "security" | "data";
  severity: "low" | "medium" | "high";
  impact: string;
  mitigation: string;
}

export interface AssistantTaskResult {
  improvedVersion?: string;
  acceptanceCriteria?: string[];
  stakeholderQuestions?: string[];
  vagueWords?: string[];
  missingInfo?: string[];
  risks?: RiskItem[];
}

const STR_ARR = { type: "array", items: { type: "string" } } as const;

const RISK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          category: { type: "string", enum: ["technical", "operational", "regulatory", "security", "data"] },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          impact: { type: "string" },
          mitigation: { type: "string" },
        },
        required: ["title", "category", "severity", "impact", "mitigation"],
      },
    },
  },
  required: ["risks"],
} as const;

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
      "أعد صياغة واحدة فقط للمتطلب لا تتجاوز 80 كلمة، بصيغة «يجب أن يتيح النظام…» أو «يجب أن يقوم النظام بـ…». حافظ على القصد حرفيًا ولا تضف وظائف جديدة، وضع [يُحدد لاحقًا] مكان أي قيمة ناقصة.",
    maxTokens: 500,
  },
  criteria: {
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { acceptanceCriteria: STR_ARR },
      required: ["acceptanceCriteria"],
    },
    instruction:
      "اكتب 3–6 معايير قبول لهذا المتطلب حصرًا، كل معيار يبدأ بـ«يتحقق عندما…» وقابل للاختبار. غطِّ المسار الأساسي وحالة خطأ واحدة على الأقل وحدًّا قابلًا للقياس إن ذُكر في النص. لا تخترع أرقامًا أو قنوات أو مددًا غير مذكورة — استخدم [يُحدد لاحقًا].",
    maxTokens: 700,
  },
  questions: {
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { stakeholderQuestions: STR_ARR },
      required: ["stakeholderQuestions"],
    },
    instruction:
      "اكتب 3–5 أسئلة لصاحب المصلحة تسد أكبر نواقص هذا المتطلب. كل سؤال: مغلق قدر الإمكان (نعم/لا أو اختيار أو قيمة محددة)، يعالج نقصًا واحدًا، ويذكر سبب أهميته باختصار بين قوسين. رتبها من الأكثر حجبًا للتنفيذ، ولا تسأل عن مذكورٍ صراحة.",
    maxTokens: 600,
  },
  ambiguity: {
    schema: {
      type: "object",
      additionalProperties: false,
      properties: { vagueWords: STR_ARR, missingInfo: STR_ARR },
      required: ["vagueWords", "missingInfo"],
    },
    instruction:
      "افحص نص المتطلب فقط: vagueWords كلمات/عبارات وردت حرفيًا في النص وتحتاج تعريفًا قابلًا للقياس، وmissingInfo معلومات يمنع غيابها البدء بالتنفيذ. حتى 5 لكل قائمة، والقوائم الفارغة صحيحة إذا كان المتطلب واضحًا — لا تتكلف إيجاد غموض.",
    maxTokens: 600,
  },
  risks: {
    schema: RISK_SCHEMA,
    instruction:
      "استخرج حتى 5 مخاطر واقعية مرتبطة بنص هذا المتطلب تحديدًا (لا مخاطر مشاريع عامة). لكل خطر: title موجز، category من [technical, operational, regulatory, security, data]، severity من [low, medium, high]، impact الأثر المحتمل بجملة، mitigation إجراء تخفيف عملي بجملة. إن لم توجد مخاطر جوهرية أعد قائمة فارغة.",
    maxTokens: 700,
  },
};

/* حدود ما بعد الاستجابة لكل مهمة — تُطبق قصًا آمنًا لا رفضًا. */
export function clampTaskResult(task: AssistantTask, r: AssistantTaskResult): AssistantTaskResult {
  switch (task) {
    case "improve":
      return { improvedVersion: clip(r.improvedVersion, 600) };
    case "criteria":
      return { acceptanceCriteria: clipArr(r.acceptanceCriteria, 6, 160) };
    case "questions":
      return { stakeholderQuestions: clipArr(r.stakeholderQuestions, 5, 180) };
    case "ambiguity":
      return { vagueWords: clipArr(r.vagueWords, 5, 140), missingInfo: clipArr(r.missingInfo, 5, 140) };
    case "risks":
      return {
        risks: (Array.isArray(r.risks) ? r.risks : []).slice(0, 5).map((k) => ({
          title: clip(k.title, 120),
          category: k.category,
          severity: k.severity,
          impact: clip(k.impact, 180),
          mitigation: clip(k.mitigation, 180),
        })),
      };
  }
}

/** Run one focused assistant task on a requirement (cheaper than a full analysis). */
export async function runAssistantTask(
  req: RequirementForAnalysis,
  task: AssistantTask,
  model: string = DEFAULT_MODEL
): Promise<Analyzed<AssistantTaskResult>> {
  const cfg = TASK_CONFIG[task];
  const client = new Anthropic();
  // مدخلات المهام الخفيفة مقلصة عمدًا: العنوان والوصف والنوع والملاحظات فقط
  // (لا رقم ولا وحدة ولا أولوية ولا أصحاب مصلحة) — توفير رموز وحدّ من الإسهاب.
  const userText = `المتطلب:
العنوان: ${req.title}
الوصف: ${clipInput(req.description, 4000)}
${req.type ? `النوع: ${req.type}\n` : ""}${req.notes ? `ملاحظات: ${clipInput(req.notes, 800)}\n` : ""}
المهمة: ${cfg.instruction}`;

  const response = await client.messages.create({
    model,
    max_tokens: cfg.maxTokens,
    system: BASE_RULES,
    output_config: { format: { type: "json_schema", schema: cfg.schema } },
    messages: [{ role: "user", content: userText }],
  } as Anthropic.MessageCreateParamsNonStreaming);

  return {
    result: clampTaskResult(task, extractStructured<AssistantTaskResult>(response, `task-${task}`)),
    meta: {
      model,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
    },
  };
}

/* حدود ما بعد الاستجابة للتحليل الشامل — قص آمن يحفظ البنية. */
export function clampAnalysis(a: RequirementAnalysis): RequirementAnalysis {
  return {
    ...a,
    summary: clip(a.summary, 300),
    strengths: clipArr(a.strengths, 4, 140),
    issues: clipArr(a.issues, 4, 140),
    recommendations: clipArr(a.recommendations, 4, 140),
    ambiguity: {
      vagueWords: clipArr(a.ambiguity?.vagueWords, 5, 60),
      missingInfo: clipArr(a.ambiguity?.missingInfo, 5, 140),
      assumptions: clipArr(a.ambiguity?.assumptions, 5, 140),
      risks: clipArr(a.ambiguity?.risks, 4, 140),
    },
    stakeholderQuestions: clipArr(a.stakeholderQuestions, 5, 180),
    acceptanceCriteria: clipArr(a.acceptanceCriteria, 6, 160),
    improvedVersion: clip(a.improvedVersion, 700),
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
الوصف: ${clipInput(req.description, 6000)}
${req.type ? `النوع: ${req.type}\n` : ""}الوحدة: ${req.module ?? "—"}
الأولوية: ${req.priority ?? "—"}
أصحاب المصلحة: ${(req.stakeholders ?? []).join("، ") || "—"}${req.notes ? `\nملاحظات: ${clipInput(req.notes, 1200)}` : ""}`;

  const response = await client.messages.create({
    model,
    // المخرجات صارت مقيدة بأعداد وأطوال صريحة — 3500 سقف مريح بدل 8000.
    max_tokens: 3500,
    system: REQ_SYSTEM_PROMPT,
    output_config: {
      format: { type: "json_schema", schema: REQ_ANALYSIS_SCHEMA },
    },
    messages: [{ role: "user", content: userText }],
  } as Anthropic.MessageCreateParamsNonStreaming);

  return {
    result: clampAnalysis(extractStructured<RequirementAnalysis>(response, "requirement-quality")),
    meta: {
      model,
      inputTokens: response.usage?.input_tokens ?? null,
      outputTokens: response.usage?.output_tokens ?? null,
    },
  };
}
