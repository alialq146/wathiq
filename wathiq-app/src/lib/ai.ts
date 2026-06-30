import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisResult } from "./analysis-types";

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

/** Analyze a requirements document with Claude and return structured results. */
export async function analyzeDocument(text: string): Promise<AnalysisResult> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    output_config: {
      format: { type: "json_schema", schema: ANALYSIS_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: `حلّل وثيقة المتطلبات التالية واستخرج منها المتطلبات بشكل منظّم:\n\n---\n${text}\n---`,
      },
    ],
  } as Anthropic.MessageCreateParamsNonStreaming);

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text content returned from model");
  }

  const parsed = JSON.parse(textBlock.text) as AnalysisResult;
  return parsed;
}
