---
name: wathiq-design
description: Use this skill to generate well-branded interfaces and assets for Wathiq (وثّق) — an Arabic-first, AI-first SaaS workspace for Business Analysts — either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files (tokens, components, ui_kits, guidelines).

Wathiq is **Arabic-first (RTL)**. Default to `dir="rtl"`, Arabic copy, IBM Plex Sans Arabic, and the navy + trust-blue + teal palette. Teal always means "AI". Every screen should read as a Business Analysis tool — requirement IDs (FR-001), status, priority, AI confidence, acceptance criteria, business rules, open questions, stakeholders.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc.), copy assets out of `assets/` and create static HTML files for the user to view; link `styles.css` for tokens, and either load `_ds_bundle.js` to use the React components or read the component source to recreate them.

If working on production code, copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some clarifying questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
