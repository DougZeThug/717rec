# Plan: Fix Losers Bracket BYE Auto-Advancement

## Problem

When a bracket has byes (e.g., 10 teams in a 16-slot double elimination bracket), teams in the **losers bracket** that face a BYE do NOT automatically advance. An admin must manually unlock and score each LB BYE match. This is tedious and confusing.

**What SHOULD happen:** When a team drops to the losers bracket and their LB opponent is a BYE (null), the team should auto-advance to the next LB round without any manual intervention.

**What ACTUALLY happens:** The LB BYE match sits in Locked/Waiting status. An admin has to use the BYE toggle to unlock it, then manually enter scores to advance the team.

---

## How brackets-manager.js Handles BYEs (Library Deep-Dive)

Understanding the library's design is critical — the fix must work WITH the library, not around it.

### BYE vs TBD: The Critical Distinction

brackets-manager uses two different representations for "empty" opponent slots:

| Concept | Representation | Meaning | Auto-advance? |
|---------|---------------|---------|--------------|
| **BYE** | `null` (the entire opponent object) | No team exists and never will. Slot is permanently empty. | YES — library auto-advances |
| **TBD** | `{ id: null }` (object with null id) | A team will be placed here later (waiting for a previous match result). | NO — must wait for team |

This distinction is the core of how the library decides what to auto-advance. The library's `hasBye()` function (from `helpers.js`) does a strict identity check:

```javascript
function hasBye(match) {
    return match.opponent1 === null || match.opponent2 === null;
}
```

An object like `{ id: null }` is NOT `=== null`. It's a truthy JavaScript object. So the library treats it as TBD, not BYE.

### How BYE Auto-Advancement Works in the Library

**During bracket creation** (`manager.create.stage()`):

1. `null` values in the seeding array represent BYEs
2. The library builds the entire bracket structure **in memory**
3. For each match, `getInferredResult()` checks if one opponent is `null` and pre-sets the other as the winner:
   ```javascript
   function getInferredResult(opponent1, opponent2) {
       if (opponent1 && !opponent2)
           return { opponent1: { ...opponent1, result: 'win' }, opponent2: null };
       if (!opponent1 && opponent2)
           return { opponent1: null, opponent2: { ...opponent2, result: 'win' } };
       return { opponent1, opponent2 };
   }
   ```
4. `getMatchStatus()` marks BYE matches as `Locked` (status 0) — their outcome is predetermined
5. For **losers bracket construction**, `byeWinner()` and `byeLoser()` cascade BYEs through:
   ```javascript
   // byeLoser: if any opponent is BYE, the "loser" going to LB is also a BYE (null)
   function byeLoser(opponents, index) {
       if (opponents[0] === null || opponents[1] === null)
           return null;  // BYE cascades to losers bracket
       return { id: null, position: index + 1 };
   }
   ```
6. All of this happens in memory before anything is saved to the database. **This is why WB R1 BYEs work** — the library never reads from storage during creation.

**During match updates** (`manager.update.match()`):

1. When a match completes, `updateRelatedMatches()` propagates the winner/loser to next matches
2. The winner goes to the next WB match; the loser drops to a LB match
3. The library reads the destination LB match **from the database** via the storage adapter
4. It places the loser into the match via `setNextOpponent()`
5. Then it calls `propagateByeWinners()` to check if the LB match is now an auto-advance:
   ```javascript
   async propagateByeWinners(match) {
       helpers.setMatchResults(match, match, false);  // Re-calculate results
       await this.applyMatchUpdate(match);             // Save to storage
       if (helpers.hasBye(match))                      // Check for BYE
           await this.updateRelatedMatches(match, true, true);  // Cascade
   }
   ```
6. **This is where it breaks** — step 3 reads from the database, and the storage adapter converts `null` BYEs to `{ id: null }` objects, so `hasBye()` returns `false` and propagation stops.

### The Exact Broken Flow (10-team bracket example)

