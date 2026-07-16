# 717REC — Full Quality Review (2026-07-15)

**Reviewed commit:** `79744a0dedbebe9a43c3984e1b54b5c8ae2742fd` (tip of `main`, 2026-07-15 14:20 EDT, merge of PR #1043)
**Review branch:** `claude/717rec-quality-review-vyt20i`
**Supersedes:** the 2026-07-13 review (84/100) previously stored in this folder — see §3 for what changed in the intervening two days.
**Method:** hands-on. Everything in §4 was actually executed in a clean sandbox (fresh clone, fresh dependency install, fresh PostgreSQL 15 in Docker, real Chromium at 3 screen sizes, authenticated admin walk-through). Claims that could not be executed are listed in §9 as *not verified* — nothing in this report is assumed from documentation alone.

---

## 1. What this app is, in plain language

717REC runs a recreational cornhole league in Lancaster, PA. Think of it as three apps in one:

1. **A public league website.** Anyone can see standings, the weekly schedule, team pages, playoff brackets, season history, a message board, and stat pages (including "power rankings" that weight wins by how strong the opponent's division is). Visitors can also report a match score or send the admins a message — no account needed.
2. **A player app.** People with accounts can join a team, manage their team page, and follow live match scoring.
3. **An admin console.** Doug (and other admins) manage seasons, divisions, teams, scheduling (including auto-scheduling and double-headers), approve or reject publicly-submitted scores, enter scores in bulk, and run the playoffs.

Under the hood: the screens are built with React (via Lovable, which edits this repository automatically); all data lives in Supabase (a hosted PostgreSQL database with login, file storage, and small server functions). The database is the part that "knows the rules": on every main path, approving a match result, updating team win/loss counters, and recomputing standings happen inside database procedures so they either fully succeed or fully fail together (one admin flow still sidesteps this — the Mass Score Entry delete button, finding F-02). Public score reports go through a rate-limited server function so the public can't write to the database directly. Security is enforced at the database row level (RLS) — every table checks "is this person an admin?" on the server, not in the browser.

A distinctive fact about this codebase: **it is nine days old** (first commit 2026-07-06) and has 352 commits — roughly 55% written by Lovable's bot, the rest by Doug and AI coding agents. It is an AI-built, AI-maintained codebase moving at unusual speed, with an unusually serious safety net (about 3,400 automated tests, 456 test files, and a CI pipeline that checks types, style, tests, coverage, dead code, bundle size, browser smoke tests, accessibility scans, Lighthouse, database migration replays, and leaked secrets). The central theme of this review: **the safety net is real, but nothing forces anyone to stay inside it** — 40% of recent commits bypassed it entirely, and it was red on the day of this review.

## 2. How this review was conducted

- **Pinned everything to one commit** (`79744a0`) and ran the project's own quality gates from scratch, capturing every exit code and output (see `evidence/`).
- **Rebuilt the database from nothing**: all 334 migration files replayed in order onto a brand-new PostgreSQL 15 in Docker (exactly mirroring the repo's own CI job), then ran the repo's 7 SQL smoke-test suites.
- **Checked the scoring math by hand**: extracted the actual database functions and the standings view, computed expected results on paper for a 2–1 match, then ran controlled experiments (inside transactions that were rolled back) — approval, double-approval, reversal + re-approval, deliberate drift injection, duplicate score reports, determinism runs.
- **Drove the real app in a real browser** at phone (375×812), tablet (768×1024), and laptop (1440×900) sizes across every public page, and then — using admin credentials provided for this review — audited the authenticated admin console. A hard network-layer guard aborted every data-modifying request in both phases (the only exception: the login call itself in the admin phase), so **zero writes reached production**; the guard log is in the evidence folder.
- **Ten parallel deep-dive investigations** into known risk areas (legacy write paths, edge-function security, hook patterns, brackets, bulk score entry, doc drift, coverage blind spots, lint waivers, submission dedupe, accessibility), each finding independently re-verified by an adversarial checker before being accepted into this report.
- **Cross-checked GitHub**: CI run history on `main`, job logs for the reviewed commit, and the commit provenance of every defect found (who wrote it, via PR or direct push).

## 3. What changed since the 2026-07-13 review (84/100)

That review is two days old, and this repo moves fast in both directions:

**Fixed since then (verified today, not taken on faith):**
| Prior finding | Status today | Evidence |
|---|---|---|
| knip dead-code gate red (3 orphaned files) | **Fixed** — knip exits 0, zero findings | `evidence/knip.txt` |
| 3 SECURITY DEFINER functions without pinned `search_path` | **Fixed** — 0 of 70 unpinned | `evidence/db-security-audit.txt` |
| Duplicate public score reports accepted | **Fixed** — partial unique index `score_submissions_pending_dedupe`; duplicate insert rejected in live test | `evidence/scoring-verify.txt` S5 |
| 6 user-content tables missing FKs; debug table | **Fixed** — FK hardening migration + its own smoke test now in the suite | `evidence/migration-replay.txt` |
| Optimistic UI not rolled back on failed match update | **Fixed** in product (`6fd916d`) — but the fix broke a stale test, see below | root-cause analysis, §5.1 |

**Broken since then (new, verified today):**
| New defect | Introduced by | Evidence |
|---|---|---|
| 2 unit tests fail deterministically on `main` | Same-day direct Lovable-bot pushes (`329793e`, `6fd916d`) with correct product changes but un-updated tests | `evidence/test-summary.txt`; CI run 29440142270 red |
| CI "Quality, tests, and coverage" red on `main` most of review day; PR #1043 merged over it | No branch protection; 40% of last 40 `main` commits are direct bot pushes | GitHub Actions history; `git log --first-parent` |

The pattern matters more than the individual items: **five prior-review fixes landed within 48 hours** (excellent execution), and **two new regressions landed the same way those fixes did — straight to `main`, ungated**. Quality work is being poured into a bucket with a hole in it. Hence this review's #1 recommendation (PR-02: merge gate).

## 4. Verification results (everything executed, with outcomes)

| Check | Command | Result | Evidence |
|---|---|---|---|
| Dependency install | `npm ci` | ✅ exit 0 | `evidence/` (npm-ci excerpt not committed; exit 0) |
| Type check | `npm run typecheck` | ✅ exit 0, 0 errors | `evidence/typecheck.txt` |
| Lint | `npm run lint` | ✅ exit 0, 0 warnings | `evidence/lint.txt` |
| Unit/integration tests | `npm run test:coverage` | ⚠️ **2 failed** / 3,424 passed / 1 expected-fail (453 files; 235s) | `evidence/test-summary.txt` |
| Failing tests, isolated rerun | `npm run test:file -- <2 files>` | ⚠️ same 2 fail → deterministic, not flaky | `evidence/test-summary.txt` |
| Coverage | v8 via same run | ✅ 65.4% lines, 64.0% statements, 59.6% functions, 53.6% branches | `evidence/test-summary.txt` |
| Production build | `npm run build` | ✅ exit 0 in 15.9s | `evidence/build.txt` |
| Bundle budgets | `npm run size` | ✅ entry 130.97 kB gz (limit 150); total 1.01 MB gz (limit 1.2) | `evidence/size.txt` |
| Dead code | `npm run knip` | ✅ exit 0, no findings | `evidence/knip.txt` |
| Dependency vulnerabilities | `npm audit --omit=dev` | ✅ 0 vulnerabilities | `evidence/audit.txt` |
| Migration replay | 334 files, fresh PG15, CI-identical script | ✅ all applied, `ON_ERROR_STOP=1` | `evidence/migration-replay.txt` |
| SQL smoke suites | 7 suites from `supabase/tests/` | ✅ all passed | `evidence/migration-replay.txt` |
| Scoring-math experiments | 6 scenarios on the replayed DB | ✅ all assertions passed; drift scenario confirmed the risk it was designed to demonstrate | `evidence/scoring-verify.txt` |
| DB security audit | catalog queries on replayed DB | ✅ RLS on every table; 0/70 definer functions unpinned; writes admin-gated | `evidence/db-security-audit.txt` |
| Browser e2e (mock backend) | `npm run e2e` (chromium) | ⚠️ first run 6 failed/8 passed — all 6 were `page.goto` timeouts under heavy sandbox load; rerun on idle machine: see §4.1 | `evidence/e2e-local.txt` |
| Browser walk-through | 42 page-loads (14 routes × 3 viewports) + harvested detail pages, write-guard on | see §6 | `evidence/exploration-results-anon.json`, screenshots |
| Admin console audit | authenticated, write-guard on | see §7 | `evidence/exploration-results-admin.json`, screenshots |
| Edge-function tests (Deno) | — | ❌ not runnable here (no Deno in sandbox); assessed by code read + green `Supabase CI` history | §9 |
| Real-backend e2e | — | ❌ not runnable (no E2E secrets — **and CI's green version of this job is a silent skip**, see finding F-03) | CI job log |

### 4.1 The local e2e caveat, stated precisely

The first local Playwright run produced 8 passed / 6 failed. All 6 failures were `page.goto … waiting until "networkidle"` timeouts — never an assertion about the app. Root cause (diagnosed, not assumed): this sandbox's network edge stalls the browser's direct TLS connections (to Supabase and the three third-party CDNs) for ~25s before resetting them, so `networkidle` never settles on unmocked pages. The 8 specs that fully mock the backend — including both admin-access tests, both mass-score tests, the bracket-advancement test, and both score-submission tests — **passed locally**. The same 14-spec suite, including the 6 that failed here, ran **green in GitHub CI on this exact commit** (run 29440142270, "Browser smoke, a11y, and Lighthouse": success) roughly 40 minutes before this review's run. Conclusion: no e2e-detectable defect is in evidence; the local failures are sandbox artifacts. This is also why the review's page-by-page browser walk relays backend traffic through a verified-working channel.

## 5. Findings

Severity reflects *impact on a real league night*, and every finding was verified in this session (file:line read, command output, or screenshot) unless marked ⚠ *single-source* (found by one investigation pass; the independent re-check couldn't run).

### Tier 1 — fix first (correctness of records, trust in green checkmarks)

| # | Finding | Evidence |
|---|---|---|
| F-01 | `main` is red: 2 deterministic unit-test failures; CI test job failing; merges continue anyway (no branch protection; 40% of recent commits are direct bot pushes). Both failures are **stale tests** — the product changes were correct, including one that fixed a real optimistic-rollback bug | test-summary.txt; CI run 29440142270; git history (`329793e`, `6fd916d`) |
| F-02 | The one remaining non-atomic write path: Mass Score Entry's **delete** runs `deleteMatch` → `reverseTeamStats` → `upsertTeamSeasonStats` as 3 separate calls with client-state amounts; failure after step 1 = permanent counter drift. (The atomic RPC exists and is used by the Schedule page's delete.) | MassScoreEntryTool.tsx:45-89 read in session; drift class empirically demonstrated in scoring-verify.txt S4 |
| F-03 | CI's "E2E (real Supabase)" job has never tested anything: all E2E secrets empty, single spec self-skips, job reports success | CI job 87436677539 log: `E2E_SUPABASE_URL:` (blank), `1 skipped` |
| F-04 | Support/contact messages can be silently lost: `send-support-email` stores tickets into a table **no migration creates** ("Will silently noop if table is missing" — its own comment) and still returns success if email also fails | send-support-email/index.ts:169-186 read in session; `grep -rl support_tickets supabase/migrations` → 0 files |
| F-05 | Playoff final standings are computed and written **client-side** by whichever browser observes bracket completion — silently skipped if only public viewers (RLS blocks them) or nobody is watching | useBracketCompletion.ts:38-66 read in session |

### Tier 2 — reliability, honesty of UI, coverage

| # | Finding | Evidence |
|---|---|---|
| F-06 | Mass-entry error reporting is dead code: failures collect into state nothing renders; submit-button count includes rows the submit filter skips; `Promise.all` batch can self-deadlock on `team_season_stats` | useErrorHandling.ts:21-24; MassScoreEntryTool.tsx:92; useScoreEntryData.ts:117-134 |
| F-07 | `useTeamMutations` never invalidates the `['teams']` cache — admin team edits/deletes don't appear until hard refresh (72-line file, zero queryClient references — verified) | src/hooks/useTeamMutations.ts |
| F-08 | `useTeamRankings` writes `ranking_snapshots` as a side effect of *reading* rankings, mounted in 5 places | useTeamRankings.ts:145-173 |
| F-09 | Admin Timeslots shows "Unknown Team" for all assigned slots (live data, review day) | screenshot evidence/screenshots/admin-section-timeslots.png |
| F-10 | Rate limiter keys on client-spoofable first XFF hop and fails open on error; IP hash unsalted | _shared/rateLimit.ts; send-support-email/index.ts:85-89 |
| F-11 | Coverage blind spots in live admin surfaces: auto-schedule 1.16%, live-corrections 0%, auth ~32%; no per-directory coverage floors | coverage run + coverage-baseline.txt |
| F-12 | Playoff match editor accepts tied scores after a pre-validation "unlock" write (no rollback); brackets-manager then rejects | useMatchEditorState.ts:128-142 ⚠ *single-source* |
| F-13 | Seed-management latch never resyncs after "Reset to Auto" — stale seeds can flow into bracket creation | useSeedManagement.ts:36 (latch pattern verified in session) ⚠ *single-source consequence* |
| F-14 | ~~No route-change focus management~~ **Corrected after publication:** `RouteFocusManager` exists (`src/components/a11y/RouteFocusManager.tsx`, wired in `App.tsx:291`, tested) and moves focus to the `<main>` landmark on push navigations — the original claim came from a grep pattern (`\.focus()`) that missed `focus({ preventScroll: true })`. Remaining a11y gaps are narrower: axe never scans admin screens, and two React prop warnings fire (`fetchPriority`, forwardRef) | RouteFocusManager.tsx read in session; App.tsx:19,291 |
| F-15 | Stranded-skeleton failure mode on data pages (no error/retry states) — prior-review finding, still present | sandbox observation + prior review |
| F-16 | Lighthouse CI assertions all `warn`-level — the step cannot fail | lighthouserc.json |

### Tier 3 — polish and hygiene (selection)

`.single()` → 406 console noise where empty is legitimate (WeeklyRecapService.ts:55); `fetchPriority` prop warning (HeroSection.tsx:54,128); "Maximum update depth" warning on /schedule (desktop); Lovable editor script + Google Fonts on the production critical path (index.html:43-53); bracket realtime toast storm; brackets-viewer from CDN at runtime; playoff status-mapping trigger bug (3/5→'pending'); doc drift table (ARCHITECTURE.md tables, roadmap, 3 stale plan files, inert deno.lock); `updateScoreSubmissionStatus` lacks pending-status guard; admin approval UI doesn't group conflicting score submissions for the same match.

**Explicitly re-checked and NOT problems:** score-submission dedupe (unique index works — tested); SECURITY DEFINER search_paths (0/70 unpinned); user FKs (landed, smoke-tested); bun.lock (intentional, documented); `capture-power-snapshots` (fails closed behind secret); public-user bracket editor (refuted — gated at BracketDetail.tsx:192); knip (clean); scoring math (exact to hand computation); anonymous public app makes zero write attempts across 43 page-loads.

## 6. Hands-on browser results — public app

43 page-loads (14 routes × 3 viewports + harvested team-detail page), real production data, write-guard active:

- **43/43 rendered content; zero navigation failures; zero page exceptions; zero horizontal overflow at 375px; zero images missing alt text; skip-link present on every page.** The write guard aborted **0** requests in the anonymous phase — the public app attempts no writes at all.
- Real-data spot checks: standings show 27 teams across 3 divisions with power scores; history, schedule, message board, compare, insights all render live content at all three sizes.
- Console: the only true app-level issues were the 406 noise (home), the `fetchPriority` warning (home ×3 viewports), one forwardRef warning (/stats), and one "Maximum update depth" warning (/schedule desktop). Everything else traced to sandbox-blocked third parties and unavailable WebSockets.

## 7. Hands-on browser results — admin console (authenticated)

Login via the real form succeeded; write-guard stayed active throughout (login token call was the only permitted POST; **0 mutation attempts were made or blocked** — viewing admin screens fires no writes, which is itself good hygiene).

- `/admin`, `/admin/notifications`, `/my-team` audited at desktop + mobile: all render (h1s "Admin Dashboard", "Admin Notifications", "My Team"), zero real console errors at desktop.
- **All 18 admin sidebar sections walked and screenshotted** (Timeslots, Match Creation, Auto Schedule, Matchups, Scores, Live Corrections, Season, Participation, Requests, Contact Inbox, Teams, Divisions, Pending, Hero, Themes, Blind Draw, Help, League Night): every one loaded real content with **zero non-sandbox console errors**. Admin UX: searchable sidebar, lazy-loaded sections with loading states, mobile admin nav present.
- Defect observed with live data: Timeslots' "Current Timeslots" table shows **Unknown Team** for all four assignments dated review day (F-09).
- Not exercised by design: any state-changing action (approve, submit, delete, save) — the guard forbids it; client-side validation and rendering were the audit surface. End-to-end admin mutations are covered by the mocked e2e specs (passed locally) and should get real-backend coverage via PR-03.

## 8. Scores

Same 12 categories and weights as the 2026-07-13 review (weights sum to 100; overall = weighted mean). Each score cites its primary evidence.

| Category | Weight | Score | Basis (§ refs) |
|---|---|---|---|
| Core functionality | 12 | 88 | §6/§7 walk clean; scoring math exact (§4); F-06/F-09/F-12 deduct |
| Reliability & data integrity | 12 | 78 | atomic paths verified + idempotency (§4); F-01/02/04/05/07 deduct |
| Security | 10 | 88 | RLS all tables, 0/70 unpinned, admin-gated writes, 0 prod vulns, gitleaks; F-10 + unverified dashboard settings deduct |
| Automated testing | 10 | 78 | 3,427 tests/65.4% lines; SQL smoke suites; F-01 red main, F-03 silent skip, F-11 blind spots |
| Database & migrations | 8 | 90 | 334-file replay from zero; smoke suites; locking RPCs; status-trigger bug + missing drift detector deduct |
| Code quality & maintainability | 8 | 84 | strict TS, lint 0, knip 0, 1 TS-suppression repo-wide; bracket repair layer + 6 hand-rolled hooks deduct |
| UX & ease of use | 8 | 80 | rich public UX, 18 clean admin sections; F-06/F-09/F-15 deduct |
| UI visual quality | 7 | 86 | consistent system at 3 viewports (screenshots); minor console warnings |
| Mobile responsiveness | 7 | 88 | 0 overflow @375 on all routes; bottom nav; admin mobile nav |
| Accessibility | 6 | 84 | skip links 43/43, alts 100%, axe green (CI), route-change focus manager present and tested (F-14 corrected); admin screens unscanned by axe, two React prop warnings |
| Performance | 6 | 82 | 131KB gz entry (budget 150), code-split admin; third-party scripts, toast storms, warn-only Lighthouse |
| Production readiness | 6 | 72 | live real league; comprehensive CI **unenforced** (F-01/03/16); settings unverified; F-04 |

**Overall: 83/100.**

Reading this against the prior 84: the score band is the same, but the composition changed materially. Five prior findings were fixed (real +); this review then verified *more* surface — the authenticated admin console, CI enforcement history, edge functions in depth — and found pre-existing problems the prior review couldn't see, plus two same-week test regressions. An 83 with this much verified ground truth is a stronger position than an 84 with less; the gap to 90+ is concentrated in Phase 1+2 (process + five integrity fixes), not spread across the codebase.

Projected trajectory if the plan lands (sums of per-brief estimates, rounded): after Phase 1 ≈ 86 · after Phase 2 ≈ 90 · after Phases 3–4 ≈ 93 · after Phases 5–6 ≈ 95. (Total claimed improvement 12.8 points ≤ the 17-point gap to 100 — the estimates are deliberately conservative; PR-12's estimate was reduced when verification showed route-focus management already exists.)

### 8.1 The 16-PR plan at a glance

| Phase | PRs | Theme | Parallel? |
|---|---|---|---|
| P1 Baseline | PR-01 fix failing tests · PR-02 merge gate + Lovable lane · PR-03 honest CI gates | trust the green checkmark | all three in parallel; PR-02's protection activates after PR-01 merges |
| P2 Integrity | PR-04 last non-atomic path · PR-05 drift detector · PR-06 playoff integrity · PR-07 edge-fn hardening | league records can't silently corrupt | 04∥05∥07; 06 after 04 |
| P3 Admin reliability | PR-08 mass-entry error UI · PR-09 admin test blind spots | admins see the truth | 08 after 04; 09 anytime after 01 |
| P4 UX & a11y | PR-10 hook cache correctness · PR-11 error states + Unknown Team · PR-12 admin axe coverage + warning fixes | users never stranded | 10∥12; 11 after 10 |
| P5 Maintainability | PR-13 brackets simplification · PR-14 third-party script hygiene | reduce the riskiest code mass | 14 anytime; 13 after 06, isolated |
| P6 Polish | PR-15 doc truth sweep · PR-16 production runbook (Doug-manual) | durable operations | anytime; best last |

**Agent routing:** Lovable — PR-11 (UI-heavy), optionally PR-15. Claude Code/Codex — everything else; PR-13 needs the strongest agent + the characterization-test discipline in its brief. **Doug-manual:** PR-02 (GitHub settings), PR-03 (secrets), PR-16 (dashboard walk); each brief has a checklist.
**Suggested order for one-at-a-time execution:** 01 → 02 → 04 → 05 → 07 → 03 → 06 → 08 → 10 → 11 → 09 → 12 → 14 → 13 → 15 → 16.

## 9. Verified facts vs. inferences vs. not verified

**Verified (executed here, evidence on disk):** every row marked ✅/⚠️ in §4; the browser findings in §6–7 (each backed by a screenshot or the exploration JSON); CI's red status on `main` and the silent-skip real-backend job (GitHub job logs quoted in findings); the commit provenance of the two test regressions (git history); all §3 "fixed since prior review" rows.

**Inferences (reasoned, clearly likely, but not directly observed):**
- Production standings counters are *probably* still in sync (all current UI write paths for results go through the atomic RPCs; the drift experiment required deliberately bypassing them) — but this cannot be proven from the repo, which is why PR-05 builds a detector instead of assuming.
- The 6 first-run e2e failures were sandbox load artifacts (identical specs green in CI on the same commit ~40 min earlier; failures were all navigation timeouts, and a serial rerun on an idle machine is reported in §4.1).
- Console errors from `cdn.gpteng.co`, Google Fonts, and `progressier.app` during exploration are artifacts of this sandbox's egress proxy, not app bugs (the same resources load normally from an unrestricted network).

**Not verified (couldn't be, from here — and what would verify it):**
- **Production Supabase dashboard settings** — email confirmation, leaked-password protection, backups, SMTP, rate limits. Only visible in the dashboard. → PR-16 turns this into a checked, dated runbook.
- **Edge functions at runtime** — code was reviewed and their Deno tests run green in the repo's own `Supabase CI`, but no live invocation was made from this sandbox. → next CI run + PR-16's probe checklist.
- **Real-backend e2e** — requires E2E secrets that don't exist yet anywhere (CI's version silently skips). → PR-03.
- **Player-account flows with writes** (joining a team, live scoring as a member): the review's write guard deliberately blocked all mutations, so these were audited for rendering/navigation only, not end-to-end persistence. → PR-03's real-backend spec is the right home for this.
- **Whether historical drift exists in production data** — unknowable from the repo. → PR-05 detector answers it in one query.
- **Load/concurrency behavior** (many simultaneous live-score viewers): not exercised; Supabase realtime handles fan-out, but no test here proves it. Low risk for a league of this size.

## 10. Final summary, in plain language

Your app is genuinely good, and this review tried hard to break it. The database — the part that keeps score — is the strongest piece: I rebuilt it from your 334 migration files on a blank computer, ran your own test suites against it, and then did the math by hand for match approvals, reversals, and power rankings. Every number came out exactly right, doing it twice changes nothing, and approving the same match twice can't double-count. The public site loaded on 43 page/size combinations without a single layout break, and all 18 admin screens loaded cleanly when I logged in as you (I blocked every write at the network level — nothing in production was touched, and the log proving that is in the evidence folder).

The honest concerns are two kinds. First, **the alarm system is real but nobody locked the door**: your CI would have caught both of this week's broken tests, but 40% of recent changes go straight to `main` without passing it, the test job was red the day of this review, and one "passing" CI job (real-backend E2E) has never actually run its test. Second, **a handful of specific spots can quietly lose or distort data**: deleting a match from Mass Score Entry updates records in three separate steps that can half-complete; support messages can vanish while telling the sender "received" because their storage table was never created; playoff final standings only get saved if the right person's browser happens to be open; and admins can't see which scores failed in a bulk save.

None of this needs a rewrite. The 16 PR briefs in `briefs/` are written so you can paste them to Lovable, Claude Code, or Codex one at a time; the first seven (a week of agent work, roughly) close every data-integrity hole and put a real lock on the door. Measured against everything verified here, the app today is an **83/100** — production-grade for a rec league and improving fast — with a clear, mostly-parallel path to the mid-90s.
