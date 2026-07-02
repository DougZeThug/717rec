# Plan: Tier 2 — Core app test coverage

Working branch: `claude/core-app-test-coverage-lo0bf0`

Goal: raise test coverage in four core-app areas, one commit per area.

## Steps

1. **Baseline** — run `npm run test:coverage` and record current numbers for
   the four target areas. (running in background)
2. **Area A: Mass score entry hooks** (`src/components/admin/mass-score-entry/hooks/`, ~46%)
   - Add tests for submission (`useMatchSubmission`, `useScoreSubmission` gaps),
     updates (`useMatchUpdates`), and game-wins (`game-wins/useGameWinsHandler`).
   - Cover 0%-covered files first.
3. **Area B: Standings/rankings** (`src/components/stats/**` ~23%, `src/utils/rankingUtils` 74% → 85%+)
   - Add tests for display components (RankingsTable, RankingTableRow,
     CompactStandings, FullRankings, etc.).
   - Fill gaps in `rankingUtils` sub-modules.
4. **Area C: Match hooks** (`src/hooks/matches/` ~47%)
   - Add hook-level tests for match completion and winner/loser handling
     (`useMatchScoresState`, `updates/*`, `utils/matchResultUtils`, etc.).
5. **Area D: Playoff viewer** (`src/components/playoffs/viewer/` ~25%)
   - Regression tests for the renderer layer (`useBracketsViewerRenderer`,
     `useBracketsViewerScript`), focused on late-round display issues.
6. **Verify** — re-run `npm run test:coverage`, confirm all four areas improved
   and global thresholds still pass.
7. **Commit per area, push, delete this plan file.**

## Conventions

- Unit tests live in `__tests__/` next to the source file.
- Mock Supabase via services layer; mock Radix pointer capture in setup.
- Use `npm run test:file -- <path>` for iteration.
