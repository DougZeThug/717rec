# 717rec — Confidence Assessment & Improvement Roadmap

> **Status:** Living document. The score is a snapshot (refreshed **2026-06-26**; previously **2026-05-28**); the roadmap is updated as phases land.
> **How to use this:** Each improvement PR should reference the phase it implements, e.g. _"Implements Phase 1 of `IMPROVEMENT-ROADMAP.md`."_

## Context

This document answers two questions: **(1)** how trustworthy the 717rec webapp is on a 1–100 scale and why, and **(2)** a tiered, phased plan of small PRs to raise that score — with an estimate of how many points each change is worth.

It is based on a full read of the codebase (architecture, testing/CI, and code-quality passes) plus **direct verification by running the app, the build, the type checker, the linter, and the full test suite** (see the table below). The phases are ordered to **(a)** grab cheap wins first, **(b)** build a test safety-net before changing code, then **(c)** make the riskier improvements on top of that net.

**Plain-language summary:** This is a genuinely well-built app — far more disciplined than a typical Lovable project. It builds and runs. The two things holding back confidence are that the code's "spell-checker" is turned down (TypeScript isn't fully strict, so a class of crash bugs can slip through) and the parts users actually click are barely tested (lots of tests on the math/data layer, very few on screens and flows). On top of that, the current working branch has two easily-fixed red gates from in-progress work.

---

## What was run this refresh (grounding the score)

| Check | Command | Result |
|---|---|---|
| Production build | `npm run build` | ✅ **Pass** — built in ~26s, all chunks emitted |
| Type check | `npm run typecheck` (`tsc --noEmit`) | ✅ **Clean**, exit 0 |
| App runs | `vite preview` on built `dist/` | ✅ **HTTP 200** — title renders, React root + 482 kB main bundle load |
| Lint | `eslint .` | ❌ **Fails** — 27 errors + 1 warning, **all auto-fixable** (prettier / import-sort), in the recent *Division Matchups* feature |
| Unit/integration tests | `vitest run` | ❌ **8 failed / 2326** (286 of 287 files pass). All 8 in `src/hooks/__tests__/useTeamRankings.test.ts`: *"useAuth must be used within an AuthProvider"* |
| Coverage (baseline 2026-06-24) | `coverage-baseline.txt` | Lines **44.8%**, Stmts 44.0%, Funcs 36.5%, Branch 35.5% |

> The red lint and 8 failing tests originate in recent in-progress commits on the working branch (Division Matchups card + rankings admin-gating), **not** on `origin/main`. They are trivially fixable — Phase 0 below.

---

## The Score: **74 / 100**

**What 74 means:** Solid and trustworthy for everyday use, professionally structured, with two known soft spots that could bite during edge cases or when the code is changed, plus a couple of currently-red gates on the working branch. It is *not* fragile — it's a B/B+ codebase with a clear, achievable path to an A.

**What changed since 72 (2026-05-28):** a real **E2E suite now exists** (5 Playwright specs — smoke, admin gating, mass-score, score submission, playoff bracket) where the previous snapshot had **zero**, and the stale root planning-doc sprawl was cleaned up. That genuine progress is partly offset by the two red gates found this refresh, so the net move is small.

### Scorecard by dimension

| Dimension | Score | Notes |
|---|---|---|
| Architecture & separation of concerns | 9/10 | **0** rule violations: no `select('*')`, no direct Supabase imports in components, services throw + use `handleDatabaseError()` (379 call sites) |
| Tooling & CI/CD | 8.5/10 | 9 GitHub workflows: tests, build, lint, **coverage gate**, `npm audit`, Gitleaks secret-scan, Supabase migration CI, e2e. Slight ding: this branch shipped red lint/tests |
| Dependencies & build | 8/10 | All current (React 18.3, TS 6, Vite 7, TanStack Query 5, Supabase 2.1). Build clean. Minor: `legacy-peer-deps=true` |
| Error handling & observability | 9/10 | Typed error hierarchy, 4 error boundaries, Sentry (well-tuned, PII-scrubbed), central logger |
| Testing — services & utils | 8/10 | services ~74%, utils 85–100%, meaningful edge-case tests, Supabase mocked well |
| **Testing — components / hooks / flows** | **5/10** | Components ~10%, hooks ~37%, only **2** integration tests. **Now 5 E2E specs** (up from 0) — the lift vs the prior 4/10 |
| **Type safety** | **4/10** | `strict: true` but `strictNullChecks: false` **and** `noImplicitAny: false` — verified in `tsconfig.app.json`. The single biggest confidence drag |
| Security & secrets | 7.5/10 | RLS-dependent (correct): 309 migrations, `SECURITY DEFINER` admin fn, drift check. No hardcoded secrets, but `.env` is git-tracked (public `VITE_` keys only) |
| Maintainability | 7/10 | A handful of files at/over the ~400-line guideline; modest `any` footprint (~34 production files) |
| **Current branch health** | **−** | Lint red (27 auto-fixable) + 8 failing tests from in-progress commits — Phase 0 |

