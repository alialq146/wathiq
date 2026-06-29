**AIInsightPanel** — Wathiq's signature transparent-AI surface. Shows confidence, a plain-language summary, ordered reasoning steps, and recommendations so the AI never feels like a black box. Teal accent marks AI-authored content.

```jsx
<AIInsightPanel
  confidence={88}
  summary="استخرجت ٦ معايير قبول و٣ قواعد عمل من المستند المرفوع."
  reasoning={[
    "تحديد الجهات الفاعلة: المستخدم، النظام، منصة النفاذ.",
    "استخراج المسار الأساسي وحالات الاستثناء.",
    "مطابقة القواعد مع سياسات الأمان."
  ]}
  recommendations={[
    "أضف معيار قبول لحالة انتهاء صلاحية الجلسة.",
    "وضّح سلوك النظام عند فشل التحقق ثلاث مرات."
  ]}
/>
```

Set `state="analyzing"` to show the live pulse while the model is working.
