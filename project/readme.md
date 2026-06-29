# Wathiq — وثّق · Design System

**Wathiq (وثّق)** — Arabic for *"to document / to make trustworthy"* — is a premium, AI-first SaaS workspace built **specifically for Business Analysts** working on enterprise software projects. It is not a generic AI chat app and not a generic dashboard: every screen reinforces the Business Analysis domain — requirements, acceptance criteria, business rules, stakeholders, open questions, and traceability.

The product reads requirement documents, **extracts structured requirements**, and helps analysts review, refine, and approve them before handoff to engineering. The AI is **transparent by design** — it always shows progress, reasoning, confidence, and recommendations rather than acting like a black box.

- **Audience:** Business Analysts, product owners, requirements engineers (enterprise).
- **Feel:** Trust, clarity, productivity — a professional workspace, *not* a creative toy.
- **Direction:** **Arabic-first (RTL)**, international SaaS quality.
- **Aesthetic lineage:** Linear (calm density), Notion (clean editing surfaces), GitHub (status/metadata literacy), Vercel (monochrome restraint + one confident accent).

## Sources
This system was authored from a written brief plus one brand asset:
- `assets/wathiq-logo.png` — the supplied primary lockup (document + checklist mark, navy + teal, with Arabic "وثّق" and Latin "Wathiq").
- `assets/wathiq-mark.png` — the document mark cropped from the lockup for square/app contexts.

No codebase or Figma file was provided. All tokens, components, and screens are original constructions consistent with the brief and the logo's palette. **If a real product codebase or Figma exists, share it and this system should be reconciled against it.**

---

## CONTENT FUNDAMENTALS — how Wathiq writes

**Language.** Arabic-first. UI copy is Modern Standard Arabic, concise and professional. Latin/English appears only for: product name (Wathiq), technical identifiers (FR-001, NFR-003, BR-22, AC-1.4), version/build strings, and optional bilingual status labels.

**Tone.** Calm, precise, expert. Wathiq speaks like a senior analyst colleague: factual, never hype, never cute. It states what it did and what it recommends. No exclamation marks in product chrome.

**Person.** The product addresses the analyst directly but sparingly (أنت implied, rarely explicit). The AI describes its *own* actions in first-person-of-the-system framing: «استخرجت ٦ معايير قبول» ("I extracted 6 acceptance criteria"), «أقترح…» ("I suggest…"). This keeps the AI accountable and transparent.

**Casing & numerals.** Arabic body copy may use Arabic-Indic numerals (٦، ٣) for counts in prose; technical IDs and metrics use Western digits in mono (FR-014, 88%). Eyebrow/section labels are short, UPPERCASE for Latin, tracked +0.04em.

**Emoji:** none. Status is communicated with dots, bars, and color — never emoji. Icons are line icons (Lucide), never decorative illustration in product chrome.

**Representative copy:**
- Empty state: «ارفع وثيقة المتطلبات ليبدأ وثّق بالتحليل.»
- AI summary: «استخرجت ٦ معايير قبول و٣ قواعد عمل بثقة ٨٨٪. راجع السؤالين المفتوحين قبل الاعتماد.»
- Recommendation: «أضف معيار قبول لحالة انتهاء صلاحية الجلسة.»
- Status microcopy: «قيد المراجعة · In Review».
- Button verbs: «تحليل»، «اعتماد»، «حفظ كمسودة»، «طلب معلومات».

---

## VISUAL FOUNDATIONS

**Color.** A restrained, trust-forward palette:
- **Navy** (`--navy-800 #001851`, ink `--navy-950 #04142E`) — brand, dark surfaces, strongest text. From the logo.
- **Trust Blue** (`--blue-600 #2B57E0`) — the single interactive accent: primary buttons, links, focus rings, selection. "Trust and intelligence."
- **Teal** (`--teal-500 #159891`) — from the logo; reserved as the **AI accent**: AI panels, high-confidence, AI-authored content. This semantic coupling (teal = AI) is consistent across the system.
- **Cool slate neutrals** (`--slate-*`) — text, surfaces, borders. App background is `--slate-50`, cards are pure white.
- **Semantic status:** green (approved), amber (in review / warning), red (blocked / danger / low confidence), blue (info / analyzing).
- No purple/violet brand usage, **no bluish-purple gradients**, no rainbow. Color is used sparingly and always semantically.

**Typography.** `IBM Plex Sans Arabic` for all UI text (covers Arabic + Latin with matched metrics) and `IBM Plex Mono` for Requirement IDs and technical metadata — the mono treatment for IDs is a signature BA-domain detail. Strong hierarchy with modest step sizes for density: display 40 / h1 30 / h2 24 / h3 20 / body 14 / sm 13 / xs 12. Headings semibold, body regular, labels medium. Tight tracking on large headings (−0.02em).

