import { buildBRDBody } from "@/lib/documents";
import { SAMPLE_CONTEXT } from "@/lib/sample-project";
import { SampleDocShell } from "@/components/samples/SampleDocShell";

export const metadata = {
  title: "نموذج وثيقة متطلبات الأعمال BRD · وثّق",
  description: "نموذج تجريبي لوثيقة متطلبات الأعمال (BRD) كما تصدرها منصة وثّق من بيانات مشروع حقيقية.",
};

// نموذج ثابت: لا قاعدة بيانات ولا ذكاء اصطناعي — يُبنى وقت البناء ويُخدم كصفحة عامة.
export default function SampleBRDPage() {
  const bodyHtml = buildBRDBody(SAMPLE_CONTEXT, { detailed: true });
  return (
    <SampleDocShell
      title="نموذج وثيقة متطلبات الأعمال — نظام إدارة طلبات العملاء"
      bodyHtml={bodyHtml}
      filename="wathiq-sample-brd.doc"
      otherHref="/samples/srs"
      otherLabel="نموذج SRS"
    />
  );
}
