# 717rec — Confidence Audit & Improvement Plan

_Date: 2026-07-01 · Method: hands-on run of build/tests/lint/typecheck + a 17-agent
evidence-based audit across 10 quality dimensions, with each top finding
independently reality-checked._

---

## The short answer

**Confidence score: 86 / 100 — "high / production-grade."**

This is a genuinely well-built, well-maintained webapp. Every engineering
fundamental I could measure is not just *claimed* to be good — it *is* good when
you actually run it. For a league-management app owned by a non-coder and built
largely through Lovable, this is well above the norm.

Because it's already high, **the plan below is deliberately modest.** There are
no fires to put out. The improvements are about closing a few real, specific
gaps — not a rebuild.

> Honesty note: I did not round up. 86 reflects real caps (thin UI-layer test
> coverage, a repeated "errors look like empty screens" pattern, and missing
> web security headers). It also doesn't go higher because chasing 95–100 on a
> rec-league app has sharply diminishing returns — the realistic, worth-it
> ceiling is ~93–94.

---

## How the score was measured (ground truth, run on 2026-07-01)

| Check | Command | Result |
|---|---|---|
| Production build | `npm run build` | ✅ Pass — 41s, main bundle 127 KB gzip, charts lazy-loaded |
| Type checking | `npm run typecheck` | ✅ Pass — full **strict** TypeScript |
| Linting | `npm run lint` | ✅ Pass — **zero** warnings or errors |
| Test suite | `npm run test:coverage` | ✅ **2,511 tests across 316 files, all passing** |
| Coverage | (same run) | 50% lines overall; **services ~72%, utils ~67%**, UI components/pages low |
| Prod dependency security | `npm audit --omit=dev` | ✅ **Clean** (3 advisories exist, all dev/build-only) |
| Architecture discipline | grep sweep | 0 bare `select('*')`, **1** `any`, 0 `@ts-ignore`, 0 `TODO/FIXME` |
| Data layer | file review | 313 migrations, 284 RLS policies, 28 RLS-enabled tables |
| Backend functions | file review | Edge functions with shared auth + rate-limiting + security headers |
| End-to-end tests | `e2e/` | 6 Playwright specs on critical flows (score submission, admin, playoffs, a11y) |
| CI gates | `.github/workflows` | 12 workflows: test, lint/typecheck, coverage floor, a11y (axe), Lighthouse, bundle size, e2e, secret scan, security audit, Supabase schema CI |

---

## Dimension scorecard

| Dimension | Grade | One-line verdict |
|---|:---:|---|
| Architecture & separation of concerns | 88 | Its own rules are followed with near-total discipline |
| Type safety | 88 | Strict TS + CI-enforced no-`any`; casts are narrow & at library edges |
| Security | 88 | RLS-first, hardened edge functions, no dangerous DOM sinks |
| Code health & maintainability | 88 | Near-zero tech-debt markers; consistent patterns |
| Data layer & Supabase correctness | 83 | Migrations run against real Postgres in CI; a few small nits |
| UX polish & product completeness | 83 | Skeletons, empty states, mobile safe-areas; a few inconsistencies |
| Accessibility | 82 | axe CI gate, correct primitives, universal alt text; SPA-nav gaps |
| Performance & bundle | 82 | Mature bundle + fetch strategy; bounded realtime fan-out |
| Test coverage & quality | 78 | Excellent service/util tests; UI-component layer is thin |
| Error handling & resilience | 78 | Strong infra; "errors shown as empty screens" in a few read paths |
| **Average** | **83.8** | Every dimension lands "positive" or "strongly positive" |

---

## What's genuinely strong (why the score is high)

- **It actually works when you run it.** Clean build, strict typecheck, clean
  lint, 2,511 passing tests. No smoke and mirrors.
- **Discipline is real, not aspirational.** The repo writes down architecture
  rules (all DB access through services, never `select('*')`, services always
  throw, no direct Supabase client in components) — and the code follows them.
  0 client-import violations in components, 1 `any` in ~1,600 files, 0
  `@ts-ignore`, 0 `TODO/FIXME`.
- **Security is server-enforced.** Authorization rests on 284 Postgres
  Row-Level-Security policies, not on hiding buttons in the UI. Edge functions
  validate input, rate-limit, and set security headers. Secret-scanning and a
  production-dependency audit both gate CI.
- **The safety nets exist.** Global + per-route error boundaries, Sentry with
  PII scrubbing, and TanStack Query caching are all wired up.
- **The CI is unusually thorough** for a project this size — including
  accessibility (axe), Lighthouse, bundle-size budgets, and schema migrations
  applied to a real Postgres on every PR.

---

## The honest weaknesses (why it's 86, not 92+)

None of these are severe. After adversarial re-checking, **not a single finding
was critical or high** once calibrated. The themes that cap the score:

1. **"Errors look like empty screens."** In several read paths (teams list &
   homepage Top Teams, Insights, rankings, Compare), a failed data fetch renders
   "No teams / No data yet" instead of an error with a retry button. Sentry
   still records it, but a user — or you — could be looking at an outage that
   the app is quietly disguising as "nothing here." This is the single most
   important theme and it recurs, which is why it's Tier 1.
2. **UI-layer test coverage is thin.** Services and utilities are well-tested
   (~72% / ~67%), but whole feature-component folders have zero tests
   (notifications, timeslots, insights, match comments/reactions). Business
   logic is safe; UI-behavior regressions can slip through.
3. **The served app ships without web security headers** (Content-Security-Policy,
   X-Frame-Options, HSTS) at the hosting layer — the edge functions have them,
   the HTML app does not.