```
Setup: 10 teams → 16-slot bracket → 6 BYEs

WB R1 (8 matches):
  Match 1: Seed 1 vs BYE → Seed 1 auto-advances (in-memory, works fine)
  Match 2: Seed 8 vs Seed 9 → actual match
  Match 3: Seed 5 vs Seed 12(BYE) → Seed 5 auto-advances
  ...etc

WB R2 (4 matches):
  Match 9: Seed 1 vs winner of Match 2 → let's say Seed 1 wins

  → Loser of Match 9 drops to LB
  → The corresponding LB match has a BYE on the other side
    (because the WB R1 match that feeds this LB slot was a BYE —
     there was no real loser to send to LB)

LB R1 Match:
  Opponent 1: Loser of Match 9 (real team)
  Opponent 2: Should be null (BYE) — but storage returns { id: null }

  → hasBye() returns false
  → propagateByeWinners() does nothing
  → Match sits in Locked/Waiting — admin must manually advance it
```

### Previous Fix Attempts (Reverted)

The git history shows multiple reverted attempts:

- `e628755` "Fix LB BYE auto-advancement in double-elimination brackets"
- `b4b415c` "Fix LB auto-advance cascading through entire losers bracket"
- `028b15f` Reverted: "Fix LB BYE auto-advance to only act on Ready/Running matches"
- `922d8ac` Reverted: "Fix BYE handling in losers bracket with auto-advancement safety net"

**What went wrong with previous fixes:** The auto-advance logic couldn't properly distinguish between BYEs and TBD slots. Because the storage adapter represents both as objects (just with different property values), the auto-advance code would also advance teams past TBD matches where a real opponent was still coming. This caused teams to cascade through the entire losers bracket unchecked.

**Why this plan is different:** Instead of adding workaround logic, we fix the root cause — the storage adapter — so the library's own built-in BYE detection and auto-advancement works correctly.

---

## Root Cause Analysis

There are **two root causes** working together to break automatic BYE advancement:

### Root Cause 1: Storage adapter converts null opponents to objects (PRIMARY)

**File:** `src/services/brackets/manager/SupabaseSqlStorage.ts` (lines 229-265)

The `transformMatchFromDb()` method **always** creates an opponent object, even when the opponent is null (a BYE). When `opponent1_id` is `null` in the database, the adapter returns:

```javascript
// What the adapter returns:
opponent1: { id: null, position: undefined, score: null, result: null }

// What brackets-manager expects for a BYE:
opponent1: null
```

The brackets-manager library detects BYEs using its internal `hasBye()` function:

```javascript
function hasBye(match) {
    return match.opponent1 === null || match.opponent2 === null;
}
```

This checks if the **entire opponent object** is `null`. An object like `{ id: null }` is NOT `=== null` — it's a truthy object. So brackets-manager **never detects BYEs** when reading data back from the database.

**Why WB R1 BYEs still work:** During `manager.create.stage()`, brackets-manager builds the bracket structure in memory and propagates WB R1 BYEs before any database round-trip. The BYE detection works because the in-memory objects use actual `null`. But during match updates (gameplay), the library reads from the database, gets the wrong format, and can't detect BYEs.

### Root Cause 2: Defensive merge blocks null writes (CONTRIBUTING)

**File:** `src/services/brackets/manager/SupabaseSqlStorage.ts` (lines 78-93)

The `mergeOpponentSlots()` function prevents `null` from overwriting non-null opponent slots:

```javascript
if (incoming === null && prev?.[slot] != null) {
    // Prevents null overwrite — blocks brackets-manager from clearing slots
    delete out[slot];
}
```

While this was designed to prevent accidental data loss, it can interfere with brackets-manager's internal propagation logic. If the library needs to write `null` to a slot (e.g., to indicate a BYE loser), the defensive merge blocks it.

### Why These Combine to Break LB BYEs

Here's the exact flow that breaks:

