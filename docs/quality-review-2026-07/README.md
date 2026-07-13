# 717REC — Full Quality Review (July 2026)

**Reviewed commit:** `98e8c6af9c781ada4c4ca160d69dae559a5c2606` (branch `main` state as checked out on `claude/717rec-quality-review-b54phb`, 2026-07-13)
**Reviewer:** Claude Code (automated hands-on review: ran the app, the full test suite, the production build, linting, type checking, a fresh-database rebuild of all 324 migrations, SQL business-logic experiments, and a 3-viewport browser walk-through of every public page)
**Verdict up front:** **Production-capable, overall confidence 84/100.** This is a genuinely well-engineered app with one currently-broken CI gate, one systemic data-integrity weakness worth fixing, and a tail of smaller hardening and polish items. Details, evidence, and a phased PR plan follow.

---

## Table of contents

1. [What 717REC is](#1-what-717rec-is)
2. [What I ran and what happened](#2-what-i-ran-and-what-happened)
3. [Confidence score](#3-confidence-score)
4. [Scoring breakdown (12 categories)](#4-scoring-breakdown)
5. [Improvement plan (3 tiers)](#5-improvement-plan)
6. [AI-ready PR briefs](#6-ai-ready-pr-briefs) (each brief is a standalone file in [`briefs/`](briefs/))
7. [PR phases](#7-pr-phases)
8. [Sequencing and ownership](#8-sequencing-and-ownership)
9. [Final summary](#9-final-summary)

Evidence (screenshots, logs, raw results) is in [`evidence/`](evidence/).

---

## 1. What 717REC is

### 1.1 Plain-language overview

717REC is the website for **Lancaster, PA's recreational cornhole league** (717 is the local area code). It is a single-page web app where:

- **Players and fans** look up the schedule, live scores, standings, team pages, player stats, playoff brackets, past seasons, and a league message board — no login needed for any of that.
- **Team members** (logged in) run **live scoring** on their phone during a match: they enter each round's bags, the app tracks the best-of-3 games, shows who throws next, and submits the final result when the match ends.
- **Anyone** can send a "score report" or contact message to the league through public forms (protected against spam).
- **Admins** (Doug and any other `is_admin` accounts) get a dashboard with ~19 tools: create seasons, build the schedule automatically, manage timeslots and divisions, enter or correct scores in bulk, approve pending match results, review score reports, manage teams and join requests, run playoffs and blind draws, configure homepage hero cards and seasonal themes, and answer contact requests.

### 1.2 How the pieces fit together

- **Frontend:** React 18 + TypeScript (strict mode) + Vite, styled with Tailwind and the shadcn/Radix component library, deployed via Lovable/Cloudflare. Around 20 routes, all lazy-loaded. A phone-style bottom navigation appears on small screens; a top navbar on desktop. There is also a Capacitor wrapper for native mobile builds and a PWA setup.
- **Data layer:** Every database read/write goes through a dedicated **services layer** (`src/services/`) — a rule that is actually *enforced by a custom lint rule*, not just documented. Screens use TanStack Query hooks that call those services. Realtime updates (live scoring, message board, comments) come through Supabase realtime channels.
- **Database:** Supabase (Postgres). ~50 tables (teams, matches, seasons, divisions, live-scoring rounds/games, playoff brackets, badges, message board, score submissions, audit logs…), ~16 views, and dozens of SQL functions. **The scoring-critical math lives in the database, not the browser**: approving a match result, marking a tie, finalizing a live match, reversing stats, and the power-score/standings view are all SQL functions or views, most of them atomic and idempotent (verified — see §2.4).
- **Authentication:** Supabase Auth (email/password + Google). Admin status is a flag on the user's profile that is checked **server-side** in three layers (row-level-security policies, inside the SQL functions themselves, and in edge functions). A database trigger blocks anyone from flipping their own admin flag, and every admin-flag change is written to an audit table.
- **Scoring flow (live):** scorers insert per-round rows; a database uniqueness rule prevents duplicate rounds; game totals and "who throws next" are derived in the browser for responsiveness; the *official* result is applied by the `finalize_live_match` SQL function, which locks the match row and refuses to double-apply.
- **Scoring flow (admin):** pending matches are approved through `approve_match_result` (atomic, idempotent); the mass score-entry tool reverses old stats and applies new ones per match; standings counters live on the `teams` table and per-season stats in `team_season_stats`; the public standings/power score come from the `v_team_details` view.
- **Edge functions:** four server-side functions handle public form intake (score reports, contact requests, support email) with rate limiting, spam honeypots, CORS allow-lists, and strict validation — plus a scheduled power-score snapshot job protected by a secret token.

### 1.3 What the app already does well (don't redesign these)

These are strengths verified during this review, not compliments:

- **Scoring integrity primitives are genuinely strong.** `approve_match_result`, `mark_match_as_tie`, `finalize_live_match`, `reopen_live_match`, and `delete_match_with_stats_reversal` are atomic SQL functions with row locks, internal admin checks, and idempotency guards. I replayed the repo's own SQL business-logic test on a fresh database and wrote additional experiments — double-approval does not double-count, reversal round-trips exactly, underflow is impossible, non-admins are rejected (§2.4).
- **Security architecture is server-side, layered, and audited.** Row-level security is enabled on every table (verified against the rebuilt database catalog — zero tables without RLS). Admin checks happen in RLS, in the SQL functions, and in edge functions. Privilege escalation is blocked by a trigger and logged. No service-role key appears anywhere in the repo. Storage buckets were hardened days before this review (5 MB limit, images only, per-team folder scoping).
- **The migration story is unusually good for a Lovable project.** All 324 migrations replay cleanly on a blank Postgres in one pass (I did it), thanks to a deliberately engineered idempotent baseline. A weekly CI job does the same thing plus SQL smoke tests.
- **CI is a real quality gate, not decoration.** Lint → typecheck → 3,250 tests → coverage floor → dead-code check → build → bundle-size budgets → browser smoke test → automated accessibility scan (axe, WCAG 2 A/AA, 6 routes) → Lighthouse → a second Playwright suite against a *real* Supabase instance. Plus weekly security scans (gitleaks, npm audit) and the migration-replay job.
- **Code discipline is high.** TypeScript strict mode; exactly **one** `any` in product code; **zero** `@ts-ignore`; **zero** TODO/FIXME comments; zero `select('*')` (banned by lint); architecture rules (services-only database access) enforced by lint; every one of the 56 eslint waivers is annotated with a reason.
- **The UI system is coherent.** A real design-token system (`src/styles/design-system/`), shadcn/Radix components, dark/light themes, admin-toggleable seasonal themes, skip links, a route announcer for screen readers, list virtualization for long lists, and deliberate mobile patterns (bottom nav, drawer dialogs, 44px touch targets in live scoring).
- **Performance is budgeted and enforced.** Main bundle 131 KB gzipped against a 150 KB budget; total JS 1.01 MB against 1.2 MB; heavy libraries (charts, brackets, admin) are lazy-loaded; Lighthouse runs in CI.
- **The project audits itself.** `docs/audits/` contains real prior audits (Apr 2026 "B+", June roadmap 74/100, July confidence audit 86/100) and a July dead-code cleanup that deleted ~200 files. The trajectory is steeply upward — 304 commits in the last week alone, many of them security hardening.

---

## 2. What I ran and what happened

Everything below was **actually executed** in this review environment (Linux sandbox, Node 22, npm 10, Postgres 16.13). Raw logs are in `evidence/`.

### 2.1 Toolchain runs

| Step | Command | Result | Notes |
|---|---|---|---|
| Install | `npm ci` | ✅ 867 packages in 35 s | 3 advisories (1 low / 1 moderate / 1 high) in dev-adjacent deps |
| Type check | `npm run typecheck` | ✅ 0 errors | strict mode |
| Lint | `npm run lint` | ✅ 0 errors, 0 warnings | |
| Full test suite | `npm run test:coverage` | ✅ exit 0 | coverage 63.2 % statements / 52.8 % branches / 64.7 % lines — above the enforced baseline |
| Production build | `npm run build` | ✅ 19.1 s | |
| Bundle budgets | `npm run size` | ✅ | entry 131.19 KB gz (limit 150), total 1.01 MB gz (limit 1.2) |
| Dead code | `npm run knip` | ❌ **FAILS** | 3 unused files in `src/hooks/teams/seasonBreakdown/` — see below |
| Migration replay | all 324 migrations on fresh Postgres | ✅ exit 0 | mirrored the CI job exactly (bootstrap + sorted apply, stop-on-error) |
| SQL smoke tests | 4 suites in `supabase/tests/` | ✅ exit 0 | includes the score/stats business-logic suite |
| Playwright e2e (mock backend) | `npm run e2e` | ⚠️ 8 passed / 6 failed **in this sandbox** | all 6 failures are environment artifacts (see §2.3) — the same suites **pass in GitHub CI at this exact commit** |
| Security scan of repo | grep for service-role keys, committed `.env` | ✅ clean | only the browser-safe anon key is embedded (correct) |

### 2.2 The one genuine CI failure: dead code at HEAD

`npm run knip` fails locally **and the "Quality, tests, and coverage" CI job fails on `main` at this exact commit** (verified via the GitHub Actions API — run 29264074537: lint ✅, typecheck ✅, tests ✅, coverage ✅, **dead-code check ❌**). Every other CI job at this commit is green, including browser smoke, axe accessibility, Lighthouse, and the real-backend e2e suite.

Cause: commit `22a1943` ("Refactor season breakdown helpers into services") moved logic into services but left three now-unreferenced files behind:

- `src/hooks/teams/seasonBreakdown/calculateSeasonStats.ts`
- `src/hooks/teams/seasonBreakdown/processSeasonMatches.ts`
- `src/hooks/teams/seasonBreakdown/types.ts`

This is **PR-01** — a 15-minute fix that turns CI green again.

### 2.3 Browser verification and what "failed" in the sandbox

This sandbox routes all traffic through a TLS-inspecting proxy that the headless browser doesn't use by default, so requests to the production Supabase either reset or hang. Consequences, so nothing here is over-claimed:

- The Playwright **smoke** failure was `ERR_CONNECTION_RESET` console noise, and the 5 **a11y** failures were page-load timeouts waiting for "network idle" — none reached the actual accessibility assertions. **At the same commit, GitHub CI runs all of these and they pass** (verified via the Actions API, job "Browser smoke, a11y, and Lighthouse": smoke ✅, axe scan ✅, Lighthouse ✅).
- For my own hands-on walk-through (§2.5) I launched the browser *with* the proxy configured, so the app talked to the real production database read-only.

### 2.4 Scoring math verified against expected examples

On the freshly rebuilt database I ran the repo's own business-logic smoke test (passes) plus my own scenario script (`evidence/scoring-verification.log`), all inside a rolled-back transaction:

| Scenario | Expected | Observed |
|---|---|---|
| Approve a 2–1 result | winner 1W/2GW/1GL, loser 1L/1GW/2GL | ✅ exactly |
| Approve the same match again | returns `false`, counters unchanged | ✅ no double-count |
| Reverse then re-apply | counters return to identical values | ✅ exact round-trip |
| Power score hand-check | formula `weighted_win% × 40 + SOS × 45 + weighted_game_win% × 15` | ✅ output 38.25 matched hand computation to the decimal (45 × 0.85 fallback SOS with unweighted fixture division) |
| **Direct match edit without the stats function** | *should* stay consistent | ❌ **match row says team B won while counters still say team A won** — drift demonstrated (this is the anchor for PR-03) |
| Duplicate score reports | *should* be rejected or flagged | ⚠️ two identical pending rows accepted (minor — it's an admin inbox; PR-06) |

Also verified empirically against the rebuilt database catalog:

- **3 `SECURITY DEFINER` functions still lack a pinned `search_path`** (`fn_update_playoff_record`, `get_participants`, `snapshot_current_season`) — the 2026-07-13 hardening migration missed them (PR-04).
- The old permissive dashboard-era write policies on `participants`/`playoff_games` **are correctly dropped** after full replay — only admin-gated writes remain. (A prior worry, now cleared.)
- User-content tables (`messages`, `match_comments`, `match_reactions`, `message_reactions`, `team_memberships`, `contact_requests`) have **no foreign key** on `user_id` to `auth.users` — orphanable rows if a user is ever deleted (PR-07).

### 2.5 Hands-on app walk-through

I drove every public route in a real Chromium at three viewport sizes (375×812 phone, 768×1024 tablet, 1440×900 desktop) against production data as an anonymous visitor, with a **network-layer guard that blocked any write request** (none of the app's page loads attempted one — the guard log recorded zero blocked mutations). Results and screenshots: `evidence/exploration-results.json`, `evidence/*.png`.

**What the walk-through verified:**

- **39 page-loads completed** across 13 public routes × 3 viewports; every route rendered its shell, navigation, header/footer, and theme without crashing. The 404 page is excellent (clear message, Go Home / Go Back, consistent chrome — `evidence/404-mobile.png`).
- **Zero horizontal overflow at 375 px on every single page** — the responsive layout genuinely holds (`exploration-results.json`, `hOverflow` false everywhere).
- **Zero write attempts** by the app during pure browsing (the network guard recorded no blocked mutations).
- Mobile UX patterns confirmed on-screen: bottom tab bar, drawer-style panels, readable typography, sensible touch targets (`home-mobile.png`).
- Desktop polish confirmed: the Help page ships real content including an "Accessibility & Keyboard Navigation" section and a ⌘K search affordance (`help-desktop.png`).
- Realtime subscriptions retry with backoff when the connection drops (console shows orderly "scheduling reconnect", not crashes).

**An important caveat and a real finding.** This sandbox resets all external browser traffic, so every Supabase request failed — meaning I effectively tested the app **as a user on dead Wi-Fi**. Real data rendering therefore could not be verified here (it *is* verified by the CI real-backend Playwright suite, green at this commit, and by the eight mock-backend e2e tests that passed locally — admin gating, mass-score entry, bracket advancement, score-report validation). But the dead-Wi-Fi lens surfaced a genuine issue:

> **With the backend unreachable, `/stats` (Standings), `/compare`, and `/insights` display loading skeletons or near-blank content indefinitely — no error message, no retry button — at all three viewport sizes** (`exploration-results.json`: `hasContent:false` on those 3 routes × 3 viewports; `standings-mobile.png`). The repo's own July 1 audit called this pattern "errors look like empty screens"; it is still present. This is PR-10. A second, cosmetic finding: the navbar wordmark is clipped by the Login button at 375 px (`home-mobile.png`).

### 2.6 What I could NOT verify (stated plainly)

- **Admin flows live.** I had no admin credentials and would not have used them against production anyway. Admin tools were assessed from code, tests, and the CI real-backend suite.
- **Authenticated player flows live** (live-scoring writes, team management) — same reason. The scoring authorization matrix *is* covered by the SQL smoke test I ran (admin ✅, approved member ✅, pending member ❌, outsider ❌, completed match ❌).
- **Production Supabase dashboard settings** (email-confirmation toggle, leaked-password protection, backup schedule). `supabase/config.toml` says signup confirmations are off, but that file only governs local dev — the production setting lives in the dashboard and only Doug can check it.
- **Edge functions at runtime** (they run only in Supabase's Deno environment; I reviewed all four line-by-line and their CI tests).
- **Real-backend e2e suite locally** (requires secrets that are only in GitHub Actions — it passes there at this commit).

---

## 3. Confidence score

# **84 / 100**

**How to read this:** I would trust this app to run a real league night today. The score is held back not by broken features but by (a) one systemic weakness in how score *edits* keep standings counters in sync (empirically demonstrated, fixable with one well-defined PR), (b) the currently-red CI dead-code gate, and (c) verification limits — admin and authenticated flows could not be exercised live from this environment, so some confidence rests on the (strong) test suite and CI rather than direct observation.

The score is a weighted average of the 12 categories below (weights sum to 100). Every number cites evidence gathered in §2.

## 4. Scoring breakdown

| # | Category | Weight | Score | Weighted |
|---|---|---|---|---|
| 1 | Core functionality | 12 | 88 | 10.6 |
| 2 | Reliability & data integrity | 12 | 76 | 9.1 |
| 3 | Security | 10 | 86 | 8.6 |
| 4 | Automated testing | 10 | 83 | 8.3 |
| 5 | Database & migration quality | 8 | 90 | 7.2 |
| 6 | Code quality & maintainability | 8 | 87 | 7.0 |
| 7 | UX & ease of use | 8 | 80 | 6.4 |
| 8 | UI visual quality | 7 | 85 | 6.0 |
| 9 | Mobile responsiveness | 7 | 85 | 6.0 |
| 10 | Accessibility | 6 | 80 | 4.8 |
| 11 | Performance | 6 | 85 | 5.1 |
| 12 | Production readiness | 6 | 80 | 4.8 |
| | **Overall** | **100** | | **83.9 ≈ 84** |

### 4.1 Core functionality — 88 (weight 12)

**Why:** Every feature a rec league needs exists and the critical paths are verified: the SQL business-logic suite passed on a database I rebuilt from scratch (approve, tie, finalize, reopen, delete-with-reversal, scoring authorization matrix); local mock-backend e2e proved admin gating, mass-score entry (valid submits, invalid blocked), playoff bracket advancement to a champion, and score-report validation; 3,250 unit/integration tests pass. **Held back by:** live admin/authenticated flows unverified in production (no credentials — correctly so); the score-*edit* flow's fragility (see category 2). **Contribution:** largest weight; this is what the app *is*.

### 4.2 Reliability & data integrity — 76 (weight 12) — the main detractor

**Why it still scores 76 and not lower:** the primitives are excellent — atomic, idempotent, lock-protected SQL functions verified by experiment (double-approve returns false and changes nothing; reverse→re-apply round-trips exactly; underflow is clamped; single-active-season enforced by trigger). **Why not higher:** the score submission/edit flow composes 3–5 separate network calls client-side; I demonstrated on a fresh database that the direct match update it uses can leave the match row and team counters disagreeing (§2.4), the code itself ships a "Partial Update" toast for exactly this, the mass-entry tool's double-decrement guard lives only in browser memory (lost on refresh), and a prior double-count bug is memorialized in a migration name. Duplicate score reports accepted (minor). Missing user FKs allow orphan rows (minor). **Fix path:** PR-02 (+ PR-04, PR-05, PR-06) takes this to ~95. **Contribution:** the single biggest drag on the overall score — intentionally, because standings are the product.

### 4.3 Security — 86 (weight 10)

**Why:** RLS enabled on all ~50 tables (verified in the rebuilt catalog); admin authorization enforced server-side in three layers; privilege-escalation trigger + audit log; storage buckets hardened (5 MB, images only, team-scoped folders); no service-role key anywhere in the repo; `.env` untracked; edge functions fail closed (verified by reading all four: webhook secret required, CORS allow-list, rate limiting, honeypot, zod `.strict()`); weekly gitleaks + npm-audit CI; production dependencies carry just one moderate advisory (`brace-expansion` ReDoS-class, trivial fix). **Held back by:** 3 SECURITY DEFINER functions without pinned search_path (verified; PR-03); production auth settings (email confirmation, leaked-password protection) unverifiable from the repo (PR-13); signup email-confirmation off in local config. **Contribution:** high weight; strong showing.

### 4.4 Automated testing — 83 (weight 10)

**Why:** 447 test files / ~3,250 tests, all passing (exit 0); coverage 63.2% statements enforced as a CI floor with per-directory minimums (services 72%); test quality is behavioral (mock-at-boundary, only 3 snapshot files); genuine integration tests (the live-scoring finalize test proves the no-double-count contract); 7 Playwright suites including a real-backend project in CI; 4 SQL smoke suites; axe + Lighthouse gates. **Held back by:** components are the thin layer (582 source files vs 174 test files; brackets services 51:14; live-scoring UI 7 test files); only 6 root-level integration tests; a11y asserted only at e2e on 6 public routes. **Fix path:** PR-07, PR-08, PR-09. **Contribution:** high weight, solidly above average for this class of app.

### 4.5 Database & migration quality — 90 (weight 8)

**Why:** all 324 migrations replayed cleanly on a blank Postgres in one pass (I ran it; CI does it weekly); a deliberately engineered idempotent baseline makes fresh rebuilds a supported operation; FK web + integrity triggers + unique constraints where upserts need them; the dashboard-era permissive policies are correctly dropped by later migrations (verified in `pg_policies`). **Held back by:** user-FK gaps (PR-06), a dead debug table, three mixed naming conventions, and some storage buckets whose creation predates migrations. **Contribution:** the strongest category.

### 4.6 Code quality & maintainability — 87 (weight 8)

**Why:** TypeScript fully strict; **one** `any` in product code; zero `@ts-ignore`; zero TODO/FIXME; `select('*')` banned by lint and absent; the services-layer architecture is enforced by a custom lint rule and holds (every direct Supabase client import outside services is an allowed realtime/storage exception — verified); knip dead-code gate; largest hand-written file 410 lines; 304 commits in the last week with real hygiene work. **Held back by:** 56 annotated react-hooks lint waivers (a monitored debt, not hidden, but a debt); the hand-rolled-hooks cluster (PR-11); ~285 deferred unused exports, dual lockfiles, boilerplate README (PR-12); the 3 dead files currently failing knip (PR-01). **Contribution:** strong.

### 4.7 UX & ease of use — 80 (weight 8)

**Why:** clear navigation (bottom tabs mobile / top bar desktop), a real Help page with FAQ and accessibility notes, home-page quick actions, friendly 404, loading skeletons everywhere, validated forms with specific error messages (verified in e2e: invalid mass scores and score reports are blocked with feedback before any API call). **Held back by:** the **verified** dead-network behavior — Standings/Compare/Insights strand users on skeletons with no error or retry (PR-10); authenticated UX unverified live; minor navbar clipping at 375 px. **Contribution:** the second-largest improvable gap.

### 4.8 UI visual quality — 85 (weight 7)

**Why:** coherent design-token system (`src/styles/design-system/`), consistent shadcn/Radix components, polished dark theme with light mode and admin-toggleable seasonal themes, professional-looking pages at all three sizes (screenshots in `evidence/`). This is a *subjective* category; I'm scoring consistency and craft, both high. **Held back by:** navbar wordmark clipping at 375 px (confirmed); skeleton-heavy degraded states read as "broken" (PR-10); minor React DOM-prop console warning on one route. **Contribution:** solid; no redesign warranted.

### 4.9 Mobile responsiveness — 85 (weight 7)

**Why:** **zero horizontal overflow at 375 px across all 13 tested routes** (measured); dedicated mobile navigation; drawer-style dialogs; 44 px touch targets in live scoring; list virtualization; Capacitor + PWA scaffolding. **Held back by:** the navbar clipping; live-scoring and team-detail pages not reached in-browser (no data); mobile component tests thin (PR-08). **Contribution:** strong, and mobile is where this app lives on league night.

### 4.10 Accessibility — 80 (weight 6)

**Why:** an actual **blocking** axe WCAG 2 A/AA gate on 6 routes (green in CI at this commit — verified via the Actions API), Lighthouse a11y ≥ 0.9 enforced, skip links, a route announcer, 233 aria-attribute usages, Radix accessible primitives. **Held back by:** near-zero programmatic focus management (2 call sites — route changes don't move focus); no component-level a11y checks, so authenticated surfaces are never scanned (PR-09). **Contribution:** above-average baseline, clear next step.

### 4.11 Performance — 85 (weight 6)

**Why:** enforced budgets passing with headroom (entry 131 KB gz / 150 limit; total 1.01 MB gz / 1.2 limit — measured); route-level code splitting everywhere; vendor chunking; charts lazy-loaded; critical-CSS inlining; image compression on upload; 19-second production build; Lighthouse in CI. **Held back by:** 1 MB total JS is still hefty for a league site on venue Wi-Fi; no field performance data (RUM) to know real LCP; database query performance unprofiled. **Contribution:** healthy.

### 4.12 Production readiness — 80 (weight 6)

**Why:** genuinely deployed and in use (Lovable + Cloudflare), Sentry wired, PWA, strong CI/CD, self-auditing culture, weekly scheduled security/migration jobs. **Held back by:** **CI is red on `main` right now** (knip — PR-01); production dashboard settings undocumented/unverified (PR-13); no staging environment; single-maintainer bus factor. **Contribution:** the "would I page someone for this" category — fixable to ~90 with the two cheapest PRs in this plan.

---

## 5. Improvement plan

Each item links to a fully specified brief in [`briefs/`](briefs/). Classifications: **[D]** confirmed defect, **[R]** likely risk, **[E]** enhancement, **[P]** preference.

### Tier 1 — Critical

| Item | Class | Evidence | Brief | Difficulty | Score |
|---|---|---|---|---|---|
| CI dead-code gate red on `main` (3 orphaned files) | [D] | knip exit 1 locally; Actions run 29264074537 step 9 failure | [PR-01](briefs/PR-01-fix-knip-ci-gate.md) | Trivial | +0.6 |
| Non-atomic score submission/edit can desync standings counters | [D/R] | drift demonstrated on fresh DB (`evidence/scoring-verification.log` B5); "Partial Update" toast in code; refresh loses the double-decrement guard | [PR-02](briefs/PR-02-atomic-match-resubmission.md) | High | +2.3 |

*(Nothing else met the Tier-1 bar. Notably: no security vulnerabilities were found that are exploitable from the client; the build passes; migrations are complete; scoring math itself is correct.)*

### Tier 2 — High value

| Item | Class | Evidence | Brief | Difficulty | Score |
|---|---|---|---|---|---|
| 3 SECURITY DEFINER functions lack pinned search_path | [D] | `pg_proc` catalog query after full replay | [PR-03](briefs/PR-03-pin-security-definer-search-paths.md) | Low | +0.4 |
| Legacy result-write paths invite drift regressions | [R] | dead `approveMatch`/`setMatchAsTie` confirmed by grep; untyped `updateMatch` payload | [PR-04](briefs/PR-04-remove-legacy-result-write-paths.md) | Medium | +0.7 |
| Brackets subsystem under-tested (51 src : 14 test files) | [R] | file inventory; highest-complexity subsystem | [PR-07](briefs/PR-07-brackets-service-test-coverage.md) | Med-high | +0.9 |
| Live-scoring UI components under-tested | [R] | 7 test files for the tree; logic well-tested, components not | [PR-08](briefs/PR-08-live-scoring-ui-tests.md) | Medium | +0.6 |
| No route-change focus management; no unit-level axe | [D/E] | 2 `.focus()` sites measured; axe only on 6 public routes | [PR-09](briefs/PR-09-focus-management-and-unit-a11y.md) | Medium | +1.0 |
| Data pages strand users on skeletons when network fails; navbar clip at 375 px | [D] | observed: 3 routes × 3 viewports `hasContent:false`; screenshots | [PR-10](briefs/PR-10-data-page-error-states.md) | Medium | +1.3 |

### Tier 3 — Polish and growth

| Item | Class | Evidence | Brief | Difficulty | Score |
|---|---|---|---|---|---|
| Duplicate score reports accepted | [D] | 2 identical rows inserted on fresh DB | [PR-05](briefs/PR-05-score-submission-dedupe.md) | Low-med | +0.4 |
| Missing user FKs; dead debug table | [R] | catalog query: 6 content tables without user FK | [PR-06](briefs/PR-06-user-fk-hardening-and-db-hygiene.md) | Medium | +0.5 |
| Hand-rolled hooks bypass TanStack Query | [P/E] | `useScoreSubmissions` + message-board family read directly | [PR-11](briefs/PR-11-tanstack-query-migration.md) | Medium | +0.5 |
| Boilerplate README; doc drift; dual lockfiles; unused-export backlog | [D] | README is Lovable template; stale workflow names greppable | [PR-12](briefs/PR-12-repo-hygiene-and-doc-drift.md) | Low | +0.5 |
| Production settings undocumented/unverified; no ops runbook | [R] | config.toml governs local only; secrets inventory implicit | [PR-13](briefs/PR-13-production-settings-runbook.md) | Low + Doug | +0.7 |

**Score arithmetic:** 84 → after Tier 1 ≈ **87** → after Tier 2 ≈ **92** → after Tier 3 ≈ **94**. The remaining ~6 points are things a plan can't buy: live production verification of admin flows over time, a staging environment, more than one maintainer, and field performance data.

---

## 6. AI-ready PR briefs

Thirteen standalone briefs live in [`briefs/`](briefs/). Each contains: identification table (phase/tier/agent/difficulty/risk/score/parallelism/dependencies), background with evidence, one-sentence objective, exact scope with out-of-scope list, likely files, step-by-step implementation instructions, database requirements, UI/UX requirements per state, testing requirements with concrete cases, exact validation commands, a click-by-click manual checklist for Doug, objective acceptance criteria, non-goals/guardrails, rollback notes, and required deliverables. Copy a brief verbatim into Lovable, Claude Code, or Codex as the task prompt.

| PR | Title | Phase | Tier | Agent |
|---|---|---|---|---|
| [PR-01](briefs/PR-01-fix-knip-ci-gate.md) | Remove 3 orphaned files, un-block CI | 1 | 1 | Codex/Claude Code |
| [PR-02](briefs/PR-02-atomic-match-resubmission.md) | Atomic match resubmission RPC | 2 | 1 | Claude Code |
| [PR-03](briefs/PR-03-pin-security-definer-search-paths.md) | Pin last 3 search_paths | 2 | 2 | Codex/Claude Code |
| [PR-04](briefs/PR-04-remove-legacy-result-write-paths.md) | Remove/guard legacy write paths | 2 | 2 | Claude Code/Codex |
| [PR-05](briefs/PR-05-score-submission-dedupe.md) | Score-report dedupe | 2 | 3 | Codex/Claude Code |
| [PR-06](briefs/PR-06-user-fk-hardening-and-db-hygiene.md) | User FK hardening + drop debug table | 2 | 3 | Claude Code |
| [PR-07](briefs/PR-07-brackets-service-test-coverage.md) | Brackets service tests | 3 | 2 | Claude Code |
| [PR-08](briefs/PR-08-live-scoring-ui-tests.md) | Live-scoring UI tests | 3 | 2 | Claude Code/Codex |
| [PR-09](briefs/PR-09-focus-management-and-unit-a11y.md) | Focus management + unit axe | 4 | 2 | Claude Code |
| [PR-10](briefs/PR-10-data-page-error-states.md) | Data-page error states + navbar fix | 4 | 2 | Claude Code (or Lovable) |
| [PR-11](briefs/PR-11-tanstack-query-migration.md) | TanStack Query migration | 5 | 3 | Claude Code |
| [PR-12](briefs/PR-12-repo-hygiene-and-doc-drift.md) | README/doc drift/lockfile/export hygiene | 5 | 3 | Codex/Claude Code |
| [PR-13](briefs/PR-13-production-settings-runbook.md) | Ops runbook + Doug's dashboard checklist | 6 | 3 | Claude Code + **Doug** |

## 7. PR phases

- **Phase 1 — Baseline:** PR-01. (App startup, tests, build, lint, types were all verified working in §2 — the only broken baseline item is the knip gate.)
- **Phase 2 — Reliability, database, security:** PR-02 → PR-04, with PR-03, PR-05, PR-06 alongside.
- **Phase 3 — Tests & regression protection:** PR-07, PR-08 (PR-02 ships its own scoring regression tests).
- **Phase 4 — UI/UX/a11y/mobile:** PR-09, PR-10.
- **Phase 5 — Performance & maintainability:** PR-11, PR-12.
- **Phase 6 — Polish & growth:** PR-13 (plus future ideas: standings-drift monitor query as a scheduled check, RUM/analytics, richer player-stat visibility — deliberately not specced as PRs until the above land).

## 8. Sequencing and ownership

**Recommended order:** PR-01 (today) → PR-02 → PR-04 → then parallel waves.

- **Wave A (parallel with PR-02):** PR-03, PR-05, PR-06 (SQL-only, no file overlap), PR-07, PR-08 (test-only), PR-12 (docs).
- **Must be serial:** PR-01 → PR-02 → PR-04 (same files: `MatchWriteService`, matches hooks). PR-11 should wait for PR-02/04 to settle the matches-hooks area.
- **Independent:** PR-09, PR-10 can go anytime (small overlap risk with each other in `PageLayout`/page containers — sequence 09 then 10, or coordinate).
- **Best-suited agents:** heavy SQL+multi-layer → Claude Code (PR-02, PR-04, PR-06, PR-07, PR-09, PR-11, PR-13); mechanical/scoped → Codex (PR-01, PR-03, PR-05, PR-12); visual-state work → Lovable acceptable for PR-10 with the brief pasted verbatim.
- **Doug-manual actions:** PR-13's dashboard checklist (email confirmations, leaked-password protection, backups, edge-function secrets, cron cadence); confirming a backup before PR-06; merging PRs.
- **Needs Supabase production access:** deploying any migration PR (02, 03, 05, 06 — normal Lovable/Supabase deploy flow); PR-13's checklist. Everything else is repo-only.
- **Likely merge conflicts:** PR-02↔PR-04 (by design, serial); PR-09↔PR-10 (`PageLayout`); PR-12's export cleanup vs. anything in flight (do it last in its wave).
- **Branch strategy:** one branch per PR off `main` (`fix/knip-dead-files`, `feat/atomic-resubmit`, …), merged in the order above; no long-lived integration branch needed at this repo's velocity.

## 9. Final summary

- **Current score: 84/100.** After Tier 1: **~87**. After Tier 2: **~92**. After Tier 3: **~94**.
- **Five highest-value changes:** PR-02 (atomic scoring writes), PR-10 (error states — the thing users actually see fail), PR-09 (focus management), PR-07 (bracket tests), PR-01 (green CI, 15 minutes).
- **Five highest-risk unresolved issues:** (1) counter drift via the non-atomic edit path; (2) mass-entry double-decrement after a mid-batch failure + refresh; (3) unverified production auth/dashboard settings; (4) bracket subsystem complexity with thin tests; (5) dead-network UX on data pages during league night.
- **Start with:** PR-01, today. Then PR-02.
- **Best parallel set:** PR-02 (Claude Code) + PR-03/PR-05 (Codex) + PR-07 (Claude Code) + PR-12 (Codex).
- **Doug's manual actions:** PR-13 checklist (30 minutes of dashboard clicking), backup confirmation before PR-06, and deciding the email-confirmation policy.
- **Blunt verdict: Production-capable.** Not "usable with caution" — it is already run in production with real users, strong server-side integrity primitives, enforced quality gates, and a self-auditing habit that most professional teams don't have. Not yet "strong and reliable" either — that label arrives when score edits are atomic (PR-02), CI is green (PR-01), and the failure modes users can actually hit (PR-10) show graceful errors instead of skeletons. After Tier 2, "strong and reliable" is the honest label; "highly polished" needs the Tier 3 tail plus time in production.

### Fact classification (nothing above is invented)

- **Verified facts:** everything in §2's tables and experiments — commands run in this review with logs in `evidence/`; CI job states read from the GitHub Actions API; catalog queries against the rebuilt database; screenshots.
- **Reasonable inferences:** the refresh-window double-decrement scenario (mechanism read from code; not reproduced end-to-end in a browser); "errors look like empty screens" applying to real users (observed under simulated dead network, not with real users); bus-factor and staging-gap concerns.
- **Unverified assumptions:** production dashboard settings; behavior of admin flows against production data; whether any drifted counters exist in production today (the PR-13 reconciliation query answers this).
- **Subjective opinions (labeled as such):** UI visual-quality scoring; the SOS-weighted power-score design (45% SOS is a league-philosophy choice, not a defect); preference for TanStack Query consistency (PR-11 is marked preference/enhancement).

*Review artifacts: logs, screenshots, and raw JSON in `evidence/`. Reviewed at commit `98e8c6a`, 2026-07-13.*
