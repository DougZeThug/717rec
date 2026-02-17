# Plan: Fix Autoscheduler Repeat Matches in Dual Match Mode

## The Problem

When running the autoscheduler in dual match mode (greedy algorithm) late in the season
(teams have 10+ completed matches), the scheduler produces many repeat matchups even when
viable non-repeat pairings exist in the same timeslots. The user only discovers these
rematches after switching to edit mode, where the validation flags them.

---

## Root Causes Found (5 issues)

### Bug 1: `hasPlayedBefore` hardcoded to `false` in greedy output
**File:** `src/hooks/scheduling/utils/dualBlockScheduler.ts` line 182

When the greedy scheduler's results are converted to `TeamPairing` objects, the
`hasPlayedBefore` field is always set to `false`:
```typescript
const pairing: TeamPairing = {
  team1,
  team2,
  compatibilityScore: match.tierA === match.tierB ? 10.0 : 5.0,
  hasPlayedBefore: false,  // <-- ALWAYS FALSE, never checks history
};
```

**Impact:** The preview screen (before edit mode) shows all matches as green/good,
hiding rematches. The user only finds out after toggling to edit mode where a separate
database validation runs. This is misleading and wastes time.

---

### Bug 2: Feasibility check doesn't account for S1/S2 sharing the same opponent pool
**File:** `src/utils/scheduling/greedyBackToBackScheduler.ts` lines 169-239

The `analyzeGreedyFeasibility()` function checks "does each team have at least 2 valid
opponents?" But it counts ALL available opponents without modeling that S1 and S2
consume from the SAME pool.

**Example that breaks:**
- Team A can play: B, C (2 valid opponents -- passes the check)
- S1 greedy pairs: A vs B
- S2 now needs to pair A, but B is blocked (session rematch). A's only remaining
  opponent C may have already been paired with someone else in S2.
- The feasibility check said "A is fine" but the sequential consumption wasn't modeled.

**Impact:** The scheduler thinks relaxation isn't needed (level 0), proceeds with
greedy S1, then S2 gets stuck and either leaves teams unmatched or bumps to
relaxation level 1 (allowing season rematches).

---

### Bug 3: S1 greedy choices paint S2 into a corner (no joint optimization)
**File:** `src/utils/scheduling/greedyBackToBackScheduler.ts` lines 997-1111

The algorithm works like this:
1. Generate S1 pairings greedily (best available match for each team)
2. Lock in S1 matches (added to `tonightPairs`)
3. Generate S2 pairings greedily from what's left
4. If S2 can't fill all slots, bump relaxation level and retry BOTH slots

The problem: S1 makes locally optimal choices that consume the "good" non-repeat
matchups, leaving S2 with only repeat options. The existing `tryCrossSlotSwap()`
only triggers when S2 completely fails to match teams -- it does NOT trigger when
S2 "succeeds" but only by using season rematches.

**Example:**
- 8 teams (A-H), A has already played B,C,D,E this season
- S1 greedily pairs: A-F, B-G, C-H, D-E (all non-repeats -- great!)
- S2 must now pair A with someone new. F is blocked (session). G,H available.
  But G and H may have already played A this season.
- S2 makes a rematch. Cross-slot swap doesn't activate because S2 did produce
  matches (just bad ones).

**Impact:** This is the PRIMARY cause of the repeat match problem. The greedy
approach fails to find the globally optimal S1+S2 combination that minimizes
rematches. Late in the season (10+ matches per team), the constraint space
is tight and greedy local decisions cascade into bad S2 outcomes.

---

### Bug 4: History only includes completed matches (misses scheduled-but-unscored)
**File:** `src/utils/autoSchedule/matchHistoryService.ts` lines 80-86

```typescript
const { data: matches, error } = await supabase
  .from('matches')
  .select('team1_id, team2_id')
  .eq('iscompleted', true)     // <-- ONLY completed matches
  .eq('season_id', seasonData.id)
```

If a match was auto-scheduled in a previous week but never scored/completed, it
won't appear in history. The scheduler may create the same matchup again.

**Impact:** Minor compared to the other bugs, but contributes to unnecessary repeats
when previous weeks' matches haven't been finalized.

---

### Bug 5: Cross-slot swap is too conservative
**File:** `src/utils/scheduling/greedyBackToBackScheduler.ts` lines 689-819

`tryCrossSlotSwap()` only activates when:
- Relaxation level is exactly 0
- S2 has completely unmatched teams (not just rematch teams)

It does NOT activate when S2 produces rematches. The function was designed to fix
"stranded teams" but not to improve match quality.

