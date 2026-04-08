## Fix: Reduce Complexity & Template Literal in TeamSeasonStatsService

### Problem
1. `fetchSeasonBreakdown` has cyclomatic complexity of 28 (very-high risk)
2. Line 353: template string used where a regular string suffices

### Changes

**File: `src/services/TeamSeasonStatsService.ts`**

**Fix 1 — Template literal (line 353):**
Change `` errorLog(`Update verification failed for team_season_stats:`, ... `` to `errorLog('Update verification failed for team_season_stats:', ...`

**Fix 2 — Extract helpers to reduce complexity:**

Extract 4 inline blocks into helper functions (in the same file, above `fetchSeasonBreakdown`):

1. **`buildTeamDivisionMap(stats)`** — lines 165–172 (build Map from allTeamSeasonStats)
2. **`buildBracketInfoMap(bracketIds)`** — lines 179–199 (fetch brackets, build map)
3. **`groupMatchesBySeason(allMatches, playoffMatches)`** — lines 208–226 (group into Maps)
4. **`buildSeasonBreakdown(stat, teamId, matchesBySeason, playoffMatchesBySeason, teamDivisionMap)`** — lines 229–273 (the `.map()` callback)

Each extraction removes 3–6 branch points from the main function, bringing complexity well under 20.

### Scope
1 file. Logic-preserving refactor only — no behavior changes.