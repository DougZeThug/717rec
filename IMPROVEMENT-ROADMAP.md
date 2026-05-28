# 717rec — Confidence Assessment & Improvement Roadmap

> **Status:** Living document. The score is a snapshot (assessed **2026-05-28**); the roadmap is updated as phases land.
> **How to use this:** Each improvement PR should reference the phase it implements, e.g. _"Implements Phase 1 of `IMPROVEMENT-ROADMAP.md`."_

## Context

This document answers two questions: **(1)** how trustworthy the 717rec webapp is on a 1–100 scale and why, and **(2)** a tiered, phased plan of small PRs to raise that score — with an estimate of how many points each change is worth.

It is based on a full read of the codebase (architecture, testing/CI, and code-quality passes) plus direct verification of the key claims. The phases are ordered to **(a)** grab cheap wins first, **(b)** build a test safety-net before changing code, then **(c)** make the riskier improvements on top of that net.

**Plain-language summary:** This is a genuinely well-built app — far more disciplined than a typical Lovable project. The two things holding back confidence are that the code's "spell-checker" is turned down (TypeScript isn't strict, so a class of crash bugs can slip through) and the parts users actually click are barely tested (lots of tests on the math/data layer, very few on screens and flows).

---

## The Score: **72 / 100**

**What 72 means:** Solid and trustworthy for everyday use, professionally structured, with two known soft spots that could bite during edge cases or when the code is changed. It is *not* fragile — it's a B/B+ codebase with a clear, achievable path to an A.

### Scorecard by dimension

| Dimension | Score | Notes |
|---|---|---|
| Architecture & separation of concerns | 9/10 | **0** rule violations: no `select('*')`, no direct Supabase imports in components, services throw + use `handleDatabaseError()` |
| Tooling & CI/CD | 9/10 | 6 GitHub workflows: tests, build, lint, **coverage gate**, `npm audit`, Gitleaks secret-scan, Supabase migration CI |
| Dependencies & build | 8/10 | All current (React 18.3, TS 6, Vite 7, TanStack Query 5, Supabase 2.1). Minor: `legacy-peer-deps=true` |
| Error handling & observability | 9/10 | Typed error hierarchy, 4 error boundaries, Sentry, central logger |
| Testing — services & utils | 8/10 | ~51% / ~52% coverage, meaningful edge-case tests, Supabase mocked well |
| **Testing — components / hooks / flows** | **4/10** | Components ~11%, hooks ~22%, **only 2 integration tests, zero E2E** |
| **Type safety** | **4/10** | `strict: false`, `noImplicitAny: false`, no `strictNullChecks` — verified in `tsconfig.app.json` |
| Security & secrets | 7.5/10 | RLS-dependent (correct), no hardcoded secrets, but `.env` is tracked (public keys only) |
| Maintainability | 7/10 | 6 files at/over the ~400-line guideline; ~34 production files use `any` |

### Why it's not higher
- **TypeScript isn't strict.** In ~119k lines, the compiler won't catch null/undefined mistakes — the most common source of runtime crashes. This is the single biggest confidence drag.
- **The UI is largely unverified.** Unit tests prove the *math* works; they don't prove the score-entry button is wired to the save action, or that a bracket advances correctly on screen. With ~11% component coverage and 2 integration tests, regressions in user flows can ship unnoticed.

### Why it's not lower
- Architectural discipline is exceptional and **machine-enforced** (CI blocks PRs that drop coverage or break lint/types). The foundation is sound, so improvements compound instead of fighting tech debt.

### Facts verified directly (not just inferred)
- `.env` **is** git-tracked but holds only `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` — all public, browser-shipped keys. It's already in `.gitignore`; it just needs untracking. **Hygiene, not a leak.**
- Largest non-generated files: `predictMatch.ts` (570), `SeasonAccordion.tsx` (522), `WeeklyRecapCard.tsx` (428), `BracketUpdateService.ts` (405), `qualityAnalysis.ts` (403), `BracketsViewerAdapter.ts` (402).
- Production `any` footprint is modest: ~34 files (the rest were tests/type-defs).
- Integration tests: `TeamsContainer.integration.test.tsx`, `HeroCardForm.integration.test.tsx`. No Playwright/Cypress.

---

## How to raise the score — tiered by impact

Each item shows the estimated point gain. (The last 2–3 points toward 100 are aspirational — diminishing returns.)

### Tier 1 — High impact (foundational): **~+18 → ≈90**
- **A. Turn on TypeScript strict mode (incremental).** `strictNullChecks` first, then full `strict`. **+8**
- **B. Integration / E2E tests for the 4–5 critical user flows** (score submission, playoff bracket advance, team create/edit, auth + admin gating, auto-schedule). **+6**
- **C. Component tests on the highest-risk screens** (admin tools, score entry, brackets), lifting component coverage ~11% → ~35%. **+4**

### Tier 2 — Medium impact: **~+6 → ≈96**
- **D. Untrack `.env`** (`git rm --cached .env`, keep `.env.example`); archive stale root planning docs. **+2**
- **E. Split the 6 oversized files** into smaller modules. **+2**
- **F. Replace `any` in production hotspots** with real or generic types. **+2**

