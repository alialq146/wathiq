"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { AIInsightPanel, Button, Card, Icon, PriorityLabel, StatusBadge } from "@/components/ds";
import { saveExtractedRequirements, type RequirementInput } from "@/app/actions";
import type { AnalysisResult } from "@/lib/analysis-types";

type Phase = "idle" | "running" | "done" | "error";

const STEPS = [
  { label: "قراءة المستند واستخراج النص", icon: "file-text" },
  { label: "تحديد الجهات الفاعلة والنطاق", icon: "users" },
  { label: "استخراج المتطلبات الوظيفية", icon: "clipboard-list" },
  { label: "اشتقاق معايير القبول", icon: "check-circle" },
  { label: "مطابقة قواعد العمل والسياسات", icon: "shield-check" },
  { label: "رصد المعلومات الناقصة والأسئلة", icon: "message-circle-question" },
];

const SAMPLE = `نظام إدارة طلبات الإجازات للموظفين.
يجب أن يتمكن الموظف من تقديم طلب إجازة يحدد فيه نوع الإجازة (سنوية، مرضية، اضطرارية) وتاريخ البداية والنهاية وسبب الإجازة.
يجب أن يعتمد المدير المباشر الطلب أو يرفضه خلال ٤٨ ساعة، مع إشعار الموظف بالنتيجة عبر البريد والتطبيق.
يجب أن يعرض النظام رصيد الإجازات المتبقي لكل موظف ويمنع تقديم طلب يتجاوز الرصيد.
يجب ألا يتجاوز زمن تحميل صفحة الطلبات ثانيتين تحت ٢٠٠ مستخدم متزامن.
يجب أن يحتفظ النظام بسجل تدقيق لكل عملية اعتماد أو رفض لمدة سنتين.`;

/* AI Analysis screen — real, transparent extraction via Claude.
   Paste a requirements document → Claude extracts structured requirements →
   review the results and save them to the database. */
