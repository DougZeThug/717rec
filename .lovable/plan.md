

## Fix: Prevent upstream match identification and selective slot clearing in BracketAdminService

### Problem

Two confirmed bugs in `checkDownstreamPopulation` and the downstream clearing logic:

1. **No directionality check**: The method finds all matches containing the winner participant ID across the entire stage, including earlier-round matches where the participant previously played. This causes false "downstream populated" blocks and, when force-cleared, destroys completed earlier-round results.

2. **Both slots wiped**: When clearing a downstream match, both opponent slots (and all scores/results) are nullified, even though only one slot was fed by the reopened match. The other opponent came from a different match path and should be preserved.

### Plan

**File: `src/services/brackets/manager/services/BracketAdminService.ts`**

#### 1. Fix `checkDownstreamPopulation` to only find later-round matches

- Fetch the current match's `round_id`, then fetch the round to get its `number` and `group_id`
- Filter candidate matches to only those whose round number is strictly greater than the current match's round number (within the same group, since losers/winners are separate groups)
- This ensures only true downstream (later-round) matches are identified

```
// Current (buggy):
const populated = allMatches.filter(
  (m) => m.id !== matchId &&
    (m.opponent1?.id === winnerParticipantId || m.opponent2?.id === winnerParticipantId)
);

// Fixed:
// Get current round info for ordering
const currentRound = await this.storage.select('round', currentMatch.round_id);
if (!currentRound) return { hasDownstream: false, downstreamMatches: [] };

const populated = allMatches.filter((m) => {
  if (m.id === matchId) return false;
  const hasParticipant =
    m.opponent1?.id === winnerParticipantId ||
    m.opponent2?.id === winnerParticipantId;
  if (!hasParticipant) return false;
  // Only consider matches in later rounds (same group or cross-group feeding)
  // Round numbers increase as the tournament progresses
  return m.round_id !== currentMatch.round_id; // At minimum exclude same round
});

// Better: resolve each candidate's round number and compare
```

The most robust approach is to fetch all rounds for the stage, build a round-number lookup, and filter to matches whose round number is strictly greater than the current match's round number.

#### 2. Fix clearing logic to only null the fed slot

Instead of wiping both opponents, identify which slot (`opponent1` or `opponent2`) contains the `winnerParticipantId` and only clear that slot:

```
// Current (buggy):
.update({
  opponent1_id: null,
  opponent2_id: null,
  ...all results/scores null...
  status: 1,
})

// Fixed:
for (const downstreamMatch of downstream.downstreamMatches) {
  const updatePayload: Record<string, any> = {
    status: 1,
    opponent1_result: null,
    opponent2_result: null,
    opponent1_score: null,
    opponent2_score: null,
  };

  // Only null the slot that was fed by the reopened match
  if (downstreamMatch.opponent1?.id === winnerParticipantId) {
    updatePayload.opponent1_id = null;
  } else if (downstreamMatch.opponent2?.id === winnerParticipantId) {
    updatePayload.opponent2_id = null;
  }

  await supabase.from('match').update(updatePayload).eq('id', downstreamMatch.id);
}
```

This preserves the opponent who arrived from an unrelated match path while still clearing the advancing participant and resetting scores/results (which must be cleared since one participant is being removed).

### Technical details

- The `round` table has `number`, `group_id`, and `stage_id` columns -- round numbers increase as the tournament progresses
- The `winnerParticipantId` is already computed at line 278 and can be passed to the clearing logic (currently it's scoped inside `checkDownstreamPopulation`, so the return type will be extended to include it, or recomputed in `adminToggleByeReady`)
- The `checkDownstreamPopulation` method signature will be updated to also return `winnerParticipantId` so the caller can use it for selective clearing

### Scope

Only `src/services/brackets/manager/services/BracketAdminService.ts` is modified. Two methods change:
- `checkDownstreamPopulation`: Add round-ordering filter and return `winnerParticipantId`
- `adminToggleByeReady`: Update clearing loop to selectively null only the fed slot

