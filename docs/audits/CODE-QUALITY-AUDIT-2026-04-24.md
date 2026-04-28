# 717rec Code-Quality Audit — 2026-04-24

> Fresh audit following the 2026-03-02 `AUDIT-PLAN.md`. Scope: `src/` (1,370 TS/TSX files).
> Method: architecture-rule checks from `CLAUDE.md` plus standard smell scans (size, duplication, types, console/TODO, tests).

---

## TL;DR

Grade: **B+**, trending up. The last audit's biggest items have been fixed. Remaining work is size-driven (a handful of files need splitting) plus a long tail of typing and test-coverage gaps.

### Resolved since 2026-03-02
| Item | Then | Now |
| --- | --- | --- |
| `select('*')` in queries | 30 files | **0** |
| Duplicate error modules (`utils/errors.ts`, `utils/errorHandling.ts`) | 4 files | deleted; single canonical system |
| Components importing `supabase` client directly | 32 | **0** (10 remaining imports are all allowed exceptions — realtime channels, mocks, `imageUpload.ts`) |
| `EventHeroCard.tsx` | 508 lines | **262** (+ new `HeroCard.tsx`/`StandardHeroCard.tsx` base) |
| `.innerHTML` usage | 1 | 0 |
| Test files | 47 (~5% ratio) | **202** (~15%) |
| `TODO`/`FIXME`/`HACK` | 0 | 0 |
| `@ts-ignore`/`@ts-expect-error`/`eslint-disable` | 0 | 2 (still excellent) |

### New or unchanged problems
- 4 service files still exceed the 400-line rule.
- 5 components still exceed 400 lines (only partial overlap with the March list).
- `any` count went **up** from 130 → 203 (mostly in tests; a few real-code hotspots).
- `.env` is committed to git (see §7 — this is public VITE_ keys, not a secret leak, but still non-standard).

---

## 1. Architecture-rule compliance

### 1.1 Direct Supabase imports in components/hooks
**Status: compliant.** Every remaining `@/integrations/supabase/client` import outside `src/services/` falls under an allowed exception (realtime `.channel()` in `src/hooks/matches/useMatchComments.ts`, `useMatchReactions.ts`, `useMessageReactions.ts`, `useMessageRealtime.ts`, `src/hooks/brackets/useBracketsManagerRealtime.ts`, plus `src/utils/imageUpload.ts` and test mocks).

### 1.2 Service files over 400 lines (should be split)
| File | Lines |
| --- | ---: |
| `src/services/brackets/manager/services/BracketAdminService.ts` | 503 |
| `src/services/TeamSeasonStatsService.ts` | 465 |
| `src/services/brackets/manager/SupabaseSqlStorage.ts` | 445 |

Also worth calling out (not a service, but over 500 lines): `src/utils/predictions/predictMatch.ts` — 570 lines. Cohesive algorithm, so splitting is lower priority.

### 1.3 Error-handling conventions
**Status: compliant.** Spot-checked `SeasonService`, `HeadToHeadService`, and several brackets services — every `if (error)` branch routes through `handleDatabaseError()` and every single-row fetch uses `ensureFound()`. No services return `{ error: ... }` or swallow errors as `null` anymore.

---

## 2. Query smells

- `select('*')`: **0 occurrences** (verified with grep).
- `.single()` without `ensureFound`: no offenders found.

---

## 3. Type safety

- `: any` / `as any` / `<any>` occurrences: **203** across the codebase (up from 130).
  - Roughly half are in test files (mocks) — low risk.
  - Real-code hotspots worth triaging:
    - `src/components/playoffs/form/bracket-teams/hooks/useBracketFormData.ts` — 14
    - `src/services/BadgeProcessingService.ts` — 10
    - `src/types/brackets-viewer.d.ts` — 8 (external-lib type bridge, likely unavoidable)
    - `src/components/ui/charts/utils/tooltipUtils.ts` — 6
    - `src/components/ui/charts/ChartLegend.tsx` — 6
    - `src/components/stats/career/AllTeamsCareerPowerScoreChart.tsx` — 6
- `as unknown as` double casts: **47**, concentrated in `src/services/brackets/viewer/BracketsViewerAdapter.ts` (6) and `SupabaseSqlStorage.ts` (2). Rest are in tests.
- `@ts-ignore` / `@ts-expect-error` / `eslint-disable`: **2** (still essentially zero).
- Non-null assertions (`x!`): **11**. Acceptable volume.

---

## 4. Component size

Components over 400 lines (`src/components/**` and `src/pages/**`):

