## Root cause
The standings **All** view does its own sort: `b.powerScore - a.powerScore` in `src/components/stats/FullRankings.tsx`. That bypasses the shared comparator we already fixed, so when power scores tie, JavaScript falls back to original array order (which came from `useTeamRankings`, where win% beat division tier in some branches). Result: Smooth Sliders (higher win%) still ranks above Pepperoni Cheesers despite being in a lower division.

## Fix
1. In `src/components/stats/FullRankings.tsx`, replace the raw sort with the shared `sortRankings(rankings, 'powerScore', 'desc')` utility so the division tiebreaker applies.
2. In `src/utils/rankingUtils.ts` (`sortRankings`), reorder power-score tiebreakers so **division tier beats win%**: powerScore → division tier → win% → name.
3. In `src/hooks/useTeamRankings.ts`, apply the same priority in the inline comparator so the rankings array handed to the UI is already correct (division tier checked before win%).
4. In `src/components/stats/LeagueLeaderboardCarousel.tsx`, switch its top-3 sort to the shared `sortRankings` for consistency.

## Expected result
Pepperoni Cheesers (Competitive) ranks above Smooth Sliders (Intermediate) when both sit at 60.4 power score, in both the All view and the leaderboard carousel.

## Technical notes
- Files touched: `FullRankings.tsx`, `LeagueLeaderboardCarousel.tsx`, `rankingUtils.ts`, `useTeamRankings.ts`
- Add a unit test: two teams, equal powerScore, higher win% in lower division — expect higher-division team first.