### Why it's not higher
- **TypeScript isn't fully strict.** In ~120k lines, the compiler won't catch null/undefined mistakes — the most common source of runtime crashes.
- **The UI is largely unverified.** Unit tests prove the *math* works; they don't prove the score-entry button is wired to the save action, or that a bracket advances correctly on screen. With ~10% component coverage and 2 integration tests, regressions in user flows can ship unnoticed.
- **Two gates are red on this branch right now** (lint + tests) — small, but a real signal until cleaned.

### Why it's not lower
- Architectural discipline is exceptional and **machine-enforced** (CI blocks PRs that drop coverage or break lint/types on `main`). The foundation is sound, so improvements compound instead of fighting tech debt. It builds, runs, and 99.7% of 2,326 tests pass.

### Facts verified directly (not just inferred)
- `.env` **is** git-tracked but holds only `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` — all public, browser-shipped keys. It's already in `.gitignore`; it just needs untracking. **Hygiene, not a leak.**
- E2E now present: `e2e/{smoke,admin-access,admin-mass-score,score-submission,playoff-bracket}.spec.ts` (5 specs, non-blocking in CI). Integration tests still only 2 (`TeamsContainer`, `HeroCardForm`).
- Build succeeds and the built app serves (HTTP 200) via `vite preview`. **Sandbox note:** the dev/preview server must bind IPv4 (`--host 127.0.0.1`); the config default `host: '::'` fails where IPv6 is unavailable.
- Largest non-generated files remain over the ~400-line guideline (e.g. `predictMatch.ts`, `SeasonAccordion.tsx`, `WeeklyRecapCard.tsx`, `BracketsViewerAdapter.ts`).

---

## How to raise the score — tiered by impact

Each item shows the estimated point gain. (The last 2–3 points toward 100 are aspirational — diminishing returns.)

### Tier 0 — Stop the bleeding (this branch): **~+3 → ≈77**
- **Fix the 2 red gates.** `npm run lint:fix` clears the 27 formatting/import-sort errors; wrap the failing `useTeamRankings` test in `AuthProvider` (the hook now reads admin context via `useAuth`) to fix all 8. **+3**

### Tier 1 — High impact (foundational): **~+15 → ≈92**
- **A. Turn on TypeScript strict mode (incremental).** `strictNullChecks` first, then full `strict` / `noImplicitAny`. **+7**
- **B. Integration / E2E on the critical flows.** The 5 E2E specs are a strong start; harden them (non-blocking today) and add integration tests (only 2 exist) for score submission, playoff bracket advance, team create/edit, auth + admin gating, auto-schedule. **+5**
- **C. Component tests on the highest-risk screens** (admin tools, score entry, brackets, stats), lifting component coverage ~10% → ~35%. **+3**

