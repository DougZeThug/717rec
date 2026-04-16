

## Plan: Add Rematch Repair After Cross-Slot Swap

### The problem

In `scheduleEven.ts`, after a successful cross-slot swap, `rematchRepairPass` is never called on the new S1/S2 matches. Every other code path (initial generation, relaxation retries) calls it. This is an oversight — swap results can contain avoidable season rematches.

### The fix

**1 file** — `src/utils/scheduling/greedy/scheduleEven.ts`

Add two `rematchRepairPass` calls after rebuilding `tonightPairs`/`newPairs`/`teamMatchCounts` from the cross-slot swap result, before setting `allMatches`:

```typescript
diagnostics.rematchesRepaired += rematchRepairPass(
  s1Matches, slot1, sortedTeams, playedSet, tonightPairs, newPairs, maxTierGap
);
diagnostics.rematchesRepaired += rematchRepairPass(
  s2Matches, slot2, sortedTeams, playedSet, tonightPairs, newPairs, maxTierGap
);
```

This goes right before the existing `allMatches = [...s1Matches, ...s2Matches];` line inside the `if (crossSlotResult)` block (~line 99).

### What changes

- **1 file** — add 2 function calls, 0 new imports needed (`rematchRepairPass` is already imported)
- **0 migrations, 0 other files**

