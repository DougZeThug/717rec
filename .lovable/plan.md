

# Fix: Swap Relaxation Priority — Tier Before Rematches

## What's Actually Happening (traced step by step)

With 6 teams in the Late block at level 0 (all constraints enforced):

```text
Sorted by constraint pressure (fewest opponents first):
  Corn Kitties (T3):      can play HVHH, Miracle         = 2 opponents
  Cornholy Trinity (T3):  can play HVHH, Miracle         = 2 opponents
  Offdogs (T1):           can play Seize, HVHH, Miracle  = 3 opponents
  Seize the Maize (T1):   can play Offdogs, HVHH, Miracle = 3 opponents
  HVHH (T2):              can play everyone except T3↔T3 rematch = 5
  Miracle (T2):            = 5
```

**S1 greedy (level 0):** Most constrained first — works perfectly:
- Corn Kitties → HVHH (T3vT2)
- Cornholy → Miracle (T3vT2)  
- Offdogs → Seize (T1vT1)

**S2 greedy (level 0):** Now the T2 teams swap T3 partners:
- Corn Kitties → Miracle (T3vT2, not tonight pair)
- Cornholy → HVHH (T3vT2, not tonight pair)
- Offdogs → needs Seize, but **blocked** (session rematch from S1)
- **Offdogs and Seize stranded** — they can ONLY play each other or T2 teams, and T2 teams are taken

Total: 5/6 matches. Cross-slot swap fires but can't fix it — every S1 rearrangement has the same structural problem: T3 teams consume both T2 teams, leaving T1 teams with only each other.

**Relaxation kicks in.** Currently level 1 = allow season rematches. The greedy re-runs and now Corn Kitties vs Cornholy Trinity becomes valid. The greedy happily pairs them (same tier = priority 1 in sorting) producing the rematch you saw.

**But if level 1 = allow cross-tier instead:** Offdogs could play Corn Kitties (T1vT3), freeing Miracle to pair with Seize. All teams paired, zero rematches. A T1vT3 match is far more acceptable than a rematch.

Your manual fix proved this — you found the valid non-rematch pairings easily.

## Changes

### File: `src/utils/scheduling/greedyBackToBackScheduler.ts`

**1. `canPlay()` (lines 156-160) — swap the two checks:**
```typescript
// Level 1: Allow cross-tier (cosmetic preference — relax first)
if (relaxationLevel < 1 && tierDistance(teamA, teamB) > maxTierGap) return false;
// Level 2: Allow season rematches (user explicitly asked to avoid — relax last)
if (relaxationLevel < 2 && playedSet.has(key)) return false;
```

**2. `analyzeGreedyFeasibility()` (lines 197-235) — check tier relaxation first:**
Swap the two blocks: first check if relaxing tier constraints helps the at-risk teams, then check if relaxing rematches helps. Return `recommendedLevel: 1` for tier relaxation, `2` for rematches.

**3. Relaxation loop diagnostics (lines 1072-1073) — update labels:**
```typescript
if (relaxationLevel === 1) diagnostics.constraintsRelaxed.push('tier_constraints');
if (relaxationLevel === 2) diagnostics.constraintsRelaxed.push('season_rematches');
```

**4. Initial diagnostics (lines 989-990) — match new order:**
```typescript
if (relaxationLevel >= 1) diagnostics.constraintsRelaxed.push('tier_constraints');
if (relaxationLevel >= 2) diagnostics.constraintsRelaxed.push('season_rematches');
```

**5. `findBestOpponent()` sort (lines 324-329) — update rematch preference threshold:**
The "prefer non-rematches" tiebreaker currently triggers at `relaxationLevel >= 1`. Change to `>= 2` (the new rematch-allowing level). Add a "prefer same-tier" tiebreaker at level `>= 1`.

**6. Relaxation names map (lines 970-975) — update labels:**
```typescript
const relaxationNames: Record<RelaxationLevel, string> = {
  0: 'none',
  1: 'allow cross-tier matches',
  2: 'allow season rematches',
  3: 'full relaxation',
};
```

**7. JSDoc comment for RelaxationLevel type (lines 138-142) — update docs.**

### File: `src/hooks/scheduling/utils/dualBlockScheduler.ts`

**8. Fix `hasPlayedBefore` flag (line 182):**
Build a lookup Set from `historyPairs` before the loop, then check it when creating pairings instead of hardcoding `false`. Import `pairKey` from the greedy scheduler.

