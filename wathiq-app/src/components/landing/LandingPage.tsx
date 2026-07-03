"use client";

import React from "react";
import Image from "next/image";
import { Icon } from "@/components/ds";

/* ============================================================
   Wathiq — public marketing landing page (RTL, Arabic-first).
   Self-contained: one component + a scoped stylesheet. No extra
   dependencies. Product imagery is real screenshots from /public.
   Guests browse freely; every call-to-action routes to sign-up
   or sign-in, where the gated workspace lives.
   ============================================================ */

const NAV = [
  { href: "#home", label: "الرئيسية" },
  { href: "#features", label: "المميزات" },
  { href: "#how", label: "كيف يعمل" },
  { href: "#screens", label: "لقطات من النظام" },
  { href: "/pricing", label: "الأسعار" },
  { href: "#faq", label: "الأسئلة الشائعة" },
  { href: "#contact", label: "تواصل معنا" },
];

const AUDIENCES = [
  { icon: "landmark", label: "الجهات الحكومية", desc: "توثيق متطلبات الأنظمة الحكومية بدقة ووضوح." },
  { icon: "building-2", label: "الشركات والمؤسسات", desc: "تسريع دورة تحليل المتطلبات عبر الفرق." },
  { icon: "briefcase", label: "مدراء المشاريع", desc: "رؤية موحّدة لحالة كل متطلب وقراراته." },
  { icon: "user-search", label: "محللو الأعمال", desc: "استخراج وتنقيح المتطلبات بمساعدة الذكاء." },
  { icon: "refresh-cw", label: "فرق التحول الرقمي", desc: "معايير جودة موحّدة لكل مبادرة رقمية." },
];

const FEATURES = [
  { icon: "sparkles", title: "تحليل ذكي", desc: "يقرأ وثائقك ويستخرج المتطلبات بدقة عالية عبر نموذج Claude." },
  { icon: "scan-search", title: "اكتشاف النواقص", desc: "يكشف المتطلبات الغامضة أو الناقصة ويطرح أسئلة توضيحية." },
  { icon: "shield-check", title: "تقييم جودة المتطلبات", desc: "يقيس وضوح كل متطلب واكتماله وفق معايير معتمدة." },
  { icon: "users", title: "استخراج أصحاب المصلحة", desc: "يحدّد الأطراف المعنية وأدوارهم في كل متطلب تلقائيًا." },
  { icon: "scale", title: "قواعد العمل", desc: "يوثّق القواعد والقيود التنظيمية ويربطها بمصادرها." },
  { icon: "history", title: "سجل التحليلات", desc: "خط زمني كامل لكل تغيير — من أنشأه ومتى ولماذا." },
  { icon: "file-text", title: "التقارير والتصدير", desc: "صدّر وثيقة متطلبات كاملة إلى PDF أو Word أو Excel." },
  { icon: "languages", title: "دعم اللغة العربية", desc: "مبنية عربيًّا أولًا (RTL) — لا ترجمة ولا التواء." },
];

const STEPS = [
  { icon: "folder-plus", title: "أنشئ مشروعًا", desc: "ابدأ مساحة عمل جديدة لمتطلبات مشروعك." },
  { icon: "upload", title: "ارفع ملف المتطلبات", desc: "الصق نصًّا أو ارفع مستند PDF — يدعمه النظام مباشرة." },
  { icon: "cpu", title: "تحليل بالذكاء الاصطناعي", desc: "يستخرج وثّق المتطلبات والمعايير والأسئلة والقواعد." },
  { icon: "list-checks", title: "النتائج والتوصيات", desc: "راجع، عدّل، اعتمد، وصدّر وثيقتك النهائية." },
];

const SCREENS = [
  { src: "/assets/screens/requirements.png", title: "إدارة المتطلبات", desc: "بطاقات واضحة بالحالة والأولوية ودرجة الثقة." },
  { src: "/assets/screens/detail.png", title: "تفاصيل المتطلب", desc: "معايير القبول، القواعد، والأسئلة المفتوحة في مكان واحد." },
  { src: "/assets/screens/analysis.png", title: "تحليل وثّق", desc: "لصق النص أو رفع PDF ثم استخراج فوري بالذكاء الاصطناعي." },
  { src: "/assets/screens/audit.png", title: "سجل التدقيق", desc: "توثيق شفّاف لكل عملية على مستوى المشروع." },
];

