

## Fix: Forward `rematchAllowedFor` to `tryCrossSlotSwap`

### Problem

`tryCrossSlotSwap` doesn't accept or forward the `rematchAllowedFor` parameter, so its `canPlay()` calls and `generateSlotPairings()` call always treat rematches as forbidden — even when a team has per-team rematch permission. This causes valid swaps to be rejected, forcing unnecessary broader relaxation.

### Changes

**`src/utils/scheduling/greedy/swapRepair.ts`**

1. Add `rematchAllowedFor?: Set<string>` parameter to `tryCrossSlotSwap` signature (after `relaxationLevel`)
2. Forward it to both `canPlay()` calls (lines 75–76)
3. Forward it to the `generateSlotPairings()` call (after `relaxationLevel`, line 101)

**`src/utils/scheduling/greedy/scheduleEven.ts`**

4. Pass `perTeamRematchAllowed` to the `tryCrossSlotSwap()` call (line 102–112)

### Scope

2 files, parameter threading only. No logic changes.

