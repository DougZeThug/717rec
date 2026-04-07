

## Add stress test for `rematchRepairPass` O(N^2) performance

### What we're doing

Adding a performance stress test with a large team pool (40+ teams) and dense match history to measure how long the `rematchRepairPass` loop takes. This validates that the O(N^2) swap logic remains fast enough at realistic upper bounds.

### Changes

**File:** `src/utils/scheduling/__tests__/greedyBackToBackScheduler.test.ts`

Append a new `describe('Performance')` block at the end of the test suite:

- **Test: "rematchRepairPass handles 40 teams with dense history under 500ms"**
  - Create 40 teams across 3 tiers
  - Generate dense `historyPairs`: every team has played ~60% of other teams (creating ~460 history pairs)
  - Run `generateScheduleGreedyWithTracking` with this input
  - Assert `performance.now()` delta is under 500ms
  - Assert all 40 teams appear in matches (schedule completeness)
  - Log the timing and `diagnostics.rematchesRepaired` count for visibility

### Why this matters

The repair pass is O(N^2) per slot — with 20 matches per slot, that's up to 400 pair comparisons × 2 rearrangements each. Dense history forces many iterations of the inner loop. This test catches regressions if someone accidentally makes it O(N^3) or adds expensive operations inside.

### Scope

One file, one new test. No production code changes.

