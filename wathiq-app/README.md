# وثّق · Wathiq Workspace

A production implementation of the **Wathiq** analyst workspace — the
interactive Business-Analysis workspace designed in the Claude Design handoff
bundle (`project/ui_kits/workspace/index.html`).

Built with **Next.js (App Router) + React + TypeScript**. The design system
(tokens + components) is ported into the app rather than consumed as an
external bundle.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
# or
npm run build && npm run start
```

Arabic-first (RTL) — the sidebar is anchored to the right.

## Screens & flow

The app boots into **Overview** and routes entirely client-side:

- **Overview** — project health: requirements-readiness band, acceptance-criteria
  coverage, average AI confidence, a **Missing Information** list, and recent
  requirements. (Deliberately *not* a generic dashboard.)
- **Requirements** — AI summary banner, status filter chips, and a grid of
  `RequirementCard`s. Click a card → detail.
- **Requirement detail** — ID + status + priority + stakeholders header, tabbed
  **Acceptance Criteria / Business Rules / Open Questions**, and a right rail
  with the transparent `AIInsightPanel` + approve / request-info actions.
- **Analysis** — the transparent AI pipeline: upload → live step-by-step
  progress → extracted counts + confidence + recommendations. Click
  **ابدأ التحليل التجريبي** to watch it run.

## Structure

```
src/
  app/
    layout.tsx          # RTL <html dir="rtl" lang="ar">, global CSS
    globals.css         # imports the token closure
    page.tsx            # App shell + client-side screen routing
  styles/tokens/        # ported design tokens (colors, type, spacing, effects, base, fonts)
  components/ds/         # the 13 reusable DS components + Icon + barrel index
  components/workspace/  # AppShell + the four screens
  lib/data.ts            # mock project / requirements / criteria / rules / questions
public/assets/           # Wathiq logo + mark
```

## Design-system components

Ported 1:1 from the handoff bundle as typed React components:

`Button`, `Card`, `Badge`, `Tag`, `Avatar`, `IconButton`, `Tabs`,
`StatusBadge`, `PriorityLabel`, `ConfidenceMeter`, `StakeholderGroup`,
`RequirementCard`, `AIInsightPanel`. All reference the CSS custom-property
tokens (navy brand, trust-blue accent, teal = "AI").

## Notes / substitutions

- **Icons** — Lucide, via `lucide-react` (the prototype used the Lucide CDN).
  The `Icon` helper accepts kebab-case names so screen code matches the source.
- **Fonts** — IBM Plex Sans Arabic + IBM Plex Mono from Google Fonts (per the
  token `fonts.css`). Drop self-hosted woff2s in and swap the `@import` for
  `@font-face` to ship fully offline.
- **Data** is mock and bilingual where the domain calls for it (Arabic copy,
  Western IDs/metrics).
