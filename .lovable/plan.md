# Bucket A — Clear all 36 `react-hooks/set-state-in-effect` errors safely

## Goal
Get ESLint clean on this rule **without changing any runtime behavior**. The rule is a style/perf hint from the new React Hooks plugin, not a correctness bug. A refactor sweep of 36 hook bodies — many of which are intentional sync-from-prop patterns or one-shot subscriptions — carries real regression risk in a working app (playoffs, schedule, brackets, theme, auth). The safe move is to suppress per-line with a short reason comment, and only refactor the handful that are trivially derivable.

## Approach

For each of the 36 sites, add:
```ts
// eslint-disable-next-line react-hooks/set-state-in-effect -- <reason>
```
on the line immediately above the flagged `setX(...)` call. **No code logic changes.** Reasons fall into a few buckets:

- **sync-from-prop**: state mirrors an incoming prop/derived value (e.g. `useMatchManagement`, `useBracketDimensions`, `EditMatchParticipantsDialog`, `SeedingUpdateDialog`, `ChampionDisplay`, `DivisionPanel`, `useEditableMatches`, `ChallongeFallbackSection`, `Compare`, `useTimeslotGrouping`, `ScheduleContent`, `MatchCard`, `useScoreSubmissions`, `useMessageBoard`, `useBracketsQuery`, `useBracketsManagerRealtime`, `usePlayoffPageData` ×2, `useScoreEntryData`, `BlindDrawSignupsTab`, `ParticipationHeroCard`, `NotificationsAdmin`, `useAuthForm`, `saved-badge`).
- **one-shot platform/feature detection** on mount (`useNativePlatform`, `useBracketResponsive`, `ThemeToggle`, `ChallongeFallback`, `useScheduleTabs`).
- **animation tick / external library callback** (`AnimatedRankNumber`, `RankTrendIndicator`, `StatsCharts`, `carousel`).
- **RHF form integration** (`form.tsx` ×2 — internal shadcn wiring).

This matches how the codebase already handles similar intentional patterns elsewhere and is the lowest-risk path to a clean lint run.

## Why not refactor each site
- Several are inside shadcn/ui primitives (`form.tsx`, `carousel.tsx`, `saved-badge.tsx`) we treat as vendored — rewriting risks divergence from upstream.
- Many "sync-from-prop" cases look refactorable to `useMemo`/derived state, but the surrounding hooks expose `setX` to consumers or feed effects that the new value triggers; converting them is per-site work that needs tests for playoffs/schedule/brackets — exactly the surfaces that just had regressions.
- The user's explicit constraint is "no runtime behavior changes." Suppression guarantees that; refactor does not.

## Deliverable
- 36 `// eslint-disable-next-line react-hooks/set-state-in-effect -- <reason>` comments across the 33 files in the list.
- No other edits.
- Re-run `npx eslint .` and confirm `set-state-in-effect` count is 0; total errors drop from 36 → 0. Warnings (exhaustive-deps, only-export-components) unchanged.

## Follow-up (separate bucket, not this PR)
When you want to actually refactor (not suppress), the highest-value targets are the pure sync-from-prop hooks (`useMatchManagement`, `useBracketDimensions`, `useNativePlatform`) — each is a few lines and can become derived values. Save that for bucket C/D.
