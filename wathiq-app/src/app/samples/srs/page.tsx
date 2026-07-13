import { notFound } from "next/navigation";
import { getFeatureSettings } from "@/lib/settings";
import { buildSRSBody } from "@/lib/documents";
import { SAMPLE_CONTEXT } from "@/lib/sample-project";
import { SampleDocShell } from "@/components/samples/SampleDocShell";

export const metadata = {
  title: "نموذج وثيقة مواصفات النظام SRS · وثّق",
  description: "نموذج تجريبي لوثيقة مواصفات متطلبات النظام (SRS) كما تصدرها منصة وثّق من بيانات مشروع حقيقية.",
};

// نموذج ثابت: لا قاعدة بيانات ولا ذكاء اصطناعي — يُبنى وقت البناء ويُخدم كصفحة عامة.
export const revalidate = 300;

export default async function SampleSRSPage() {
  // v2.2: بوابة صفحات النماذج من إعدادات النظام (تحديث كل 5 دقائق).
  if (!(await getFeatureSettings()).samplesEnabled) notFound();
  const bodyHtml = buildSRSBody(SAMPLE_CONTEXT, { detailed: true });
  return (
    <SampleDocShell
      title="نموذج وثيقة مواصفات النظام — نظام إدارة طلبات العملاء"
      bodyHtml={bodyHtml}
      filename="wathiq-sample-srs.doc"
      otherHref="/samples/brd"
      otherLabel="نموذج BRD"
    />
  );
}