### Tier 3 — Polish / lock-in: **~+4 → ≈98–100**
- **G.** Input-validation guards on pure utils (`predictMatch`, scheduling) + document intentional null-returns. **+1**
- **H.** Raise hook coverage toward ~50% and **bump the vitest thresholds** so gains can't regress. **+1**
- **I.** Expand the E2E suite and promote it from a non-blocking job to a **required CI gate**. **+1**
- **J.** Add accessibility (axe), bundle-size budget, and Lighthouse checks to CI. **+1**

---

## Phased PR roadmap (small, safe, one-thing-per-PR)

Ordering rationale: **quick wins → build the safety net → then make risky changes on top of it.** Tests come *before* the TypeScript migration and refactors on purpose — they're what catches regressions those changes might introduce.

### Phase 0 — Quick wins (hygiene) · 1 short PR · ≈74
- **PR 0.1 — "chore: untrack committed .env and archive stale docs"**
  - `git rm --cached .env` (file stays on disk; `.gitignore` already covers it). Optionally rotate the anon key in the Supabase dashboard (low urgency — it's public).
  - Move stale root planning/audit markdown into a `docs/archive/` folder.
  - *Verify:* `git ls-files | grep '\.env$'` returns nothing; `npm run build` still succeeds.

### Phase 1 — Build the safety net (testing) · several PRs · ≈84
- **PR 1.1 — "test: add Playwright + first golden-path E2E (non-blocking CI)"** — install Playwright, one happy-path test (load app → Teams → Schedule), add a CI job that runs but does **not** block yet.
- **PR 1.2 — "test: E2E for match score submission"**
- **PR 1.3 — "test: E2E for playoff bracket creation & advancement"**
- **PR 1.4 — "test: E2E for auth + admin gating"** (non-admin is blocked from `/admin`).
- **PR 1.5+ — "test: component tests for <screen>"** — one PR per high-risk area (admin score tools, bracket views, team forms). Reuse the existing Supabase mock at `tests/__mocks__/supabase.ts` and the Radix pointer-capture mocks from `CLAUDE.md`.
  - *Verify each:* `npm run test:file -- <path>` green; `npm run test:coverage` shows component % climbing.

### Phase 2 — Type safety, incrementally · several small PRs · ≈92
- **PR 2.1 — "build: enable strictNullChecks"** — flip the flag in `tsconfig.app.json`, run `npm run typecheck`, record the error count. If small, fix in this PR; if large, fix folder-by-folder below.
- **PR 2.2 … 2.n — "fix(types): strict-null fallout in src/utils" → "/services" → "/hooks" → "/components"** — one folder per PR so diffs stay reviewable. The Phase-1 tests guard against behavior changes.
- **PR 2.final — "build: enable full strict + noImplicitAny"** once null-check fallout is clear.
  - *Verify:* `npm run typecheck` passes with the flags on; full `npm test` green.

### Phase 3 — Tidy big files & types · small PRs · ≈96
- **PR 3.1–3.6 — "refactor: split <file> into smaller modules"** — one PR each for `predictMatch.ts`, `SeasonAccordion.tsx`, `WeeklyRecapCard.tsx`, `BracketUpdateService.ts`, `qualityAnalysis.ts`, `BracketsViewerAdapter.ts`. Extract sub-components / helpers; no behavior change.
- **PR 3.7 — "refactor(types): remove `any` from production hotspots"** — target the ~34 production files; prefer generics or generated Supabase types.
  - *Verify:* each file under the ~400-line guideline; tests + typecheck green; visually click the affected screen.

### Phase 4 — Polish & lock-in · small PRs · ≈98–100
- **PR 4.1 — "feat: input-validation guards + document intentional null-returns"** (e.g., `predictMatch`, scheduling utils; comment the deliberate `return null` spots).
- **PR 4.2 — "test: raise hook coverage and bump vitest thresholds"** so the new coverage can't silently regress.
- **PR 4.3 — "ci: make E2E a required gate"** (promote the Phase-1 job to blocking once stable).
- **PR 4.4 — "ci: add axe a11y + bundle-size budget + Lighthouse"**.

---

## End-to-end verification

After each PR, the existing CI is your net — it already runs lint, typecheck, build, unit tests, and the coverage gate on every PR. Locally, confirm a phase worked by:

1. **Tests:** `npm test` (full) or `npm run test:file -- <path>` (single). Coverage: `npm run test:coverage`.
2. **Types:** `npm run typecheck` — must be clean after each Phase-2 PR.
3. **Lint/format:** `npm run lint`.
4. **Build:** `npm run build` (catches anything the type config misses).
5. **Manual click-through** for any UI-touching PR (Phase 1 component tests, Phase 3 splits): run the dev server and exercise the affected screen — type checks prove correctness, not that the feature *works*.
6. **E2E (Phase 1+):** `npx playwright test` for the golden-path and per-flow specs.

**Expected trajectory:** 72 → 74 (Phase 0) → 84 (Phase 1) → 92 (Phase 2) → 96 (Phase 3) → ~98–100 (Phase 4).

---

## Progress tracker

| Phase | Status | Score | PRs |
|---|---|---|---|
| 0 — Quick wins | ☐ Not started | → 74 | — |
| 1 — Test safety-net | ☐ Not started | → 84 | — |
| 2 — TypeScript strict (incremental) | ☐ Not started | → 92 | — |
| 3 — Tidy big files & types | ☐ Not started | → 96 | — |
| 4 — Polish & lock-in | ☐ Not started | → ~98–100 | — |

---

*Last updated: 2026-05-28*
