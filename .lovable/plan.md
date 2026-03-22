

## Add GPA Leaderboard to Report Card

### Overview
Add a button on the team report card that opens a scrollable list of all teams' report cards, ranked by GPA (highest to lowest). The list respects the Season/Career toggle.

### Changes

**1. New hook: `src/hooks/useAllTeamReportCards.ts`**
- Reuses the same data sources as `useTeamReportCard` (`useTeamRankings`, `useCareerRankings`, match data)
- Computes grades + GPA for every team in a single `useMemo` pass
- For season mode: iterates all rankings, computes each team's grades using the same percentile logic
- For career mode: iterates all career rankings similarly
- Returns `{ leaderboard: Array<{ teamId, teamName, logoUrl, gpa, overallGrade }>, isLoading }`
- Note: season mode clutch/offense grades require per-team match data which is expensive. Simplify by using estimated values (same approximation already used for sweep rates in `useTeamReportCard`) or compute clutch as neutral (50th) when individual match data isn't available. The GPA will be approximate but directionally correct.

**2. New component: `src/components/teams/ReportCardLeaderboard.tsx`**
- A Dialog/Sheet triggered by a "View All GPAs" button
- Contains its own Season/Career toggle (synced with parent mode)
- Scrollable list showing: rank, team logo, team name, GPA (colored), overall letter grade
- Current team highlighted with a subtle background
- Each row is compact: `flex items-center gap-3` with rank number, logo (24px), name, and right-aligned GPA

**3. Update `src/components/teams/TeamReportCard.tsx`**
- Add a "View All GPAs" button below the GPA display (or next to it)
- Pass current `mode` and `teamId` to the leaderboard component
- Button styled as a small outline/ghost button with a ListOrdered icon

### Technical Details

- Season mode GPA calculation for all teams: for categories that need match-level data (clutch, offense), use the same estimation approach already in `useTeamReportCard` (approximate sweep rate from game win %, clutch defaults to 50th percentile)
- Career mode: all data is already available in `useCareerRankings` (sweep rate, clutch win pct, SOS, etc.)
- The leaderboard dialog uses `ScrollArea` for the scrollable list (max height ~400px)
- No new database queries needed -- reuses existing hooks