| File | Lines |
| --- | ---: |
| `src/components/history/SeasonAccordion.tsx` | 511 |
| `src/components/teams/TeamAdvancedStatsSection.tsx` | 508 |
| `src/components/schedule/TimeslotGrouping.tsx` | 490 |
| `src/components/home/WeeklyRecapCard.tsx` | 433 |
| `src/components/admin/teams/TeamManagementTab.tsx` | 406 |

Playoff editors from the March audit (`BracketsManagerMatchEditor`, `BracketsViewerComponent`) are no longer on the list — either split or trimmed.

---

## 5. Duplication & dead code

- Hero-card duplication: partially resolved. `HeroCard.tsx` (36 lines) and `StandardHeroCard.tsx` (101 lines) now exist as shared primitives. `RequestHeroCard` (357), `ChampionsHeroCard` (358), and `ParticipationHeroCard` (253) could still be reworked on top of these bases.
- No `.bak`/`.old`/`.tmp` files.
- No `TODO`/`FIXME`/`HACK`/`XXX` comments.
- **Planning-doc sprawl at repo root** (11 files): `AUDIT-PLAN.md`, `AS_ANY_TRIAGE_CHECKLIST.md`, `FIX_ANY_TYPES_PLAN.md`, `PLAN.md`, `PLAN-bracket-byes-fix.md`, `cleanup-plan.md`, `mobile-ux-plan.md`, `MOBILE-UI-AUDIT.md`, `SCHEDULER_README.md`, `REAL_POWERSCORE_BREAKDOWN.md`, `ARCHITECTURE.md`. Several look stale; CLAUDE.md itself says "create a plan file, execute it, then delete the plan file when done."

---

## 6. React / logging smells

- `useEffect(..., [])` containing direct Supabase calls: **none found**.
- `console.*` outside `src/utils/logger.ts` and `src/config/`, excluding JSDoc examples:
  - `src/integrations/supabase/client.ts:10` — `console.error` (pre-logger bootstrap, probably intentional)
  - `src/styles/bracket-styles.ts:22` — `console.error('Failed to load bracket styles:', error);` (should use `errorLog`)
  - `src/utils/sentry.ts` and `src/utils/analytics.ts` — expected (these *are* the observability layer)
  - `src/utils/performance.ts:7` — inside a JSDoc usage example, not a real call
  - Note: the sub-agent's finding that `BracketManagerService.ts` has 4 `console.*` calls is **incorrect** — those are all inside JSDoc comment blocks (lines 255, 257, 301, 306).
- No `innerHTML` assignments.

---

## 7. Misc

- `.env` is committed (`VITE_SUPABASE_*` keys). These are public browser-side keys, so not a secret leak, but `.env` is not in `.gitignore` (verified: `grep '^.env' .gitignore` returns nothing). Standard practice is to track only `.env.example`. Rotating the anon key would require a Supabase project change, so flag, don't block.
- `README.md`, `CONTRIBUTING.md`, `CLAUDE.md` all present and current (CLAUDE.md updated 2026-03-23).

---

## 8. Testing

- Test files: **202** in `__tests__/` (3–4× the March baseline).
- Services with co-located tests: **~38 of ~93** (~41%).
- Notable untested services: `ProfileService`, `ContactService`, several `Team*` write-path services.

---

## Prioritized action list

### P1 — Architecture / rule violations
1. Split `BracketAdminService.ts` (503), `TeamSeasonStatsService.ts` (465), and `SupabaseSqlStorage.ts` (445) into sub-services per the 400-line rule.
2. Split the five oversized components listed in §4. `SeasonAccordion` and `TeamAdvancedStatsSection` first — they're the largest and most user-facing.
3. Replace the one real-code `console.error` in `src/styles/bracket-styles.ts:22` with `errorLog()` from `@/utils/logger`.

### P2 — Typing hotspots
4. Replace `any` in `useBracketFormData.ts` (14) and `BadgeProcessingService.ts` (10) with real types.
5. Audit the 6 `as unknown as` casts in `BracketsViewerAdapter.ts` — either add a real type declaration for the external lib or narrow the casts.

### P3 — Test coverage
6. Add `__tests__/` for `ProfileService` and `ContactService`.
7. Extend coverage on the remaining `Team*` write services.

### P4 — Cleanup
8. Remove `.env` from the git tree (keep `.env.example`) and add `.env` to `.gitignore`. Coordinate with whoever owns the Supabase project before rotating keys.
9. Archive or delete the stale planning docs at the repo root (§5). Keep `ARCHITECTURE.md`, `README.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `TESTING.md`, `SCHEDULER_README.md`.
10. Continue reducing `any` toward the March target (<100); focus on production code, accept test-file mocks.

---

*What NOT to change*: routing in `App.tsx`, `main.tsx` bootstrap, real-time channel subscription pattern in hooks, QueryClient config, error-handler utilities — all verified clean.