1. **WB R2 match is played** — e.g., Seed 1 beats Seed 8
2. **brackets-manager propagates the loser (Seed 8) to a LB match**
3. **That LB match has a BYE on the other side** (because the corresponding WB R1 match was a BYE — no real team lost)
4. **brackets-manager reads the LB match from the database** to check if it should auto-advance
5. **The storage adapter returns** `opponent2: { id: null, score: null, result: null }` instead of `opponent2: null`
6. **`hasBye()` returns `false`** — brackets-manager doesn't see a BYE
7. **`propagateByeWinners()` skips this match** — no cascading advancement
8. **No auto-advancement** — the match sits in Locked/Waiting state
9. **Admin must manually unlock and score it**

---

## Fix Plan

### Step 1: Fix `transformMatchFromDb()` to return `null` for BYE opponents

**File:** `src/services/brackets/manager/SupabaseSqlStorage.ts`

**Change:** When `opponent1_id` (or `opponent2_id`) is `null` AND there's no score/result data, return `null` for the entire opponent slot instead of an object.

```javascript
// BEFORE (current):
transformed.opponent1 = {
    id: opponentId ?? null,       // Always creates an object
    position: cached?.position ?? undefined,
    score: data.opponent1_score ?? null,
    result: data.opponent1_result ?? null,
};

// AFTER (fix):
if (opponentId == null && !data.opponent1_score && !data.opponent1_result) {
    transformed.opponent1 = null;  // True BYE — brackets-manager can detect it
} else {
    transformed.opponent1 = {
        id: opponentId ?? null,
        position: cached?.position ?? undefined,
        score: data.opponent1_score ?? null,
        result: data.opponent1_result ?? null,
    };
}
```

Apply the same pattern for `opponent2`.

**Why this works:** brackets-manager's `hasBye()` will now correctly return `true` for BYE matches, enabling automatic advancement via `propagateByeWinners()`.

**Why this is safe:** This correctly distinguishes BYE from TBD:
- **BYE** (no id, no score, no result) → returns `null` → `hasBye()` = true → auto-advance
- **TBD** (no id yet, but positioned in bracket) → brackets-manager sets these with `{ id: null, position: X }` which still has a position, so it won't match the null check. However, we need to verify this in Step 3.
- **Real team** (has id) → returns object → `hasBye()` = false → normal match

**Risk:** Other parts of the codebase might assume opponent is always an object (never null). Need to audit all code that accesses `match.opponent1` or `match.opponent2` to handle `null` gracefully. This is covered in Step 3.

### Step 2: Update defensive merge to allow BYE-related null writes

**File:** `src/services/brackets/manager/SupabaseSqlStorage.ts`

**Change:** The `mergeOpponentSlots()` defensive merge should allow `null` writes when brackets-manager is performing BYE propagation. One approach:

- Remove the defensive merge entirely and trust brackets-manager's propagation logic
- OR add a flag/context parameter to bypass the merge during BYE propagation
- OR only block null overwrites when both score/result data are already set (i.e., the match has been played)

The simplest safe approach is to only prevent null overwrites on **completed matches** (status >= 4), not all matches:

```javascript
function mergeOpponentSlots(prev: DbMatch | null, patch: DbMatch): DbMatch {
    const out = { ...patch };
    // Only protect completed matches from null overwrites
    if (prev?.status != null && prev.status >= 4) {
        for (const slot of ['opponent1_id', 'opponent2_id'] as const) {
            if (slot in patch && patch[slot] === null && prev?.[slot] != null) {
                delete out[slot];
            }
        }
    }
    return out;
}
```

**Why this is safe:** Incomplete matches (Locked/Waiting/Ready/Running) should allow brackets-manager to freely modify opponent slots as part of normal BYE propagation. Only completed matches (where a result was actually played) need protection from accidental null overwrites.

### Step 3: Audit existing code for null opponent handling

