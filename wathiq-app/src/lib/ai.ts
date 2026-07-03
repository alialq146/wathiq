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

const MODEL = "claude-opus-4-8";

type UserContent = Anthropic.MessageParam["content"];

/** Shared analysis runner — sends the user content and parses the structured result. */
async function runAnalysis(content: UserContent): Promise<AnalysisResult> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    output_config: {
      format: { type: "json_schema", schema: ANALYSIS_SCHEMA },
    },
    messages: [{ role: "user", content }],
  } as Anthropic.MessageCreateParamsNonStreaming);

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content returned from model");
  }

  return JSON.parse(textBlock.text) as AnalysisResult;
}

/** Analyze a pasted requirements document (plain text). */
export async function analyzeDocument(text: string): Promise<AnalysisResult> {
  return runAnalysis(
    `حلّل وثيقة المتطلبات التالية واستخرج منها المتطلبات بشكل منظّم:\n\n---\n${text}\n---`
  );
}

/** Analyze an uploaded requirements PDF (base64, no data-URL prefix). */
export async function analyzePdf(base64: string): Promise<AnalysisResult> {
  return runAnalysis([
    {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: base64 },
    },
    {
      type: "text",
      text: "حلّل وثيقة المتطلبات المرفقة (ملف PDF) واستخرج منها المتطلبات بشكل منظّم.",
    },
  ] as UserContent);
}

/* ============================================================
   Per-requirement quality analysis (axis 2). Reuses the same
   model/service — a single requirement in, a structured quality
   evaluation out.
   ============================================================ */

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
        specific: { type: "boolean" },
        measurable: { type: "boolean" },
        achievable: { type: "boolean" },
        relevant: { type: "boolean" },
        testable: { type: "boolean" },
        notes: { type: "string" },
      },
      required: ["specific", "measurable", "achievable", "relevant", "testable", "notes"],
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
- smart: قيّم المتطلب وفق SMART بقيم منطقية (specific/measurable/achievable/relevant/testable) مع notes تشرح أي جانب ناقص.
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
}

/** Analyze a single requirement's quality and return a structured evaluation. */
export async function analyzeRequirement(
  req: RequirementForAnalysis
): Promise<RequirementAnalysis> {
  const client = new Anthropic();
  const userText = `قيّم جودة المتطلب التالي:

الرقم: ${req.id}
العنوان: ${req.title}
الوصف: ${req.description}
${req.type ? `النوع: ${req.type}\n` : ""}الوحدة: ${req.module ?? "—"}
الأولوية: ${req.priority ?? "—"}
أصحاب المصلحة: ${(req.stakeholders ?? []).join("، ") || "—"}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: REQ_SYSTEM_PROMPT,
    output_config: {
      format: { type: "json_schema", schema: REQ_ANALYSIS_SCHEMA },
    },
    messages: [{ role: "user", content: userText }],
  } as Anthropic.MessageCreateParamsNonStreaming);

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content returned from model");
  }
  return JSON.parse(textBlock.text) as RequirementAnalysis;
}
