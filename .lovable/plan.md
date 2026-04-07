

## Add Unit Tests for Scheduling Subsystems

### What we're adding

Three new test files targeting untested scheduling modules, plus one edge case in the existing test file.

### Test Plan

**1. `src/utils/scheduling/greedy/__tests__/constraints.test.ts`** — Unit tests for `constraints.ts`

- **getTier**: Competitive→1, Intermediate→2, Recreational→3, "Tier 2"→2, unknown→2
- **tierDistance**: same tier=0, adjacent=1, extreme=2
- **canPlay at level 0**: blocks session rematches, blocks tier gap > maxTierGap, blocks season rematches
- **canPlay at level 1**: allows cross-tier, still blocks season rematches
- **canPlay at level 2**: allows season rematches
- **canPlay at level 3**: allows everything except session rematches
- **canPlay with rematchAllowedFor**: allows season rematch for granted team at level 0, still blocks session rematches
- **countValidOpponents**: correct count with exclusions and constraints

**2. `src/utils/scheduling/greedy/__tests__/rematchRepair.test.ts`** — Unit tests for `rematchRepairPass`

- Swaps a rematch pair when a valid 2-swap exists, returns repaired count = 1
- Leaves matches unchanged when no rematch exists (returns 0)
- Does not swap if replacement would violate session constraint (tonightPairs)
- Does not swap if replacement would violate tier gap
- Correctly updates tonightPairs and newPairs sets after swap

**3. `src/utils/scheduling/greedy/__tests__/feasibility.test.ts`** — Unit tests for `analyzeGreedyFeasibility`

- Returns feasible when all teams have ≥2 valid opponents
- Recommends level 1 when tier relaxation would help
- Recommends level 2 when only rematch relaxation helps
- **Edge case: returns level 3 when no valid pairings exist even at level 2** (e.g., 3 teams where all pairs are in tonightPairs — impossible even fully relaxed)

**4. Existing test file addition** — `greedyBackToBackScheduler.test.ts`

- Add a regression test in the odd-team section verifying every team gets exactly 2 matches with 5 teams (small odd count). This complements the existing 9-team odd test.

### File structure

```
src/utils/scheduling/greedy/__tests__/
  constraints.test.ts     (new)
  rematchRepair.test.ts   (new)
  feasibility.test.ts     (new)
```

### Scope

3 new test files + 1 test added to existing file. No production code changes.