const STATS = [
  { to: 94, prefix: "حتى ", suffix: "%", label: "دقة ثقة التحليل" },
  { to: 2, prefix: "أقل من ", suffix: " دقيقة", label: "زمن التحليل" },
  { to: 3, prefix: "", suffix: " صيغ", label: "تصدير: PDF · Word · Excel" },
  { to: 100, prefix: "", suffix: "%", label: "عربي · RTL" },
];

const FAQS = [
  { q: "ما هي منصة وثّق؟", a: "منصة عربية لتحليل متطلبات الأعمال بالذكاء الاصطناعي: تستخرج المتطلبات من وثائقك، تكشف النواقص، تقيس الجودة، وتنتج وثيقة جاهزة للاعتماد." },
  { q: "كيف تحلّل المنصة المتطلبات؟", a: "عبر نموذج Claude (Opus) مع مخرجات منظّمة، فتستخرج المتطلبات ومعايير القبول والأسئلة المفتوحة مع درجة ثقة شفّافة لكل نتيجة." },
  { q: "هل بياناتي آمنة وخاصة؟", a: "نعم. لكل حساب مساحة عمل معزولة — لا يرى أحد بيانات غيره. وكلمات المرور مخزّنة مشفّرة، والجلسات موقّعة بأمان." },
  { q: "ما صيغ الملفات المدعومة؟", a: "يمكنك لصق النص مباشرة أو رفع مستند PDF ليحلّله النظام. والتصدير متاح إلى PDF و Word و Excel." },
  { q: "هل أحتاج بطاقة ائتمانية للبدء؟", a: "لا. أنشئ حسابًا بالبريد وكلمة المرور وابدأ فورًا دون أي بطاقة." },
  { q: "هل تدعم العربية بالكامل؟", a: "المنصة مبنية عربيًّا أولًا مع دعم كامل لاتجاه RTL في كل الشاشات والتقارير المصدّرة." },
];

/* --------------- small primitives --------------- */

function CTA({
  href,
  children,
  variant = "primary",
  large = false,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "light";
  large?: boolean;
}) {
  return (
    <a className={`wl-btn wl-btn-${variant} ${large ? "wl-btn-lg" : ""}`} href={href}>
      {children}
    </a>
  );
}

