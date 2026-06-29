/* AI Analysis screen — transparent pipeline: upload → analyzing → results.
   Showcases progress, live reasoning, confidence, and recommendations. */
function AnalysisScreen() {
  const STEPS = [
    { label: "قراءة المستند واستخراج النص", icon: "file-text" },
    { label: "تحديد الجهات الفاعلة والنطاق", icon: "users" },
    { label: "استخراج المتطلبات الوظيفية", icon: "clipboard-list" },
    { label: "اشتقاق معايير القبول", icon: "check-circle" },
    { label: "مطابقة قواعد العمل والسياسات", icon: "shield-check" },
    { label: "رصد المعلومات الناقصة والأسئلة", icon: "message-circle-question" },
  ];
  const [phase, setPhase] = React.useState("idle"); // idle | running | done
  const [active, setActive] = React.useState(0);

  const run = () => {
    setPhase("running"); setActive(0);
    let i = 0;
    const t = setInterval(() => {
      i += 1;
      if (i >= STEPS.length) { clearInterval(t); setActive(STEPS.length); setTimeout(() => setPhase("done"), 500); }
      else setActive(i);
    }, 750);
  };
  const reset = () => { setPhase("idle"); setActive(0); };

  return (
    <div style={{ padding: "28px", maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ font: "var(--weight-semibold) var(--text-h1)/1.2 var(--font-sans)", color: "var(--text-strong)", margin: "0 0 6px" }}>تحليل وثّق</h1>
      <p style={{ font: "14px/1.5 var(--font-sans)", color: "var(--text-muted)", margin: "0 0 24px" }}>كل خطوة شفّافة — ترى ما يقرأه وثّق، وكيف يستنتج، وبأي درجة ثقة.</p>

      {phase === "idle" && (
        <div style={{ border: "1.5px dashed var(--border-strong)", borderRadius: "var(--radius-xl)", padding: "44px 24px", textAlign: "center", background: "var(--surface-card)" }}>
          <span style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "var(--blue-50)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}><Icon name="file-up" size={26} color="var(--blue-600)" /></span>
          <div style={{ font: "var(--weight-semibold) 17px/1.4 var(--font-sans)", color: "var(--text-strong)", marginBottom: 6 }}>ارفع وثيقة المتطلبات</div>
          <div style={{ font: "13px/1.6 var(--font-sans)", color: "var(--text-muted)", marginBottom: 18, maxWidth: 380, marginInline: "auto" }}>PDF أو Word أو نص — سيستخرج وثّق المتطلبات ومعايير القبول وقواعد العمل تلقائيًا.</div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Button variant="primary" iconStart={<Icon name="sparkles" size={16} />} onClick={run}>ابدأ التحليل التجريبي</Button>
            <Button variant="secondary" iconStart={<Icon name="upload" size={16} />}>اختيار ملف</Button>
          </div>
          <div style={{ marginTop: 16, font: "12px var(--font-mono)", color: "var(--text-subtle)", direction: "ltr" }}>requirements-v2.3.docx · 14 pages</div>
        </div>
      )}

      {phase !== "idle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Card padding="lg">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", background: "var(--teal-500)", display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 30px" }}><Icon name="sparkles" size={17} color="#fff" /></span>
              <div style={{ flex: 1 }}>
                <div style={{ font: "var(--weight-semibold) 15px/1.2 var(--font-sans)", color: "var(--text-strong)" }}>{phase === "done" ? "اكتمل التحليل" : "جارٍ التحليل…"}</div>
                <div style={{ font: "12px var(--font-mono)", color: "var(--text-subtle)", direction: "ltr" }}>requirements-v2.3.docx</div>
              </div>
              <span style={{ font: "var(--weight-semibold) 14px/1 var(--font-mono)", color: "var(--teal-600)", direction: "ltr" }}>{Math.round((Math.min(active, STEPS.length) / STEPS.length) * 100)}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: "var(--slate-150)", overflow: "hidden", marginBottom: 20 }}>
              <div style={{ width: `${(Math.min(active, STEPS.length) / STEPS.length) * 100}%`, height: "100%", background: "var(--teal-500)", borderRadius: 999, transition: "width var(--dur-slow) var(--ease-out)" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {STEPS.map((s, i) => {
                const state = i < active ? "done" : i === active ? "active" : "todo";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "8px 0", opacity: state === "todo" ? 0.45 : 1, transition: "opacity var(--dur-base)" }}>
                    <span style={{ width: 24, height: 24, flex: "0 0 24px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: state === "done" ? "var(--teal-500)" : state === "active" ? "var(--teal-50)" : "var(--slate-100)", border: state === "active" ? "1.5px solid var(--teal-400)" : "none" }}>
                      {state === "done" ? <Icon name="check" size={13} color="#fff" strokeWidth={3} />
                        : state === "active" ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--teal-500)", animation: "wq-pulse 1.1s var(--ease-in-out) infinite" }} />
                        : <Icon name={s.icon} size={13} color="var(--text-subtle)" />}
                    </span>
                    <span style={{ font: `var(--weight-${state === "active" ? "semibold" : "regular"}) 14px/1.4 var(--font-sans)`, color: state === "todo" ? "var(--text-muted)" : "var(--text-body)" }}>{s.label}</span>
                    {state === "active" && <span style={{ marginInlineStart: "auto", font: "11px var(--font-sans)", color: "var(--teal-600)" }}>يعمل…</span>}
                  </div>
                );
              })}
            </div>
          </Card>

          {phase === "done" && (
            <React.Fragment>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                {[{ n: 6, l: "متطلبات", c: "var(--blue-600)" }, { n: 28, l: "معايير قبول", c: "var(--teal-600)" }, { n: 9, l: "قواعد عمل", c: "var(--navy-700)" }, { n: 5, l: "أسئلة مفتوحة", c: "var(--amber-600)" }].map((m) => (
                  <Card key={m.l} padding="sm" style={{ textAlign: "center" }}>
                    <div style={{ font: `var(--weight-bold) 26px/1 var(--font-sans)`, color: m.c }}>{m.n}</div>
                    <div style={{ font: "12px var(--font-sans)", color: "var(--text-muted)", marginTop: 4 }}>{m.l}</div>
                  </Card>
                ))}
              </div>
              <AIInsightPanel
                confidence={84}
                summary="استخرجت ٦ متطلبات و٢٨ معيار قبول من المستند. متطلبان بحاجة لمعلومات إضافية قبل الاعتماد."
                reasoning={[
                  "صُنّفت ٤ متطلبات وظيفية ومتطلبَا أداء غير وظيفيين.",
                  "رُبطت ٩ قواعد عمل بمصادرها التنظيمية.",
                  "رُصدت ٥ فجوات معلومات تتطلب توضيحًا من أصحاب المصلحة.",
                ]}
                recommendations={[
                  "راجع المتطلب FR-033 — ثقة منخفضة (٥٢٪) بسبب غموض الصلاحيات.",
                  "وجّه الأسئلة الخمسة المفتوحة لأصحاب المصلحة المعنيين.",
                ]}
              />
              <Button variant="ghost" iconStart={<Icon name="rotate-ccw" size={15} />} onClick={reset} style={{ alignSelf: "flex-start" }}>إعادة التحليل</Button>
            </React.Fragment>
          )}
        </div>
      )}
    </div>
  );
}
window.AnalysisScreen = AnalysisScreen;
