# Wathiq Workspace — UI Kit

An interactive, high-fidelity recreation of the **Wathiq** analyst workspace. It composes the design-system primitives (`Button`, `Card`, `StatusBadge`, `PriorityLabel`, `ConfidenceMeter`, `RequirementCard`, `AIInsightPanel`, `StakeholderGroup`, …) — it does not re-implement them.

Open `index.html`. Arabic-first (RTL); the sidebar is anchored to the right.

## Screens & flow
- **Overview** (`OverviewScreen.jsx`) — BA-specific project health: requirements-readiness band, acceptance-criteria coverage, average AI confidence, a **Missing Information** list, and recent requirements. (Deliberately *not* a generic dashboard.)
- **Requirements** (`RequirementsScreen.jsx`) — AI summary banner, status filter chips, and a grid of `RequirementCard`s. Click any card → detail.
- **Requirement detail** (`RequirementDetailScreen.jsx`) — ID + status + priority + stakeholders header, tabbed **Acceptance Criteria / Business Rules / Open Questions**, and a right rail with the transparent `AIInsightPanel` + approve/request-info actions.
- **Analysis** (`AnalysisScreen.jsx`) — the transparent AI pipeline: upload → live step-by-step progress → extracted counts + confidence + recommendations. Click **ابدأ التحليل التجريبي** to watch it run.

## Structure
- `index.html` — app shell, screen routing, loads React + Babel + Lucide + `_ds_bundle.js`.
- `kit-shared.jsx` — exposes DS components, a Lucide `<Icon>`, and mock project/requirement data on `window`.
- `AppShell.jsx` — sidebar (project switcher, nav, user) + topbar (breadcrumb, search, actions) + optional right rail.

## Notes
- Icons: **Lucide** via CDN (substituted for an unspecified product icon set — see root `readme.md` ICONOGRAPHY).
- Data is mock and bilingual where the domain calls for it (Arabic copy, Western IDs/metrics).
- Requires the compiled `_ds_bundle.js` at the project root (generated automatically).