**Impact:** Even at relaxation level 0, the algorithm misses opportunities to
rearrange S1 to eliminate S2 rematches.

---

## Fix Plan (ordered by impact)

### Fix 1: Add rematch-aware cross-slot optimization (HIGH IMPACT)
**Files to change:** `greedyBackToBackScheduler.ts`

After generating S1 and S2, add a new pass that:
1. Identifies which S2 matches are season rematches
2. For each S2 rematch, checks if rearranging one S1 match would free up a
   non-repeat opponent for S2
3. Tries all valid S1 rearrangements to eliminate the rematch
4. Only applies the swap if it doesn't create new rematches

This is like the existing `tryCrossSlotSwap()` but triggered by rematches,
not just unmatched teams. Think of it as: "S2 has a rematch -- can we shuffle
S1 to fix it?"

**Why this works:** Most repeat match scenarios happen because S1 "stole" the
non-repeat opponent that S2 needed. Swapping one S1 pairing often frees up
the right opponent.

---

### Fix 2: Set `hasPlayedBefore` correctly in greedy output (MEDIUM IMPACT)
**File to change:** `dualBlockScheduler.ts` line 182

Instead of hardcoding `false`, check against the `historyPairs` that were already
fetched:

```typescript
// Build a Set from historyPairs for O(1) lookup
const historySet = new Set(historyPairs.map(([a, b]) => pairKey(a, b)));

// Then when creating pairings:
hasPlayedBefore: historySet.has(pairKey(match.teamAId, match.teamBId))
```

**Why this matters:** Users can see rematch warnings immediately in preview mode
instead of only discovering them after toggling to edit mode. Saves a lot of
back-and-forth.

---

### Fix 3: Improve feasibility analysis to model opponent pool depletion (MEDIUM IMPACT)
**File to change:** `greedyBackToBackScheduler.ts`, `analyzeGreedyFeasibility()`

Instead of just counting "does each team have >= 2 valid opponents", run a quick
simulation:
1. Simulate a greedy S1 pass (without committing matches)
2. Check remaining opponent availability for S2
3. If S2 would need rematches, try alternative S1 configurations
4. Only recommend relaxation if no S1 arrangement avoids rematches

This prevents premature relaxation -- the current code jumps to "allow rematches"
when it doesn't actually need to.

---

### Fix 4: Include scheduled (non-completed) matches in history (LOW IMPACT)
**File to change:** `matchHistoryService.ts`

Change the query to also include matches that exist in the database but aren't
completed yet. These represent scheduled matchups that shouldn't be repeated:

```typescript
// Remove the .eq('iscompleted', true) filter
// Or use: .or('iscompleted.eq.true,iscompleted.is.null')
```

Add a flag to distinguish "completed" vs "scheduled" history so the algorithm
can weight them differently if desired.

---

### Fix 5: Expand cross-slot swap trigger conditions (LOW IMPACT)
**File to change:** `greedyBackToBackScheduler.ts`, after S2 generation

The existing `tryCrossSlotSwap()` should also run when:
- S2 contains season rematches (not just unmatched teams)
- Relaxation level > 0 was applied (try to find level 0 solution first)

This is largely addressed by Fix 1 but this change ensures the existing
infrastructure is used more effectively.

---

## Implementation Order

1. **Fix 2** first (hasPlayedBefore flag) -- smallest change, immediate user benefit
2. **Fix 1** next (rematch-aware cross-slot optimization) -- biggest impact on match quality
3. **Fix 5** alongside Fix 1 (expand swap triggers) -- natural extension
4. **Fix 3** (improved feasibility) -- prevents premature relaxation
5. **Fix 4** last (include scheduled matches) -- minor edge case

## Key Files Involved

| File | What Changes |
|------|-------------|
| `src/hooks/scheduling/utils/dualBlockScheduler.ts` | Fix hasPlayedBefore flag (Fix 2) |
| `src/utils/scheduling/greedyBackToBackScheduler.ts` | Cross-slot optimization (Fix 1, 3, 5) |
| `src/utils/autoSchedule/matchHistoryService.ts` | Include scheduled matches (Fix 4) |

## Testing Strategy

- Unit tests with mock teams/history covering the exact scenario (10+ completed matches,
  viable non-repeats exist but greedy misses them)
- Verify hasPlayedBefore flag is correct in preview mode
- Verify cross-slot swap resolves rematches that the current code misses
- Regression test: ensure odd-team handling still works correctly
- Regression test: ensure double-header (cross-block) tracking still works