export function LandingPage() {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [statsIn, setStatsIn] = React.useState(false);

  // Sticky-nav shadow after scrolling a little.
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Reveal-on-scroll for elements marked .wl-reveal.
  React.useEffect(() => {
    const els = rootRef.current?.querySelectorAll(".wl-reveal");
    if (!els?.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("wl-in");
            if (e.target.id === "stats") setStatsIn(true);
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Close the mobile menu when a link is tapped.
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="wl-root" ref={rootRef} id="home">
      <style>{CSS}</style>

      {/* ---------------- Navbar ---------------- */}
      <header className={`wl-nav ${scrolled ? "wl-nav-solid" : ""}`}>
        <div className="wl-wrap wl-nav-inner">
          <a href="#home" className="wl-brand" onClick={closeMenu}>
            <Image src="/assets/wathiq-mark.png" alt="Wathiq" width={34} height={34} style={{ borderRadius: 8 }} />
            <span className="wl-brand-text">
              <b>وثّق</b>
              <i>WATHIQ</i>
            </span>
          </a>

          <nav className={`wl-links ${menuOpen ? "wl-links-open" : ""}`}>
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={closeMenu}>
                {n.label}
              </a>
            ))}
            <div className="wl-links-cta">
              <CTA href="/login" variant="ghost">تسجيل الدخول</CTA>
              <CTA href="/signup" variant="primary">ابدأ مجانًا</CTA>
            </div>
          </nav>

          <div className="wl-nav-actions">
            <a href="/login" className="wl-login-sm">دخول</a>
            <CTA href="/signup" variant="primary">ابدأ مجانًا</CTA>
            <button className="wl-burger" aria-label="القائمة" onClick={() => setMenuOpen((v) => !v)}>
              <Icon name={menuOpen ? "x" : "menu"} size={22} color="var(--navy-900)" />
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="wl-hero">
        <div className="wl-wrap wl-hero-grid">
          <div className="wl-hero-copy wl-reveal">
            <span className="wl-eyebrow">
              <Icon name="sparkles" size={14} color="var(--teal-600)" /> مدعوم بالذكاء الاصطناعي · Claude
            </span>
            <h1 className="wl-h1">
              حلّل المتطلبات التقنية
              <br />
              <span className="wl-grad">بالذكاء الاصطناعي</span> خلال دقائق
            </h1>
            <p className="wl-lead">
              منصة وثّق تساعد الجهات الحكومية والشركات على تحليل المتطلبات الوظيفية،
              واكتشاف النواقص، وتقييم الجودة، وإنتاج وثيقة جاهزة للاعتماد — بالعربية وبدقة عالية.
            </p>
            <div className="wl-hero-cta">
              <CTA href="/signup" variant="primary" large>
                ابدأ مجانًا <Icon name="arrow-left" size={18} />
              </CTA>
              <CTA href="#screens" variant="ghost" large>
                <Icon name="play" size={16} /> مشاهدة النظام
              </CTA>
            </div>
            <ul className="wl-hero-badges">
              <li><Icon name="check" size={15} color="var(--green-500)" /> لا يتطلب بطاقة ائتمانية</li>
              <li><Icon name="check" size={15} color="var(--green-500)" /> يدعم العربية بالكامل</li>
              <li><Icon name="check" size={15} color="var(--green-500)" /> بياناتك معزولة وآمنة</li>
            </ul>
          </div>

          <div className="wl-hero-shot wl-reveal">
            <div className="wl-frame">
              <div className="wl-frame-bar">
                <span /><span /><span />
                <div className="wl-frame-url">wathiq-ai.vercel.app</div>
              </div>
              <Image
                src="/assets/screens/requirements.png"
                alt="لوحة متطلبات وثّق"
                width={1440}
                height={900}
                priority
                className="wl-frame-img"
              />
            </div>
            <div className="wl-hero-glow" aria-hidden />
          </div>
        </div>
      </section>

      {/* ---------------- Audiences ---------------- */}
      <section className="wl-sec" id="audiences">
        <div className="wl-wrap">
          <div className="wl-sec-head wl-reveal">
            <span className="wl-kicker">لمن صُمّمت وثّق</span>
            <h2 className="wl-h2">منصة واحدة لكل من يحلّل المتطلبات</h2>
          </div>
          <div className="wl-aud wl-reveal">
            {AUDIENCES.map((a) => (
              <div className="wl-aud-card" key={a.label}>
                <span className="wl-aud-ic"><Icon name={a.icon} size={20} color="var(--teal-600)" /></span>
                <div>
                  <h3>{a.label}</h3>
                  <p>{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section className="wl-sec wl-sec-alt" id="features">
        <div className="wl-wrap">
          <div className="wl-sec-head wl-reveal">
            <span className="wl-kicker">المميزات</span>
            <h2 className="wl-h2">كل ما تحتاجه لتوثيق متطلبات محترفة</h2>
            <p className="wl-sub">من الاستخراج الذكي إلى التقرير النهائي — في مسار واحد متكامل.</p>
          </div>
          <div className="wl-feat wl-reveal">
            {FEATURES.map((f) => (
              <div className="wl-feat-card" key={f.title}>
                <span className="wl-feat-ic"><Icon name={f.icon} size={22} color="var(--teal-600)" /></span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="wl-sec" id="how">
        <div className="wl-wrap">
          <div className="wl-sec-head wl-reveal">
            <span className="wl-kicker">كيف يعمل</span>
            <h2 className="wl-h2">من الوثيقة إلى القرار في أربع خطوات</h2>
          </div>
          <div className="wl-steps wl-reveal">
            {STEPS.map((s, i) => (
              <div className="wl-step" key={s.title}>
                <div className="wl-step-top">
                  <span className="wl-step-ic"><Icon name={s.icon} size={22} color="#fff" /></span>
                  <span className="wl-step-no">{i + 1}</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Screenshots ---------------- */}
      <section className="wl-sec wl-sec-alt" id="screens">
        <div className="wl-wrap">
          <div className="wl-sec-head wl-reveal">
            <span className="wl-kicker">لقطات من النظام</span>
            <h2 className="wl-h2">تصميم عربي نظيف يركّز على العمل</h2>
            <p className="wl-sub">اضغط أي صورة لتكبيرها.</p>
          </div>
          <div className="wl-shots wl-reveal">
            {SCREENS.map((s, i) => (
              <button className="wl-shot" key={s.src} onClick={() => setLightbox(i)}>
                <div className="wl-shot-img">
                  <Image src={s.src} alt={s.title} width={1440} height={900} />
                  <span className="wl-shot-zoom"><Icon name="maximize-2" size={16} color="#fff" /></span>
                </div>
                <div className="wl-shot-cap">
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Stats ---------------- */}
      <section className="wl-sec wl-reveal" id="stats">
        <div className="wl-wrap">
          <div className="wl-stats">
            {STATS.map((s) => (
              <div className="wl-stat" key={s.label}>
                <div className="wl-stat-num">
                  {s.prefix}
                  <CountUp to={s.to} run={statsIn} />
                  {s.suffix}
                </div>
                <div className="wl-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="wl-sec wl-sec-alt" id="faq">
        <div className="wl-wrap wl-faq-wrap">
          <div className="wl-sec-head wl-reveal">
            <span className="wl-kicker">الأسئلة الشائعة</span>
            <h2 className="wl-h2">إجابات سريعة قبل أن تبدأ</h2>
          </div>
          <div className="wl-faq wl-reveal">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div className={`wl-faq-item ${open ? "wl-faq-open" : ""}`} key={f.q}>
                  <button className="wl-faq-q" onClick={() => setOpenFaq(open ? null : i)}>
                    <span>{f.q}</span>
                    <Icon name="chevron-down" size={18} color="var(--text-muted)" />
                  </button>
                  <div className="wl-faq-a"><p>{f.a}</p></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------------- CTA band ---------------- */}
      <section className="wl-sec">
        <div className="wl-wrap">
          <div className="wl-cta wl-reveal">
            <div className="wl-cta-glow" aria-hidden />
            <h2>جاهز لتحليل أول مشروع؟</h2>
            <p>ابدأ الآن مجانًا واكتشف قوة الذكاء الاصطناعي في تحليل المتطلبات.</p>
            <CTA href="/signup" variant="light" large>
              ابدأ أول تحليل الآن <Icon name="arrow-left" size={18} />
            </CTA>
          </div>
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="wl-footer" id="contact">
        <div className="wl-wrap wl-foot-grid">
          <div className="wl-foot-about">
            <div className="wl-brand">
              <Image src="/assets/wathiq-mark.png" alt="Wathiq" width={32} height={32} style={{ borderRadius: 8 }} />
              <span className="wl-brand-text"><b>وثّق</b><i>WATHIQ</i></span>
            </div>
            <p>منصة عربية لتحليل متطلبات الأعمال بالذكاء الاصطناعي — مصمّمة لتسريع توثيق المتطلبات ورفع جودتها.</p>
          </div>

          <div className="wl-foot-col">
            <h4>روابط سريعة</h4>
            <a href="#home">الرئيسية</a>
            <a href="#features">المميزات</a>
            <a href="#how">كيف يعمل</a>
            <a href="/login">تسجيل الدخول</a>
          </div>

          <div className="wl-foot-col">
            <h4>الدعم</h4>
            <a href="#faq">مركز المساعدة</a>
            <a href="#faq">الأسئلة الشائعة</a>
            <a href="/privacy">سياسة الخصوصية</a>
            <a href="/terms">شروط الاستخدام</a>
          </div>

          <div className="wl-foot-col">
            <h4>تواصل معنا</h4>
            <a href="mailto:wathiq.ai.app@gmail.com"><Icon name="mail" size={14} /> wathiq.ai.app@gmail.com</a>
            <a href="tel:+966531800106" dir="ltr" style={{ textAlign: "start" }}><Icon name="phone" size={14} /> +966 53 180 0106</a>
            <div className="wl-social">
              <a href="#" aria-label="LinkedIn"><Icon name="linkedin" size={17} /></a>
              <a href="#" aria-label="X"><Icon name="twitter" size={17} /></a>
              <a href="https://github.com/alialq146/wathiq" aria-label="GitHub"><Icon name="github" size={17} /></a>
            </div>
          </div>
        </div>
        <div className="wl-wrap wl-foot-base">
          <span>© 2026 وثّق · WATHIQ — جميع الحقوق محفوظة.</span>
          <span>صُنع بالذكاء الاصطناعي · للجهات والشركات</span>
        </div>
      </footer>

      {/* ---------------- Lightbox ---------------- */}
      {lightbox !== null && (
        <div className="wl-lb" onClick={() => setLightbox(null)}>
          <button className="wl-lb-x" aria-label="إغلاق" onClick={() => setLightbox(null)}>
            <Icon name="x" size={22} color="#fff" />
          </button>
          <div className="wl-lb-inner" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SCREENS[lightbox].src} alt={SCREENS[lightbox].title} />
            <div className="wl-lb-cap">{SCREENS[lightbox].title}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* Count-up number, animated once its section scrolls into view. */
function CountUp({ to, run }: { to: number; run: boolean }) {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    if (!run) return;
    let raf = 0;
    let startTs = 0;
    const dur = 1200;
    const tick = (ts: number) => {
      if (!startTs) startTs = ts;
      const p = Math.min(1, (ts - startTs) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, to]);
  return <>{v}</>;
}

/* ============================================================
   Scoped stylesheet. Prefixed `wl-` to avoid any collision with
   the workspace styles, and driven by the shared design tokens.
   ============================================================ */
const CSS = `
.wl-root { background: var(--slate-0); color: var(--text-body); font-family: var(--font-sans); overflow-x: hidden; }
.wl-root :where(h1,h2,h3,h4,p){ margin: 0; }
.wl-wrap { max-width: 1160px; margin: 0 auto; padding: 0 24px; }
html { scroll-behavior: smooth; }
.wl-root section[id]{ scroll-margin-top: 84px; }

/* buttons */
.wl-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; height:44px; padding:0 20px;
  border-radius: var(--radius-pill); font: var(--weight-semibold) 15px/1 var(--font-sans); cursor:pointer;
  text-decoration:none; transition: transform .16s ease, box-shadow .16s ease, background .16s ease; white-space:nowrap; border:1px solid transparent; }
.wl-btn-lg { height:52px; padding:0 26px; font-size:16px; }
.wl-btn-primary { background: var(--primary); color:#fff; box-shadow: 0 6px 18px rgba(43,87,224,.28); }
.wl-btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 10px 24px rgba(43,87,224,.32); }
.wl-btn-ghost { background: var(--slate-0); color: var(--navy-900); border-color: var(--border-strong); }
.wl-btn-ghost:hover { background: var(--slate-50); transform: translateY(-1px); }
.wl-btn-light { background:#fff; color: var(--navy-900); box-shadow: 0 8px 24px rgba(8,17,36,.18); }
.wl-btn-light:hover { transform: translateY(-1px); }

/* navbar */
.wl-nav { position: sticky; top:0; z-index:50; transition: background .2s, box-shadow .2s, border-color .2s;
  background: rgba(255,255,255,0); border-bottom:1px solid transparent; }
.wl-nav-solid { background: rgba(255,255,255,.86); backdrop-filter: blur(10px); border-bottom:1px solid var(--border-subtle); box-shadow: var(--shadow-sm); }
.wl-nav-inner { display:flex; align-items:center; gap:20px; height:68px; }
.wl-brand { display:flex; align-items:center; gap:10px; text-decoration:none; }
.wl-brand-text { display:flex; flex-direction:column; line-height:1; }
.wl-brand-text b { font: var(--weight-bold) 17px/1 var(--font-sans); color: var(--navy-900); }
.wl-brand-text i { font: var(--weight-medium) 9px/1 var(--font-mono); color: var(--text-subtle); letter-spacing:.14em; font-style:normal; margin-top:3px; }
.wl-links { display:flex; align-items:center; gap:26px; margin-inline-start:auto; }
.wl-links > a { text-decoration:none; color: var(--text-body); font: var(--weight-medium) 14.5px/1 var(--font-sans); transition: color .15s; }
.wl-links > a:hover { color: var(--primary); }
.wl-links-cta { display:none; }
.wl-nav-actions { display:flex; align-items:center; gap:10px; margin-inline-start:auto; }
.wl-login-sm { display:none; text-decoration:none; color: var(--navy-900); font: var(--weight-semibold) 14.5px/1 var(--font-sans); padding:0 6px; }
.wl-burger { display:none; background:transparent; border:none; cursor:pointer; padding:6px; }

/* hero */
.wl-hero { position:relative; padding: 64px 0 40px; background:
  radial-gradient(1100px 460px at 85% -8%, var(--teal-50) 0%, rgba(234,248,246,0) 60%),
  radial-gradient(900px 420px at 10% 0%, var(--blue-50) 0%, rgba(238,243,255,0) 55%); }
.wl-hero-grid { display:grid; grid-template-columns: 1.02fr 1.1fr; gap:48px; align-items:center; }
.wl-eyebrow { display:inline-flex; align-items:center; gap:7px; padding:6px 12px; border-radius: var(--radius-pill);
  background: var(--teal-50); color: var(--teal-700); border:1px solid var(--teal-100);
  font: var(--weight-semibold) 12.5px/1 var(--font-sans); margin-bottom:20px; }
.wl-h1 { font: var(--weight-bold) 46px/1.22 var(--font-sans); color: var(--navy-950); letter-spacing:-.01em; }
.wl-grad { background: linear-gradient(90deg, var(--teal-500), var(--primary)); -webkit-background-clip:text; background-clip:text; color:transparent; }
.wl-lead { font: 17px/1.85 var(--font-sans); color: var(--text-muted); margin-top:18px; max-width:540px; }
.wl-hero-cta { display:flex; gap:12px; margin-top:28px; flex-wrap:wrap; }
.wl-hero-badges { display:flex; gap:18px; flex-wrap:wrap; list-style:none; padding:0; margin:26px 0 0; }
.wl-hero-badges li { display:inline-flex; align-items:center; gap:7px; font: 13.5px/1 var(--font-sans); color: var(--text-muted); }

.wl-hero-shot { position:relative; }
.wl-frame { position:relative; z-index:2; border-radius: var(--radius-xl); overflow:hidden; background: var(--slate-0);
  border:1px solid var(--border-default); box-shadow: var(--shadow-xl); }
.wl-frame-bar { display:flex; align-items:center; gap:6px; padding:10px 14px; background: var(--slate-50); border-bottom:1px solid var(--border-subtle); }
.wl-frame-bar > span { width:10px; height:10px; border-radius:50%; background: var(--slate-300); }
.wl-frame-url { margin-inline-start:14px; flex:1; height:22px; border-radius: var(--radius-pill); background: var(--slate-0);
  border:1px solid var(--border-subtle); font: var(--weight-medium) 11px/22px var(--font-mono); color: var(--text-subtle); text-align:center; direction:ltr; }
.wl-frame-img { display:block; width:100%; height:auto; }
.wl-hero-glow { position:absolute; inset:auto -6% -14% -6%; height:70%; z-index:1; filter: blur(46px); opacity:.5;
  background: radial-gradient(closest-side, var(--teal-200), transparent 70%), radial-gradient(closest-side, var(--blue-200), transparent 72%); }

/* sections */
.wl-sec { padding: 74px 0; }
.wl-sec-alt { background: var(--slate-50); }
.wl-sec-head { text-align:center; max-width:680px; margin:0 auto 40px; }
.wl-kicker { display:inline-block; font: var(--weight-bold) 12.5px/1 var(--font-sans); letter-spacing:.12em;
  text-transform:uppercase; color: var(--teal-600); margin-bottom:12px; }
.wl-h2 { font: var(--weight-bold) 33px/1.3 var(--font-sans); color: var(--navy-950); letter-spacing:-.01em; }
.wl-sub { font: 16px/1.7 var(--font-sans); color: var(--text-muted); margin-top:12px; }

/* audiences */
.wl-aud { display:grid; grid-template-columns: repeat(5,1fr); gap:16px; }
.wl-aud-card { display:flex; flex-direction:column; gap:12px; padding:20px; background: var(--slate-0);
  border:1px solid var(--border-subtle); border-radius: var(--radius-lg); transition: transform .18s, box-shadow .18s, border-color .18s; }
.wl-aud-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); border-color: var(--border-default); }
.wl-aud-ic { width:42px; height:42px; border-radius: var(--radius-md); background: var(--teal-50); display:inline-flex; align-items:center; justify-content:center; }
.wl-aud-card h3 { font: var(--weight-semibold) 15px/1.4 var(--font-sans); color: var(--text-strong); margin-bottom:4px; }
.wl-aud-card p { font: 13px/1.6 var(--font-sans); color: var(--text-muted); }

/* features */
.wl-feat { display:grid; grid-template-columns: repeat(4,1fr); gap:16px; }
.wl-feat-card { padding:24px; background: var(--slate-0); border:1px solid var(--border-subtle); border-radius: var(--radius-lg);
  transition: transform .18s, box-shadow .18s, border-color .18s; }
.wl-feat-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--teal-200); }
.wl-feat-ic { width:48px; height:48px; border-radius: var(--radius-md); background: linear-gradient(150deg, var(--teal-50), var(--blue-50));
  display:inline-flex; align-items:center; justify-content:center; margin-bottom:16px; border:1px solid var(--teal-100); }
.wl-feat-card h3 { font: var(--weight-semibold) 16.5px/1.4 var(--font-sans); color: var(--text-strong); margin-bottom:8px; }
.wl-feat-card p { font: 13.5px/1.7 var(--font-sans); color: var(--text-muted); }

/* steps */
.wl-steps { display:grid; grid-template-columns: repeat(4,1fr); gap:18px; position:relative; }
.wl-step { padding:26px 22px; background: var(--slate-0); border:1px solid var(--border-subtle); border-radius: var(--radius-xl); position:relative; }
.wl-step-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
.wl-step-ic { width:48px; height:48px; border-radius: var(--radius-lg); background: linear-gradient(150deg, var(--teal-500), var(--primary));
  display:inline-flex; align-items:center; justify-content:center; box-shadow: 0 8px 18px rgba(21,152,145,.28); }
.wl-step-no { font: var(--weight-bold) 40px/1 var(--font-mono); color: var(--slate-150); }
.wl-step h3 { font: var(--weight-semibold) 17px/1.4 var(--font-sans); color: var(--text-strong); margin-bottom:8px; }
.wl-step p { font: 13.5px/1.7 var(--font-sans); color: var(--text-muted); }

/* screenshots */
.wl-shots { display:grid; grid-template-columns: repeat(2,1fr); gap:22px; }
.wl-shot { text-align:start; background:transparent; border:none; padding:0; cursor:pointer; display:flex; flex-direction:column; gap:14px; }
.wl-shot-img { position:relative; border-radius: var(--radius-lg); overflow:hidden; border:1px solid var(--border-default); box-shadow: var(--shadow-md); transition: transform .2s, box-shadow .2s; }
.wl-shot-img img { display:block; width:100%; height:auto; }
.wl-shot:hover .wl-shot-img { transform: translateY(-4px); box-shadow: var(--shadow-xl); }
.wl-shot-zoom { position:absolute; inset-block-start:12px; inset-inline-start:12px; width:32px; height:32px; border-radius:50%;
  background: rgba(6,16,38,.55); display:inline-flex; align-items:center; justify-content:center; opacity:0; transition: opacity .2s; }
.wl-shot:hover .wl-shot-zoom { opacity:1; }
.wl-shot-cap h3 { font: var(--weight-semibold) 16px/1.4 var(--font-sans); color: var(--text-strong); margin-bottom:4px; }
.wl-shot-cap p { font: 13.5px/1.6 var(--font-sans); color: var(--text-muted); }

/* stats */
.wl-stats { display:grid; grid-template-columns: repeat(4,1fr); gap:18px; padding:36px; border-radius: var(--radius-2xl);
  background: linear-gradient(135deg, var(--navy-900), var(--navy-700)); box-shadow: var(--shadow-xl); }
.wl-stat { text-align:center; color:#fff; }
.wl-stat-num { font: var(--weight-bold) 40px/1 var(--font-sans); background: linear-gradient(90deg,#fff,var(--teal-200));
  -webkit-background-clip:text; background-clip:text; color:transparent; direction:ltr; }
.wl-stat-label { font: 13.5px/1.5 var(--font-sans); color: rgba(255,255,255,.72); margin-top:10px; }

/* faq */
.wl-faq-wrap { max-width:820px; }
.wl-faq { display:flex; flex-direction:column; gap:12px; }
.wl-faq-item { background: var(--slate-0); border:1px solid var(--border-default); border-radius: var(--radius-lg); overflow:hidden; transition: border-color .18s, box-shadow .18s; }
.wl-faq-item.wl-faq-open { border-color: var(--teal-200); box-shadow: var(--shadow-sm); }
.wl-faq-q { width:100%; display:flex; align-items:center; justify-content:space-between; gap:16px; padding:18px 20px;
  background:transparent; border:none; cursor:pointer; text-align:start; font: var(--weight-semibold) 16px/1.5 var(--font-sans); color: var(--text-strong); }
.wl-faq-q svg { transition: transform .22s ease; }
.wl-faq-open .wl-faq-q svg { transform: rotate(180deg); }
.wl-faq-a { max-height:0; overflow:hidden; transition: max-height .28s ease; }
.wl-faq-open .wl-faq-a { max-height:240px; }
.wl-faq-a p { padding:0 20px 18px; font: 14.5px/1.8 var(--font-sans); color: var(--text-muted); }

/* cta band */
.wl-cta { position:relative; overflow:hidden; text-align:center; padding:56px 28px; border-radius: var(--radius-2xl);
  background: linear-gradient(135deg, var(--teal-600), var(--primary)); color:#fff; box-shadow: var(--shadow-xl); }
.wl-cta-glow { position:absolute; inset:-40% -10% auto -10%; height:80%; background: radial-gradient(closest-side, rgba(255,255,255,.25), transparent 70%); filter: blur(30px); }
.wl-cta h2 { position:relative; font: var(--weight-bold) 30px/1.35 var(--font-sans); }
.wl-cta p { position:relative; font: 16px/1.7 var(--font-sans); color: rgba(255,255,255,.9); margin:12px 0 26px; }
.wl-cta .wl-btn { position:relative; }

/* footer */
.wl-footer { background: var(--navy-950); color: rgba(255,255,255,.72); padding:56px 0 26px; }
.wl-foot-grid { display:grid; grid-template-columns: 1.6fr 1fr 1fr 1.2fr; gap:32px; padding-bottom:34px; border-bottom:1px solid rgba(255,255,255,.1); }
.wl-footer .wl-brand-text b { color:#fff; }
.wl-foot-about p { font: 13.5px/1.8 var(--font-sans); margin-top:14px; max-width:320px; }
.wl-foot-col h4 { font: var(--weight-semibold) 14px/1 var(--font-sans); color:#fff; margin-bottom:16px; }
.wl-foot-col a { display:flex; align-items:center; gap:8px; text-decoration:none; color: rgba(255,255,255,.66);
  font: 13.5px/1 var(--font-sans); padding:7px 0; transition: color .15s; }
.wl-foot-col a:hover { color:#fff; }
.wl-social { display:flex; gap:10px; margin-top:12px; }
.wl-social a { width:34px; height:34px; border-radius: var(--radius-md); background: rgba(255,255,255,.08); display:inline-flex; align-items:center; justify-content:center; color:#fff; padding:0; }
.wl-social a:hover { background: rgba(255,255,255,.16); }
.wl-foot-base { display:flex; align-items:center; justify-content:space-between; gap:16px; padding-top:22px;
  font: 12.5px/1.6 var(--font-sans); color: rgba(255,255,255,.5); }

/* lightbox */
.wl-lb { position:fixed; inset:0; z-index:100; background: rgba(4,12,28,.82); backdrop-filter: blur(6px);
  display:flex; align-items:center; justify-content:center; padding:32px; animation: wl-fade .18s ease; }
.wl-lb-inner { max-width:1200px; width:100%; }
.wl-lb-inner img { display:block; width:100%; height:auto; border-radius: var(--radius-lg); box-shadow: var(--shadow-xl); border:1px solid rgba(255,255,255,.12); }
.wl-lb-cap { text-align:center; color:#fff; font: var(--weight-medium) 14px/1 var(--font-sans); margin-top:14px; }
.wl-lb-x { position:fixed; top:20px; inset-inline-start:20px; width:42px; height:42px; border-radius:50%; border:none; cursor:pointer;
  background: rgba(255,255,255,.12); display:inline-flex; align-items:center; justify-content:center; }
.wl-lb-x:hover { background: rgba(255,255,255,.22); }
@keyframes wl-fade { from { opacity:0 } to { opacity:1 } }

/* reveal */
.wl-reveal { opacity:0; transform: translateY(18px); transition: opacity .6s ease, transform .6s ease; }
.wl-reveal.wl-in { opacity:1; transform:none; }

/* responsive */
@media (max-width: 980px){
  .wl-hero-grid { grid-template-columns: 1fr; gap:36px; }
  .wl-h1 { font-size:38px; }
  .wl-aud { grid-template-columns: repeat(2,1fr); }
  .wl-feat { grid-template-columns: repeat(2,1fr); }
  .wl-steps { grid-template-columns: repeat(2,1fr); }
  .wl-foot-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 760px){
  .wl-links { position:absolute; top:68px; inset-inline:0; flex-direction:column; align-items:stretch; gap:0;
    background:#fff; border-bottom:1px solid var(--border-subtle); box-shadow: var(--shadow-lg);
    max-height:0; overflow:hidden; transition: max-height .28s ease; padding:0 24px; margin:0; }
  .wl-links-open { max-height:420px; padding:8px 24px 20px; }
  .wl-links > a { padding:13px 0; border-bottom:1px solid var(--border-subtle); }
  .wl-links-cta { display:flex; gap:10px; margin-top:12px; }
  .wl-links-cta .wl-btn { flex:1; }
  .wl-nav-actions .wl-btn-primary { display:none; }
  .wl-login-sm { display:inline-flex; }
  .wl-burger { display:inline-flex; }
  .wl-shots { grid-template-columns: 1fr; }
  .wl-stats { grid-template-columns: repeat(2,1fr); gap:24px; padding:28px; }
  .wl-foot-base { flex-direction:column; text-align:center; }
}
@media (max-width: 480px){
  .wl-h1 { font-size:32px; }
  .wl-h2 { font-size:26px; }
  .wl-aud, .wl-feat, .wl-steps { grid-template-columns: 1fr; }
  .wl-foot-grid { grid-template-columns: 1fr; }
}
`;
