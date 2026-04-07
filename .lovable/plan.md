

## Fix: Forward `rematchAllowedFor` to swap repair pass

### What's wrong

`generateSlotPairings` builds up `slotRematchAllowed` during the greedy loop, granting specific teams permission to take season rematches. But when it calls `trySwapToFixUnmatched` (line 306), it doesn't pass this set. The swap function's 7 `canPlay` calls (lines 40, 84, 85, 140, 141) all omit the `rematchAllowedFor` parameter, so teams that were granted rematch permission get rejected during swap repair.

### Fix

**File:** `src/utils/scheduling/greedy/slotPairing.ts`

1. Add `rematchAllowedFor` parameter to `trySwapToFixUnmatched` signature (after `relaxationLevel`)
2. Forward it to all 5 `canPlay` calls inside the function (lines 40, 84, 85, 140, 141)
3. Pass `slotRematchAllowed` when calling `trySwapToFixUnmatched` at line 306

### Scope

One file, parameter threading only. No logic changes.