**Files to check:**
- `src/services/brackets/viewer/BracketsViewerAdapter.ts` — the viewer transformation must handle `opponent === null`
- `src/services/brackets/manager/services/BracketNormalizationService.ts` — normalization logic accesses opponent properties
- `src/services/brackets/manager/services/BracketAdminService.ts` — BYE eligibility checks
- `src/services/brackets/manager/services/BracketUpdateService.ts` — BYE detection on line 53
- `src/components/playoffs/match-score-editor/BracketsManagerMatchEditor.tsx` — BYE match display
- Any components that display match data and access `opponent1.id` or `opponent2.id`

For each file, ensure code handles the case where `match.opponent1` or `match.opponent2` is `null` (the whole object, not just `opponent.id === null`).

**Specific patterns to find and fix:**
```javascript
// DANGEROUS — will crash if opponent is null:
match.opponent1.id
match.opponent2?.score

// SAFE — handles null opponent:
match.opponent1?.id
match.opponent1 === null
```

The `isByeMatch` check in `BracketUpdateService.ts` line 53 already works correctly:
```javascript
const isByeMatch = !currentMatch.opponent1 || !currentMatch.opponent2;
```
This returns `true` for both `null` AND `{ id: null }` since neither is truthy in a useful way. But with the fix, `null` will now be the correct representation and this check still works.

### Step 4: Add post-update BYE auto-advancement safety net in `BracketUpdateService`

**File:** `src/services/brackets/manager/services/BracketUpdateService.ts`

**Change:** After `manager.update.match()` completes, scan the losers bracket for matches that now have exactly one real opponent and one `null` opponent (BYE). Auto-advance the real team by calling `manager.update.match()` with a win result.

This is a **safety net** in case brackets-manager's internal propagation still doesn't catch all cases (e.g., timing issues with the storage adapter). Add this after the existing normalization calls:

```javascript
// After existing normalization...
await this.autoAdvanceLBByes(stageId);
```

New method `autoAdvanceLBByes(stageId)`:
1. Find all matches across all groups (not just LB — BYEs can appear in WB too)
2. For each match where one opponent is `null` (BYE) and the other has a real participant id, and status is NOT Completed (4) or Archived (5):
   - Set the real opponent's result to `'win'`
   - Call `manager.update.match()` to let the library handle propagation
3. Repeat until no more auto-advanceable BYE matches are found (handles cascading BYEs where a BYE winner meets another BYE in the next round)
4. Cap iterations to prevent infinite loops (e.g., max 10 passes)

**Critical safety guard:** Only auto-advance when opponent is strictly `null` (a true BYE), NOT when opponent is `{ id: null }` (TBD waiting for a real team). After Step 1, this distinction is clear in the data. This is what prevents the "cascading through entire bracket" bug from previous attempts.

### Step 5: Remove manual BYE admin workaround (cleanup)

Once auto-advancement works, the manual BYE toggle in `BracketAdminService` becomes unnecessary for normal operation. Keep it as a fallback for edge cases, but it should no longer be the primary workflow.

---

## Implementation Order

1. **Step 1** (fix `transformMatchFromDb`) — This is the core fix
2. **Step 3** (audit null handling) — Must happen alongside Step 1 to avoid crashes
3. **Step 2** (fix defensive merge) — Removes the secondary blocker
4. **Step 4** (post-update auto-advancement) — Safety net for edge cases
5. **Step 5** (cleanup) — After verifying everything works

## Testing Plan

- Create a 10-team double elimination bracket (6 BYEs in a 16-slot bracket)
- Verify WB R1 BYE matches auto-complete during creation (should already work)
- Play WB R1 real matches (e.g., 7v10, 8v9) and verify losers drop to LB correctly
- **Key test:** Play WB R2 matches and verify losers who face BYEs in LB auto-advance
- Play through the full bracket to ensure no matches get stuck
- Test edge cases: brackets of 3, 5, 6, 7, 9, 10, 11, 12 teams
- Verify that TBD matches (waiting for real opponents) do NOT auto-advance
- Verify that teams dropping to losers bracket stop at the correct round and don't cascade through
