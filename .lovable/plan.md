

# Plan: Improve Complex Function Documentation

## Overview
Add comprehensive JSDoc documentation to complex algorithms across the codebase to improve maintainability and onboarding for new developers.

## Files to Update

### 1. `src/utils/autoSchedule/qualityAnalysis.ts`

**Functions needing enhanced documentation:**

- **`analyzeCrossBlockDiversity()`** (lines 96-159)
  - Add explanation that this measures opponent variety across time blocks in dual-block schedules
  - Document that 717REC uses time blocks (Early/Mid/Late) and this ensures teams don't face the same opponents in different time blocks
  - Explain the algorithm: tracks opponents per team per block, checks for overlap between blocks, returns percentage of teams with fully unique opponents

- **`calculateComprehensiveQualityMetrics()`** (lines 227-303)
  - Add file-level JSDoc explaining this is the main quality scoring system for auto-scheduler
  - Document each metric category: opponent diversity, power score balance, block analysis, performance metrics
  - Add `@returns` documentation explaining the `MatchQualityMetrics` interface structure

- **`analyzeOpponentDiversity()`** and **`analyzePowerScoreBalance()`** - Minor enhancements to existing docs

### 2. `src/services/brackets/manager/services/BracketNormalizationService.ts`

**Functions needing enhanced documentation:**

- **`normalizeLosersR1()`** (lines 136-234)
  - Add detailed JSDoc explaining the double-elimination bracket context
  - Document the specific bug this fixes: brackets-manager can create duplicate participant issues in LB R1 when losers from WB R1 are placed
  - Explain the normalization steps: detect duplicates, clear invalid opponent2, shift misplaced participants
  - Add `@example` showing before/after bracket state

- **`normalizeGrandFinalPopulation()`** (lines 61-134)
  - Document the timing issue this addresses: LB Final winner may not propagate to Grand Final due to race conditions
  - Explain brackets-manager's group structure (group 1=WB, group 2=LB, group 3=GF)
  - Add context about when this is called (after score submissions)

### 3. `src/utils/powerScore/` directory

**Add file-level and function-level documentation:**

- **`normalizePowerScore.ts`** - Already has good documentation, minor enhancement to add formula reference

- **Create new `README.md`** in the powerScore directory explaining:
  - Power Score calculation overview (stored 0-1 in DB, displayed 0-100 in UI)
  - Data sources: `v_team_details` (0-100), `team_season_stats` (0-1)
  - Relationship between win percentage, game win percentage, and SOS
  - Reference to the database `update_team_stats` RPC function where actual calculation happens

- **`getTrendingTeams.ts`** - Add `@example` usage

## Technical Details

### Documentation Standards
All JSDoc blocks will follow these patterns:

```text
/**
 * Brief description of the function.
 * 
 * ## Algorithm Overview
 * Multi-line explanation for complex algorithms
 * 
 * @param paramName - Description with type context
 * @returns Description of return value and structure
 * 
 * @example
 * // Usage example
 * const result = functionName(params);
 * 
 * @see RelatedFunction - Cross-reference to related code
 */
```

### Estimated Changes
| File | Lines Changed | Priority |
|------|---------------|----------|
| `qualityAnalysis.ts` | ~60 lines added | High |
| `BracketNormalizationService.ts` | ~50 lines added | High |
| `powerScore/README.md` | New file (~40 lines) | Medium |
| `normalizePowerScore.ts` | ~10 lines enhanced | Low |
| `getTrendingTeams.ts` | ~8 lines enhanced | Low |

**Total: 5 files, ~170 lines of documentation**