4. **Small, localized nits:** SPA route changes don't move focus / announce
   for screen-reader users; one admin "all matches" query silently truncates at
   1,000 rows; a few queries fetch base-table `*` alongside joins; realtime
   channels have no reconnect handling.

---

## Tiered improvement plan (what each tier buys you)

Point estimates are **realistic and conservative** — they assume the fix lands
cleanly and don't simply add up (overlap + diminishing returns are already
priced in). Think of them as "how much more would I trust this app afterward,"
not exact math.

### Tier 1 — Reliability & trust · **86 → ~90** · small effort, high visibility
The best return on investment. Mostly small, user-facing fixes.
- **Stop disguising errors as empty states.** Surface `error` + a retry button
  in the teams list, homepage Top Teams, Insights, rankings, and Compare.  **(~+3–4)**
- **Add web security headers** (CSP, X-Frame-Options, X-Content-Type-Options,
  Referrer-Policy, HSTS) to the served app.  **(~+2)**
- **Give the homepage a real page title & meta description** (SEO/shareability).  **(~+1)**
- **Fix the silent 1,000-row truncation** on the admin mass-score screen (scope
  by season or paginate) and add an explicit sort to the paginator.  **(~+1–2)**

### Tier 2 — Depth & accessibility · **~90 → ~92** · medium effort
- **Add tests for the untested stateful UI folders** (notifications, timeslots,
  insights, message-board & schedule interactions) plus the global
  ErrorBoundary and the 404 page.  **(~+3)**
- **Announce route changes & manage focus** on navigation for keyboard/screen-
  reader users.  **(~+2)**
- **Harden realtime**: handle channel errors/reconnects; fix a channel-cleanup
  leak in `useBracketCompletion`.  **(~+1)**

### Tier 3 — Consistency & polish · **~92 → ~94** · low urgency
- **Lock the good state in with lint** so future changes can't regress it
  (forbid direct Supabase client imports outside services; forbid wildcard
  `select`).  **(~+1)**
- ~~**Replace base-table `*` join-selects with explicit columns** and add explicit
  return types to services.~~  **(Done — PR #883)**
- **Make the last error-swallowing services throw** (e.g. `RankingTrendsService`)
  and delete dead code (`useErrorHandler`, a leftover compat hook).  **(~+1)**
- **Polish pass**: memoize hot list rows, extend virtualization to more growable
  lists, standardize skeleton loaders, add accessible names to icon-only admin
  buttons.  **(~+1)**

---

## Phased PR plan (mapped to Lovable / Claude Code / Codex)

Tool guide: **Lovable** = visual/UI/copy, small & isolated · **Codex** =
mechanical/repetitive/bulk · **Claude Code** = cross-file, architectural, or
needs judgment. Each PR is intentionally small and independently shippable
(matches the "small, safe diffs" house rule).

### Phase 1 — Reliability & trust (Tier 1)
| PR | Tool | Scope |
|---|---|---|
| 1 | **Claude Code** | Propagate `error` from `useTeams` / `useTeamRankings` / `useLeagueInsights`; render a shared retryable error state in `TeamList`, homepage `TopTeams`, `TeamsContainer`, `LeagueInsightsContainer`, `Compare`. |
| 2 | **Claude Code** | Add HTTP security headers to the served SPA (host `_headers` / `wrangler` / Lovable publish config) + a smoke test. |
| 3 | **Lovable** | Add `SeoHead` (title + meta description + OG tags) to the homepage `Index` page. |
| 4 | **Claude Code** | Scope or paginate `fetchMatchesWithTeams` (admin mass-score) to remove the 1,000-row silent cap; add explicit `ORDER BY` to the range paginator. |

### Phase 2 — Depth & accessibility (Tier 2)
| PR | Tool | Scope |
|---|---|---|
| 5 | **Codex** | Add render + interaction tests for untested stateful component folders (notifications, timeslots, insights, message-board, schedule). |
| 6 | **Codex** | Add tests for the global `ErrorBoundary` and the `NotFound` (404) page. |
| 7 | **Claude Code** | On route change, move focus to `<main>` and announce the new page via an `aria-live` region. |
| 8 | **Claude Code** | Add channel error/reconnect handling to realtime hooks; fix the `useBracketCompletion` cleanup to call `removeChannel`. |

### Phase 3 — Consistency & polish (Tier 3)
| PR | Tool | Scope |
|---|---|---|
| 9 | **Codex** | ESLint `no-restricted-imports` to forbid `@/integrations/supabase/client` outside `src/services` (+ allowed exceptions); rule flagging wildcard `select`; enable `ban-ts-comment`. |
| 10 | **Codex** | ~~Replace base-table `*` in join-selects with explicit columns (~4–5 queries); add explicit return types to service functions.~~ **Done — PR #883** |
| 11 | **Claude Code** | Route `RankingTrendsService` (and any peers) through `handleDatabaseError` so they throw; delete unused `useErrorHandler` and the leftover compat hook. |
| 12 | **Codex / Lovable** | Memoize hot list rows; extend virtualization to more growable lists; standardize skeleton loaders; add `aria-label` to icon-only admin buttons. |

---

## Caveats on the estimates

- Scores are judgment, not a formula. The gates (build/test/lint/typecheck) and
  the finding counts are hard facts; the point-deltas are calibrated estimates.
- Points don't sum linearly — several fixes overlap (the "error state" work in
  Tier 1 partly overlaps the resilience items), which is already accounted for.
- The realistic ceiling for this app is ~93–94. Getting beyond that (e.g. 100%
  UI coverage) costs far more than it's worth for a recreational-league tool.
