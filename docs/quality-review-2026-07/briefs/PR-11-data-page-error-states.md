# PR-11 — Error & empty states for data pages; fix the admin timeslot "Unknown Team" display

> **Resolution status:** Open — UI error-state remediation brief; not part of PR-15 docs-only scope.

**Phase:** 4 (UX) · **Tier:** 2 · **Agent:** Lovable or Claude Code (UI-heavy, low risk — good Lovable candidate) · **Parallelizable:** yes · **Depends on:** PR-10 (hooks must surface errors first for §5.1) · **Expected score impact:** +0.7 overall (UX +4, UI +1)

## 1. Background

- When a data query fails, the public data pages (Stats/Standings, Compare, Insights, team detail sections) leave users on **indefinite skeletons** — no message, no retry. Verified in this review's sandbox: with the backend unreachable, /stats rendered only the shell (195 chars of nav/footer) with skeletons that never resolve or explain. (First flagged in the 2026-07-13 review; unchanged.)
- The admin Timeslots section shows "**Unknown Team**" for every assigned timeslot (screenshot `evidence/screenshots/admin-section-timeslots.png`, captured with live production data on 2026-07-15): timeslot rows aren't resolving team names — either the client-side join misses, or the team lookup excludes teams (e.g. the `is_team_opted_out_active` filter on the public `teams` SELECT policy also applies to admin reads through the same cached query). Diagnose then fix.
- Home page fires a `406` console error on every load — `.single()` used where zero rows is legitimate (e.g. `WeeklyRecapService.ts:55`); should be `.maybeSingle()`.
- `/schedule` at desktop logged a React "Maximum update depth exceeded" warning during the walk-through — a setState loop in a schedule component that needs diagnosis (evidence: `exploration-results-anon.json`, route `/schedule`, desktop-1440).

## 2. Objective

Every data page distinguishes loading / error / empty; failures offer a one-click retry; the timeslot table names teams correctly; console is warning-free on the walked routes.

## 3. Exact scope

Shared error-state component + adoption on the affected pages; timeslot name-resolution fix; two console-hygiene fixes.

## 4. Files to modify / create

- `src/components/ui/error-display.tsx` — **reuse/extend this existing component** (it already implements icon + message + retry and is used by e.g. `TeamList.tsx`); do NOT introduce a parallel abstraction. Add an `EmptyState` variant beside it if none exists.
- Stats/Standings, Compare, Insights page components (adopt error/empty states)
- `src/components/timeslots/TimeslotList.tsx` — **this is the renderer that actually prints "Unknown Team"**: it resolves names from its `teams` prop even though the timeslot query already carries a joined team (its own test at `__tests__/TimeslotList.test.tsx:53` documents the fallback). Include `TimeslotsTab` and the team-query inputs feeding that prop; fixing only the query/service would leave the table unchanged.
- `src/services/WeeklyRecapService.ts` (+ any other `.single()`-on-optional: grep `\.single()` and audit each)
- The offending schedule component (diagnose via the warning's component stack in dev)

## 5. Implementation steps

1. Audit `ErrorDisplay` (`src/components/ui/error-display.tsx`) against the needs of the target pages (retry callback, compact/full variants, theme) and extend it rather than building a new component; add a reusable `EmptyState` ("No stats yet this season") if no existing empty-state primitive fits. One shared primitive keeps retry labels, focus behavior, and styling consistent.
2. Adopt on the pages above: `isLoading` → skeleton (exists), `isError` → ErrorDisplay, empty data → EmptyState. (PR-10 makes hooks expose `error`/`refetch` where they didn't.) **Also handle the request-that-never-settles case** — the verified failure mode in this review's sandbox kept pages in `isLoading` forever, which no `isError` branch can catch: give the shared query client a bounded request timeout (e.g. an `AbortSignal.timeout(15_000)` passed through the service layer's fetch, or TanStack retry+timeout config) so a hung request becomes an error and the retry UI is actually reachable.
3. Timeslots: reproduce with production-shaped data (a timeslot referencing a real team) and fix the resolution path; if the opt-out filter is the cause, fetch names for admin via an admin-scoped query instead of the public list.
4. Swap `.single()` → `.maybeSingle()` where absence is legitimate (audit every `.single()` — keep it where absence IS an error).
5. Fix the /schedule setState loop (trace the "Maximum update depth" stack; likely an effect missing a guard).
6. Component tests: each adopted page renders error state + retry refetches; timeslot rows show team names.

## 6. Database requirements

None expected; if the timeslot fix needs an admin read policy tweak, do it as a minimal additive policy migration.

## 7. UI/UX requirements

- Messages in league language ("Couldn't load standings. Check your connection and retry."), consistent styling with the existing card system, dark/light theme both.
- Retry must not full-reload the page.

## 8. Testing requirements

Component tests per page state; snapshot-free (assert text/roles, not markup).

## 9. Validation commands

```bash
npm run test:file -- src/components/common/__tests__/QueryErrorState.test.tsx
npm run typecheck && npm run lint && npm run test:coverage && npm run build && npm run e2e
```

## 10. Manual verification checklist (Doug)

- [ ] DevTools → Network → Offline, open /stats → friendly error + Retry (turn network on, click Retry → data loads).
- [ ] Admin → Timeslots shows real team names for tonight's slots.
- [ ] Browser console clean on /, /stats, /schedule.

## 11. Acceptance criteria

- No page can strand a user on skeletons after a failed query.
- Zero console errors/warnings on the 14 public routes (excluding third-party, which PR-14 removes).

## 12. Non-goals / rollback

- Non-goals: offline/PWA caching strategy, redesigning skeletons, the fetchPriority fix (PR-12).
- Rollback: component-level; each page adoption is a separate commit.