### Tier 2 — Medium impact: **~+5 → ≈97**
- **D. Untrack `.env`** (`git rm --cached .env`; keep `.env.example`). Optionally rotate the anon key (low urgency — it's public). **+2**
- **E. Split the files over the ~400-line guideline** into smaller modules. **+2**
- **F. Replace `any` in production hotspots** (e.g. `useBracketFormData.ts`, `BadgeProcessingService.ts`) with real or generic types. **+1**

### Tier 3 — Polish / lock-in: **~+3 → ≈98–100**
- **G.** Input-validation guards on pure utils (`predictMatch`, scheduling) + document intentional null-returns. **+1**
- **H.** Raise hook coverage toward ~50% and **bump the vitest thresholds** so gains can't regress. **+1**
- **I.** Promote E2E from a non-blocking job to a **required CI gate**; add accessibility (axe), bundle-size budget, and Lighthouse checks. **+1**

---

## Phased PR roadmap (small, safe, one-thing-per-PR)

Ordering rationale: **quick wins → build the safety net → then make risky changes on top of it.** Tests come *before* the TypeScript migration and refactors on purpose — they're what catches regressions those changes might introduce.

### Phase 0 — Make this branch green (immediate) · 1–2 tiny PRs · ≈77
- **PR 0.1 — "style: run lint:fix on Division Matchups feature"** — `npm run lint:fix`, commit only the formatting/import-sort changes. *Verify:* `npm run lint` exits 0.
- **PR 0.2 — "test: wrap useTeamRankings tests in AuthProvider"** — fix the 8 failures. *Verify:* `npm run test:file -- src/hooks/__tests__/useTeamRankings.test.ts` green; full `npm test` green.
- *(Optional same phase)* **"chore: untrack committed .env"** — `git rm --cached .env` (file stays on disk; `.gitignore` already covers it).

### Phase 1 — Strengthen the safety net (testing) · several PRs · ≈85
- **PR 1.1 — harden the existing E2E specs** and ensure the CI job runs them (keep non-blocking for now).
- **PR 1.2 — integration test for match score submission** (button → save → cache update). Reuse the Supabase mock and the Radix pointer-capture mocks from `CLAUDE.md`.
- **PR 1.3 — integration test for playoff bracket creation & advancement.**
- **PR 1.4 — integration test for auth + admin gating** (non-admin blocked from `/admin`).
- **PR 1.5+ — component tests per high-risk screen** (one PR each: admin score tools, bracket views, team forms, stats). *Verify each:* `npm run test:coverage` shows component % climbing.

### Phase 2 — TypeScript strictness, incrementally · several small PRs · ≈92
- **PR 2.1 — "build: enable strictNullChecks"** in `tsconfig.app.json`; run `npm run typecheck`, record the error count.
- **PR 2.2 … 2.n — fix strict-null fallout one folder per PR**: `src/utils` → `/services` → `/hooks` → `/components`. The Phase-1 tests guard behavior.
- **PR 2.final — enable full `strict` + `noImplicitAny`.** *Verify:* `npm run typecheck` clean; full `npm test` green.

### Phase 3 — Tidy big files & types · small PRs · ≈96
- **PR 3.1–3.x — split each file over the ~400-line guideline** — extract sub-components/helpers, no behavior change.
- **PR 3.y — remove `any` from production hotspots** — prefer generics or generated Supabase types.

### Phase 4 — Polish & lock-in · small PRs · ≈98–100
- **PR 4.1 — input-validation guards + document intentional null-returns.**
- **PR 4.2 — raise hook coverage and bump vitest thresholds** so gains can't silently regress.
- **PR 4.3 — make E2E a required CI gate** once stable.
- **PR 4.4 — add axe a11y + bundle-size budget + Lighthouse to CI.**

---

## End-to-end verification

After each PR, the existing CI is your net — it runs lint, typecheck, build, unit tests, and the coverage gate on every PR. Locally, confirm a phase worked by:

1. **Tests:** `npm test` (full) or `npm run test:file -- <path>` (single). Coverage: `npm run test:coverage`.
2. **Types:** `npm run typecheck` — must be clean after each Phase-2 PR.
3. **Lint/format:** `npm run lint` (use `npm run lint:fix` to auto-resolve formatting/import-sort).
4. **Build:** `npm run build`.
5. **App boot:** `npx vite preview --host 127.0.0.1 --port 4173` → expect HTTP 200. (Bind IPv4 in sandboxes without IPv6.)
6. **Manual click-through** for any UI-touching PR.
7. **E2E:** `npx playwright test` for the golden-path and per-flow specs.

**Expected trajectory:** 74 → 77 (Phase 0) → 85 (Phase 1) → 92 (Phase 2) → 96 (Phase 3) → ~98–100 (Phase 4).

---

## Progress tracker

| Phase | Status | Score | PRs |
|---|---|---|---|
| 0 — Make this branch green | ☐ Not started | → 77 | — |
| 1 — Test safety-net | ◐ Partial (5 E2E specs landed; integration + component tests remain) | → 85 | — |
| 2 — TypeScript strict (incremental) | ☐ Not started | → 92 | — |
| 3 — Tidy big files & types | ☐ Not started | → 96 | — |
| 4 — Polish & lock-in | ☐ Not started | → ~98–100 | — |

---

*Last updated: 2026-06-26 (previous: 2026-05-28)*
