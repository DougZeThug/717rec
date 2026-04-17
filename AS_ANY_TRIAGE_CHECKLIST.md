# `as any` Inventory + Triage (Phase: no behavior changes)

This file captures a **scope-safe triage** so the next phase only touches production code.

## Bucket A — Accepted for now (tests/mocks/docs)

These are intentionally ignored in this phase:

- `tests/repro_bracket_standings.test.ts` (2)
- `tests/bracketManagerSchema.test.ts` (3)
- `tests/bracketManagerPhase0.test.ts` (7)
- `src/hooks/__tests__/usePendingMatches.test.ts` (6)
- `src/hooks/matches/__tests__/matchDatabaseUtils.test.ts` (4)
- `src/hooks/matches/__tests__/useMatchSubmission.test.ts` (2)
- `src/hooks/team-stats/utils/__tests__/teamStats.test.ts` (4)
- `src/components/playoffs/form/__tests__/useBracketForm.test.ts` (3)
- `src/components/playoffs/form/bracket-teams/hooks/__tests__/useBracketFormData.test.ts` (7)
- `src/components/admin/batch-matches/auto-schedule/__tests__/TimeBlockTeamsList.test.tsx` (1)
- `FIX_ANY_TYPES_PLAN.md` (30, planning document)

## Bucket B — Production files in scope (fix now)

These are the targets for the next change phase:

- `src/components/playoffs/form/bracket-teams/hooks/useBracketFormData.ts` (13)
- `src/components/ui/charts/ChartLegend.tsx` (5)
- `src/components/ui/charts/utils/tooltipUtils.ts` (5)
- `src/services/brackets/viewer/SourceNodeCalculator.ts` (3)
- `src/utils/nativeAuth.ts` (3)
- `src/services/bracket-creator.ts` (2)
- `src/utils/badgeConfig.ts` (2)
- `src/components/playoffs/form/bracket-teams/components/BracketFormTeamsContainer.tsx` (1)
- `src/components/playoffs/form/bracket-teams/hooks/useOptimisticTeamMutations.ts` (1)
- `src/hooks/playoffs/usePlayoffEditMatch.ts` (1)
- `src/services/brackets/bracketFormatters.ts` (1)
- `src/services/brackets/manager/services/BracketCreationService.ts` (1)
- `src/services/teams/TeamSeedService.ts` (1)
- `src/utils/autoScheduleUtils.ts` (1)

## Short checklist (production targets only)

- [ ] Replace `as any` in `useBracketFormData.ts` with narrow interfaces/guards.
- [ ] Consolidate chart payload typing in `ChartLegend.tsx` + `tooltipUtils.ts`.
- [ ] Remove viewer casting gaps in `SourceNodeCalculator.ts` via explicit intermediate types.
- [ ] Type auth response parsing in `nativeAuth.ts` without `any`.
- [ ] Replace optional error casting in `bracket-creator.ts` with safe unknown narrowing.
- [ ] Replace metadata casts in `badgeConfig.ts` with typed metadata shapes.
- [ ] Clean one-off casts in remaining production files with the smallest possible local types.

## Inventory totals

- Production in scope: **14 files / 40 occurrences**
- Accepted/ignored for now: **11 files / 68 occurrences**
