# Plan: Fix Losers Bracket BYE Auto-Advancement

## Problem

When a bracket has byes (e.g., 10 teams in a 16-slot double elimination bracket), teams in the **losers bracket** that face a BYE do NOT automatically advance. An admin must manually unlock and score each LB BYE match. This is tedious and confusing.

**What SHOULD happen:** When a team drops to the losers bracket and their LB opponent is a BYE (null), the team should auto-advance to the next LB round without any manual intervention.

**What ACTUALLY happens:** The LB BYE match sits in Locked/Waiting status. An admin has to use the BYE toggle to unlock it, then manually enter scores to advance the team.

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
7. **No auto-advancement** — the match sits in Locked/Waiting state
8. **Admin must manually unlock and score it**

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

**Why this works:** brackets-manager's `hasBye()` will now correctly return `true` for BYE matches, enabling automatic advancement.

**Risk:** Other parts of the codebase might assume opponent is always an object (never null). Need to audit all code that accesses `match.opponent1` or `match.opponent2` to handle `null` gracefully.

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

### Step 3: Add post-update BYE auto-advancement in `BracketUpdateService`

**File:** `src/services/brackets/manager/services/BracketUpdateService.ts`

**Change:** After `manager.update.match()` completes, scan the losers bracket for matches that now have exactly one real opponent and one null opponent (BYE). Auto-advance the real team by calling `manager.update.match()` with a win result.

This is a **safety net** in case brackets-manager's internal propagation still doesn't catch all cases. Add this after the existing normalization calls:

```javascript
// After existing normalization...
await this.autoAdvanceLBByes(stageId);
```

New method `autoAdvanceLBByes(stageId)`:
1. Find all LB matches (group number 2)
2. For each match with exactly one real opponent and one null (BYE), and status < 4 (not completed):
   - Set the real opponent's result to 'win'
   - Set status to Completed (4)
   - Let brackets-manager propagate the winner to the next round
3. Repeat until no more BYE matches are found (cascading BYEs)

### Step 4: Audit existing code for null opponent handling

**Files to check:**
- `src/services/brackets/viewer/BracketsViewerAdapter.ts` — the viewer transformation must handle `opponent === null`
- `src/services/brackets/manager/services/BracketNormalizationService.ts` — normalization logic accesses opponent properties
- `src/services/brackets/manager/services/BracketAdminService.ts` — BYE eligibility checks
- Any components that display match data and access `opponent1.id` or `opponent2.id`

For each file, ensure code handles the case where `match.opponent1` or `match.opponent2` is `null` (the whole object, not just `opponent.id === null`).

### Step 5: Consider adding `balanceByes` to bracket creation settings

**File:** `src/services/brackets/manager/services/BracketCreationService.ts`

**Optional improvement:** Add `balanceByes: true` to the stage settings. This distributes BYEs evenly across the bracket instead of clustering them. Without this, top seeds might face BYE-vs-BYE matchups, creating more cascading BYEs in the LB.

```javascript
settings: {
    seedOrdering: ['inner_outer', 'natural', 'reverse_half_shift', 'reverse'],
    grandFinal: ...,
    balanceByes: true,  // NEW: distribute BYEs evenly
}
```

This is optional and doesn't fix the core issue, but improves bracket quality.

### Step 6: Remove manual BYE admin workaround (cleanup)

Once auto-advancement works, the manual BYE toggle in `BracketAdminService` becomes unnecessary for normal operation. Keep it as a fallback for edge cases, but it should no longer be the primary workflow.

---

## Implementation Order

1. **Step 1** (fix `transformMatchFromDb`) — This is the core fix
2. **Step 4** (audit null handling) — Must happen alongside Step 1 to avoid crashes
3. **Step 2** (fix defensive merge) — Removes the secondary blocker
4. **Step 3** (post-update auto-advancement) — Safety net for edge cases
5. **Step 5** (balanceByes) — Optional improvement
6. **Step 6** (cleanup) — After verifying everything works

## Testing Plan

- Create a 10-team double elimination bracket (6 BYEs in a 16-slot bracket)
- Verify WB R1 BYE matches auto-complete during creation (should already work)
- Play WB R1 real matches (e.g., 7v10, 8v9) and verify losers drop to LB correctly
- **Key test:** Play WB R2 matches and verify losers who face BYEs in LB auto-advance
- Play through the full bracket to ensure no matches get stuck
- Test edge cases: brackets of 3, 5, 6, 7, 9, 10, 11, 12 teams