export function AnalysisScreen() {
  const router = useRouter();
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [mode, setMode] = React.useState<"text" | "pdf">("text");
  const [text, setText] = React.useState("");
  const [pdf, setPdf] = React.useState<{ name: string; size: number; data: string } | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [active, setActive] = React.useState(0);
  const [result, setResult] = React.useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saveMsg, setSaveMsg] = React.useState<string | null>(null);
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // ~3.3MB raw PDF keeps the base64 body under Vercel's request limit.
  const MAX_PDF_BYTES = 3_300_000;

  const onFile = (file: File | null | undefined) => {
    setFileError(null);
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setFileError("الملف يجب أن يكون PDF.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setFileError("حجم الملف كبير — الحد الأقصى ٣ ميغابايت تقريبًا.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result || "");
      const base64 = res.includes(",") ? res.slice(res.indexOf(",") + 1) : res;
      setPdf({ name: file.name, size: file.size, data: base64 });
    };
    reader.onerror = () => setFileError("تعذّر قراءة الملف.");
    reader.readAsDataURL(file);
  };

  React.useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const ERRORS: Record<string, string> = {
    "no-key": "ميزة التحليل تتطلب ربط مفتاح Anthropic API في إعدادات الموقع (متغيّر ANTHROPIC_API_KEY).",
    "too-short": "النص قصير جدًا — الصق وثيقة متطلبات أطول.",
    "too-large": "حجم الملف كبير جدًا — استخدم ملفًا أصغر من ٣ ميغابايت.",
    failed: "تعذّر التحليل. حاول مرة أخرى.",
    network: "تعذّر الاتصال بالخادم. تأكد من اتصالك وحاول مجددًا.",
  };

  const canRun = mode === "text" ? text.trim().length >= 20 : Boolean(pdf);

  const run = async () => {
    if (!canRun) return;
    setPhase("running");
    setActive(0);
    setResult(null);
    setErrorMsg(null);
    setSaveMsg(null);

    // Cosmetic progress while the model works — hold before the last step.
    let i = 0;
    timer.current = setInterval(() => {
      i = Math.min(i + 1, STEPS.length - 1);
      setActive(i);
    }, 700);

    try {
      const payload =
        mode === "pdf" && pdf ? { pdf: pdf.data, filename: pdf.name } : { text };
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (timer.current) clearInterval(timer.current);

      if (data.ok) {
        setActive(STEPS.length);
        setResult(data.result as AnalysisResult);
        setPhase("done");
      } else {
        setErrorMsg(ERRORS[data.error] || ERRORS.failed);
        setPhase("error");
      }
    } catch {
      if (timer.current) clearInterval(timer.current);
      setErrorMsg(ERRORS.network);
      setPhase("error");
    }
  };

  const reset = () => {
    if (timer.current) clearInterval(timer.current);
    setPhase("idle");
    setActive(0);
    setResult(null);
    setErrorMsg(null);
    setSaveMsg(null);
    setFileError(null);
  };

  const save = async () => {
    if (!result) return;
    setSaving(true);
    setSaveMsg(null);
    const inputs: RequirementInput[] = result.requirements.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      priority: r.priority,
      confidence: r.confidence,
      criteria: r.criteria,
      openQuestions: r.openQuestions,
      module: r.module,
      stakeholders: r.stakeholders,
    }));
    const res = await saveExtractedRequirements(inputs);
    setSaving(false);
    if (res.ok) {
      setSaveMsg(`تم حفظ ${res.saved} متطلب${res.skipped ? ` (تخطّي ${res.skipped} موجود مسبقًا)` : ""}.`);
      router.refresh();
    } else {
      setSaveMsg(
        res.error === "no-db"
          ? "الحفظ يتطلب قاعدة بيانات — يعمل على الموقع المنشور فقط."
          : "تعذّر الحفظ. حاول مرة أخرى."
      );
    }
  };

  const pct = Math.round((Math.min(active, STEPS.length) / STEPS.length) * 100);

  return (
    <div style={{ padding: "28px", maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ font: "var(--weight-semibold) var(--text-h1)/1.2 var(--font-sans)", color: "var(--text-strong)", margin: "0 0 6px" }}>
        تحليل وثّق
      </h1>
      <p style={{ font: "14px/1.5 var(--font-sans)", color: "var(--text-muted)", margin: "0 0 24px" }}>
        الصق نصًّا أو ارفع ملف PDF، وسيستخرج وثّق المتطلبات بشكل شفّاف — ترى ما يقرأه، وكيف يستنتج، وبأي درجة ثقة.
      </p>

      {phase === "idle" && (
        <div
          style={{
            border: "1.5px dashed var(--border-strong)",
            borderRadius: "var(--radius-xl)",
            padding: "24px",
            background: "var(--surface-card)",
          }}
        >
          {/* Mode toggle */}
          <div
            style={{
              display: "inline-flex",
              gap: 4,
              padding: 3,
              background: "var(--slate-100)",
              borderRadius: "var(--radius-md)",
              marginBottom: 16,
            }}
          >
            {([
              ["text", "لصق نص", "clipboard"],
              ["pdf", "رفع PDF", "file-up"],
            ] as const).map(([m, l, ic]) => {
              const on = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setFileError(null);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: "var(--radius-sm)",
                    border: "none",
                    cursor: "pointer",
                    background: on ? "var(--surface-card)" : "transparent",
                    color: on ? "var(--text-strong)" : "var(--text-muted)",
                    font: `var(--weight-${on ? "semibold" : "medium"}) 13px/1 var(--font-sans)`,
                    boxShadow: on ? "var(--shadow-xs)" : "none",
                  }}
                >
                  <Icon name={ic} size={15} color={on ? "var(--blue-600)" : "var(--text-subtle)"} /> {l}
                </button>
              );
            })}
          </div>

          {mode === "text" ? (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="الصق هنا نص وثيقة المتطلبات…"
                rows={8}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-default)",
                  background: "var(--slate-50)",
                  font: "14px/1.7 var(--font-sans)",
                  color: "var(--text-strong)",
                  outline: "none",
                  resize: "vertical",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <Button variant="primary" iconStart={<Icon name="sparkles" size={16} />} onClick={run} disabled={!canRun}>
                  حلّل بوثّق
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setText(SAMPLE)}>
                  تجربة بنص نموذجي
                </Button>
                <span style={{ marginInlineStart: "auto", font: "12px var(--font-mono)", color: "var(--text-subtle)", direction: "ltr" }}>
                  {text.trim().length} chars
                </span>
              </div>
            </>
          ) : (
            <>
              {!pdf ? (
                <label
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    onFile(e.dataTransfer.files?.[0]);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "36px 20px",
                    borderRadius: "var(--radius-lg)",
                    border: "1.5px dashed var(--border-strong)",
                    background: "var(--slate-50)",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  <Icon name="file-up" size={28} color="var(--blue-600)" />
                  <div style={{ font: "var(--weight-semibold) 14px var(--font-sans)", color: "var(--text-strong)" }}>
                    اسحب ملف PDF هنا أو اضغط للاختيار
                  </div>
                  <div style={{ font: "12px var(--font-sans)", color: "var(--text-subtle)" }}>
                    ملف PDF فقط · حتى ٣ ميغابايت
                  </div>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => onFile(e.target.files?.[0])}
                    style={{ display: "none" }}
                  />
                </label>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "14px 16px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-default)",
                    background: "var(--surface-card)",
                  }}
                >
                  <span
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "var(--radius-sm)",
                      background: "var(--red-50)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "0 0 36px",
                    }}
                  >
                    <Icon name="file-text" size={18} color="var(--red-500)" />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        font: "var(--weight-medium) 14px var(--font-sans)",
                        color: "var(--text-strong)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {pdf.name}
                    </div>
                    <div style={{ font: "12px var(--font-mono)", color: "var(--text-subtle)", direction: "ltr" }}>
                      {(pdf.size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  <button
                    onClick={() => setPdf(null)}
                    aria-label="إزالة"
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-subtle)", display: "inline-flex" }}
                  >
                    <Icon name="x" size={18} />
                  </button>
                </div>
              )}

              {fileError && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 10, font: "13px var(--font-sans)", color: "var(--red-600)" }}>
                  <Icon name="alert-triangle" size={15} color="var(--red-500)" /> {fileError}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                <Button variant="primary" iconStart={<Icon name="sparkles" size={16} />} onClick={run} disabled={!canRun}>
                  حلّل الملف
                </Button>
                <span style={{ marginInlineStart: "auto", font: "12px/1.5 var(--font-sans)", color: "var(--text-subtle)" }}>
                  يقرأ وثّق ملف الـ PDF مباشرة
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {phase === "error" && (
        <Card padding="lg">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <Icon name="alert-triangle" size={20} color="var(--red-500)" style={{ marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <div style={{ font: "var(--weight-semibold) 15px var(--font-sans)", color: "var(--text-strong)", marginBottom: 4 }}>
                تعذّر التحليل
              </div>
              <div style={{ font: "13px/1.6 var(--font-sans)", color: "var(--text-body)" }}>{errorMsg}</div>
              <div style={{ marginTop: 14 }}>
                <Button variant="secondary" size="sm" iconStart={<Icon name="rotate-ccw" size={15} />} onClick={reset}>
                  العودة
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {(phase === "running" || phase === "done") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Card padding="lg">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "var(--radius-sm)",
                  background: "var(--teal-500)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "0 0 30px",
                }}
              >
                <Icon name="sparkles" size={17} color="#fff" />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ font: "var(--weight-semibold) 15px/1.2 var(--font-sans)", color: "var(--text-strong)" }}>
                  {phase === "done" ? "اكتمل التحليل" : "جارٍ التحليل بالذكاء الاصطناعي…"}
                </div>
                <div style={{ font: "12px var(--font-mono)", color: "var(--text-subtle)", direction: "ltr" }}>
                  claude-opus-4-8
                </div>
              </div>
              <span style={{ font: "var(--weight-semibold) 14px/1 var(--font-mono)", color: "var(--teal-600)", direction: "ltr" }}>
                {pct}%
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: "var(--slate-150)", overflow: "hidden", marginBottom: 20 }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: "var(--teal-500)",
                  borderRadius: 999,
                  transition: "width var(--dur-slow) var(--ease-out)",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {STEPS.map((s, i) => {
                const state = i < active ? "done" : i === active ? "active" : "todo";
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      padding: "8px 0",
                      opacity: state === "todo" ? 0.45 : 1,
                      transition: "opacity var(--dur-base)",
                    }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        flex: "0 0 24px",
                        borderRadius: "50%",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          state === "done"
                            ? "var(--teal-500)"
                            : state === "active"
                            ? "var(--teal-50)"
                            : "var(--slate-100)",
                        border: state === "active" ? "1.5px solid var(--teal-400)" : "none",
                      }}
                    >
                      {state === "done" ? (
                        <Icon name="check" size={13} color="#fff" strokeWidth={3} />
                      ) : state === "active" ? (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "var(--teal-500)",
                            animation: "wq-pulse 1.1s var(--ease-in-out) infinite",
                          }}
                        />
                      ) : (
                        <Icon name={s.icon} size={13} color="var(--text-subtle)" />
                      )}
                    </span>
                    <span
                      style={{
                        font: `var(--weight-${state === "active" ? "semibold" : "regular"}) 14px/1.4 var(--font-sans)`,
                        color: state === "todo" ? "var(--text-muted)" : "var(--text-body)",
                      }}
                    >
                      {s.label}
                    </span>
                    {state === "active" && (
                      <span style={{ marginInlineStart: "auto", font: "11px var(--font-sans)", color: "var(--teal-600)" }}>
                        يعمل…
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {phase === "done" && result && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[
                  { n: result.requirements.length, l: "متطلبات", c: "var(--blue-600)" },
                  { n: result.acceptanceCriteriaCount, l: "معايير قبول", c: "var(--teal-600)" },
                  { n: result.businessRulesCount, l: "قواعد عمل", c: "var(--navy-700)" },
                  { n: result.openQuestionsCount, l: "أسئلة مفتوحة", c: "var(--amber-600)" },
                ].map((m) => (
                  <Card key={m.l} padding="sm" style={{ textAlign: "center" }}>
                    <div style={{ font: "var(--weight-bold) 26px/1 var(--font-sans)", color: m.c }}>{m.n}</div>
                    <div style={{ font: "12px var(--font-sans)", color: "var(--text-muted)", marginTop: 4 }}>{m.l}</div>
                  </Card>
                ))}
              </div>

              <AIInsightPanel
                confidence={result.confidence}
                summary={result.summary}
                reasoning={result.reasoning}
                recommendations={result.recommendations}
              />

              {/* Extracted requirements preview */}
              {result.requirements.length > 0 && (
                <Card padding="none">
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
                    <Icon name="clipboard-list" size={17} color="var(--blue-600)" />
                    <span style={{ font: "var(--weight-semibold) 14px var(--font-sans)", color: "var(--text-strong)" }}>
                      المتطلبات المستخرجة
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {result.requirements.map((r, i) => (
                      <div
                        key={r.id}
                        style={{
                          display: "flex",
                          gap: 11,
                          alignItems: "flex-start",
                          padding: "13px 18px",
                          borderTop: i ? "1px solid var(--border-subtle)" : "none",
                        }}
                      >
                        <PriorityLabel level={r.priority} showLabel={false} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            <span style={{ font: "var(--font-mono-id)", color: "var(--blue-700)", direction: "ltr" }}>{r.id}</span>
                            <StatusBadge status={r.status} />
                          </div>
                          <div style={{ font: "var(--weight-medium) 14px/1.5 var(--font-sans)", color: "var(--text-strong)" }}>{r.title}</div>
                          <div style={{ font: "13px/1.6 var(--font-sans)", color: "var(--text-muted)", marginTop: 2 }}>{r.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <Button
                  variant="brand"
                  iconStart={<Icon name={saving ? "loader" : "database"} size={16} />}
                  onClick={save}
                  disabled={saving || result.requirements.length === 0}
                >
                  {saving ? "جارٍ الحفظ…" : "حفظ المتطلبات في القاعدة"}
                </Button>
                <Button variant="ghost" iconStart={<Icon name="rotate-ccw" size={15} />} onClick={reset}>
                  تحليل جديد
                </Button>
                {saveMsg && (
                  <span style={{ font: "13px var(--font-sans)", color: "var(--teal-700)" }}>{saveMsg}</span>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
