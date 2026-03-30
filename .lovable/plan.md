

## Fix: BYE Propagation Overwrites Existing Opponents in LB

### What's Happening (Plain Language)

When Birds of Prey advances via walkover in LB R1, the code calculates where to place them in LB R2. It uses simple math (`Math.ceil(1/2) = 1`, slot = opponent1) which puts them in LB R2 Match 1's opponent1 slot — **but 3 Amigos was already sitting there** (they dropped from WB). So 3 Amigos gets silently overwritten and vanishes.

The same bug caused Bag Babies to duplicate over Cuzzo's Clinic later — the `propagateCompletedMatches` normalization uses the same faulty logic and overwrites occupied slots.

### Root Cause

Two problems in both the BYE path and `propagateCompletedMatches`:

1. **Wrong match number for 1:1 LB rounds**: In double elimination, LB alternates between "minor" rounds (survivors play each other, halving the count) and "major" rounds (WB losers drop in, same match count). LB R1 → LB R2 is 1:1 (4 matches → 4 matches), so match 1 should map to match 1 directly — not `Math.ceil(1/2) = 1` (which happens to be correct for match 1 but wrong for match 2: `ceil(2/2) = 1` instead of 2).

2. **No occupied-slot check**: The code blindly writes to the calculated slot without checking if a different participant is already there. It should never overwrite an existing opponent.

### Fix

**File: `src/services/brackets/manager/services/BracketUpdateService.ts`** — BYE path (lines 95-143)

Replace the static `Math.ceil(n/2)` + odd/even slot logic with:
1. Count matches in current round vs next round to determine mapping (1:1 or 2:1)
2. If 1:1: `nextMatchNumber = currentMatch.number`, find the empty slot
3. If 2:1: `nextMatchNumber = Math.ceil(n/2)`, standard slot logic
4. **Critical guard**: before writing, check if the target slot already has a different participant. If so, use the other slot. If both occupied, skip (don't overwrite).

**File: `src/services/brackets/manager/services/BracketNormalizationService.ts`** — `propagateCompletedMatches` (lines 340-376)

Same fix:
1. Count matches in current vs next round for correct mapping
2. Add occupied-slot guard: if calculated slot has a different participant, try the other slot. If both full, skip.

### Technical Detail

```text
LB Round Structure (16-team double elim):
  LB R1: 4 matches  ──1:1──▶  LB R2: 4 matches (WB R2 losers drop in)
  LB R2: 4 matches  ──2:1──▶  LB R3: 2 matches (internal LB)
  LB R3: 2 matches  ──1:1──▶  LB R4: 2 matches (WB R3 losers drop in)
  LB R4: 2 matches  ──2:1──▶  LB R5: 1 match   (internal LB)
  ...

Mapping logic:
  if nextRoundMatchCount == currentRoundMatchCount:
    nextMatchNumber = match.number  (1:1)
  else:
    nextMatchNumber = ceil(match.number / 2)  (2:1)

Slot logic:
  // Find whichever slot is empty in the target match
  // NEVER overwrite an existing participant
```

### Changes Summary

| File | Change |
|------|--------|
| `BracketUpdateService.ts` | BYE path: smart match-number calc + never-overwrite guard (~15 lines changed) |
| `BracketNormalizationService.ts` | `propagateCompletedMatches`: same smart calc + guard (~15 lines changed) |

Two files, ~30 lines changed. No new files, no migrations.

