

## Toggleable Report Card: Season vs Career

### Overview
Add a toggle to the report card that lets users switch between current season grades (default) and career grades. The toggle will sit between the section header and the GPA display.

### Changes

**File 1: `src/hooks/useTeamReportCard.ts`**
- Add a `mode` parameter: `'season' | 'career'`
- When `mode === 'season'`: keep current logic (useTeamRankings + useTeamMatches)
- When `mode === 'career'`: use `useCareerRankings` instead
  - Overall: percentile of `careerPowerScore` across all career rankings
  - Offense: percentile of `career_sweep_rate` — requires pulling from `computeAllTeamsTotals` or adding sweep/clutch fields to `CareerRanking`
  - Clutch: use `career_clutch_win_pct` directly (already 0-100)
  - Schedule: percentile of `careerSos`
  - Consistency: percentile of `careerWinPercentage`
  - Trend: keep using weekly power score trends (applies to both modes)
- Both hooks are always called (React rules), but only the relevant data is used in the `useMemo`

**File 2: `src/types/career.ts`**
- Add to `CareerRanking`:
  - `careerSweepRate: number`
  - `careerClutchWinPct: number`
  - `careerClutchGame3s: number`

**File 3: `src/hooks/useCareerRankings.ts`**
- Pass the three new fields from `totals` when building each ranking entry:
  - `careerSweepRate: totals.career_sweep_rate`
  - `careerClutchWinPct: totals.career_clutch_win_pct`
  - `careerClutchGame3s: totals.career_clutch_game3s`

**File 4: `src/hooks/useCareerRankingsWithHidden.ts`**
- Same additions as File 3 for consistency

**File 5: `src/components/teams/TeamReportCard.tsx`**
- Add local state: `const [mode, setMode] = useState<'season' | 'career'>('season')`
- Pass `mode` to `useTeamReportCard(teamId, mode)`
- Add a small toggle (using existing `Tabs` or `ToggleGroup` component) between the section title area and the GPA display, with "Season" and "Career" options
- Update grade descriptions to reflect the active mode (e.g., "Career power score ranking" vs "Combined power score ranking")