**Spacing & layout.** 4px base unit, generous whitespace. Fixed app frame: 260px sidebar, 56px topbar, optional 340px right rail for AI/detail. Content max ~1200px. Cards breathe (20–24px padding).

**Shape & elevation.** **12px** is the signature card radius (`--radius-lg`). Controls use 8px, pills are fully round. Borders are 1px cool-slate, used liberally — Wathiq leans on **borders + very soft shadows**, not heavy elevation. Shadows are low, diffuse, cool-tinted (`rgba(13,22,41,...)`), subtle by default; modals/popovers go up to `--shadow-xl`. No hard black shadows, no neumorphism.

**Backgrounds.** Flat. Solid slate-50 app canvas, white cards. No photographic hero imagery, no repeating textures, no full-bleed gradients in product chrome. The only "gradient" permitted is the faint teal-tint header on AI panels (`--teal-50`). Brand/marketing surfaces may use a deep navy fill.

**Motion.** Calm and productive. Durations 110–280ms, `cubic-bezier(0.16,1,0.3,1)` ease-out. Fades and short slides only — **no bounce, no spring, no playful overshoot**. The one looping animation is a small confidence/"analyzing" pulse on active AI states (`wq-pulse`). Respect `prefers-reduced-motion`.

**Interaction states.**
- *Hover:* surfaces gain a slightly stronger border + one shadow step; ghost buttons get a `--slate-100` wash.
- *Press:* a 0.5px downward nudge on buttons; no scale-down.
- *Focus:* 3px `--focus-ring` (blue at 35% alpha) — always visible, never removed.
- *Selected:* blue border + focus-ring halo (requirement cards, list rows).

**Transparency & blur.** Used only for overlays/scrims (`--surface-overlay`, navy at ~48%). No frosted-glass chrome in the core workspace — clarity over flourish.

**Iconography.** See below — line icons, Lucide.

---

## ICONOGRAPHY

Wathiq uses **line (stroke) icons**, ~1.5–1.75px stroke, rounded joins — matching the clean enterprise tone. The reference set is **[Lucide](https://lucide.dev)** (the open continuation of Feather), loaded from CDN:

```html
<script src="https://unpkg.com/lucide@latest"></script>
<i data-lucide="file-text"></i>
<script>lucide.createIcons();</script>
```

- **Substitution note:** no proprietary icon font was supplied with the brief, so Lucide is used as the closest-match line-icon system. If the real product ships its own icon set, swap it in and update this section.
- Icons are monochrome, inherit `currentColor`, and are sized 16–20px in UI chrome.
- **No emoji.** **No multicolor icons.** **No hand-drawn SVG illustration** in product chrome.
- Domain-relevant glyphs in frequent use: `file-text`, `clipboard-list`, `check-circle`, `circle-dot`, `git-pull-request`, `sparkles` (AI), `message-circle-question` (open questions), `shield-check`, `users`, `flag`, `bar-chart-3`, `search`, `filter`, `more-horizontal`.
- The brand mark itself (`assets/wathiq-mark.png`) is the document-with-checklist glyph; use it for the app logo, favicon, and loading states.

---

## INDEX — what's in this system

**Root**
- `styles.css` — global entry point (import this). `@import`s only.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `fonts.css`, `base.css` (resets + RTL defaults + keyframes).
- `assets/` — `wathiq-logo.png` (lockup), `wathiq-mark.png` (square mark).
- `SKILL.md` — Agent-Skill manifest for downloading/using this system.

**Components** (`window.WathiqDesignSystem_f0eeb8.*`)
- `components/core/` — `Button`, `IconButton`, `Badge`, `Tag`, `Card`, `Avatar`.
- `components/forms/` — `Input`, `Select`, `Checkbox`, `Switch`.
- `components/navigation/` — `Tabs`.
- `components/ba/` — domain primitives: `StatusBadge`, `PriorityLabel`, `ConfidenceMeter`, `StakeholderGroup`, `RequirementCard`, `AIInsightPanel`.

**Foundations (Design System tab cards)** — `guidelines/*.card.html`: brand, color scales, status/priority/confidence palettes, type specimens, spacing, radii, elevation.

**UI Kit** — `ui_kits/workspace/` — interactive recreation of the Wathiq analyst workspace (requirements list, requirement detail, AI analysis, project overview). See its `README.md`.

---

*Authored from the Wathiq brief + supplied logo. Reconcile against the real codebase/Figma when available.*
