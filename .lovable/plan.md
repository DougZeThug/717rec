

## Rework Clutch Stats: Wins + Win % in 2-1 Matches

### What Changes

**Current behavior**: "Clutch Record" shows W-L (e.g., "3W - 2L") in Game 3 matches on the current season StatBreakdown. No clutch stat exists in Career Statistics.

**New behavior**: 
- StatBreakdown shows **clutch wins count** and **clutch win percentage** (wins out of all 2-1 matches the team played in)
- Career Statistics (TeamTotals) gets a new **Career Clutch Win %** stat

### Files to Change

**1. `src/utils/teamDetailsUtils/matchOutcomeUtils.ts`**
- Rename/update `ClutchRecord` interface: keep `clutchWins`, `clutchLosses`, add `clutchWinPct: number` (calculated as `clutchWins / game3Matches * 100`, or 0 if no game-3 matches)
- The existing calculation logic stays the same -- it already correctly identifies 2-1 matches

**2. `src/components/teams/StatBreakdown.tsx`**
- Change props: replace `clutchWins` and `clutchLosses` with `clutchWins: number` and `clutchWinPct: number`
- Update the "Clutch Record" StatBlock display:
  - Main value: show win percentage (e.g., "60.0%")
  - Sub-label: show "X wins in Y game-3s" instead of "in Game 3s"

**3. `src/pages/TeamDetails.tsx`**
- Update the props passed to StatBreakdown: pass `clutchWins` and `clutchWinPct` (calculated from the existing `clutchRecord` object)

**4. `src/utils/career/types.ts`**
- Add to `TeamTotals`: `career_clutch_wins: number`, `career_clutch_game3s: number`, `career_clutch_win_pct: number`

**5. `src/utils/career/calculateClutchRate.ts`** (new file)
- Create a `calculateCareerClutchRate` function similar to `calculateSweepRate`
- Counts 2-1 wins and total game-3 matches (where total games = 3) across regular + playoff matches
- Returns `{ career_clutch_wins, career_clutch_game3s, career_clutch_win_pct }`

**6. `src/utils/career/index.ts`**
- Export the new `calculateCareerClutchRate`

**7. `src/hooks/career/useTeamTotalsComputed.ts`**
- Call `calculateCareerClutchRate` with the same match data used for sweep rate
- Spread results into the returned `TeamTotals`

**8. `src/components/teams/TeamTotals.tsx`**
- Add a "Career Clutch Win %" stat block (Swords icon, purple) showing:
  - Main value: clutch win percentage
  - Sub-label: "X wins / Y game-3s"
- Place it after Career Sweep Rate for logical grouping

