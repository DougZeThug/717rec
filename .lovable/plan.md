

## Plan: Always Block Same-Session Rematches Regardless of avoidRematches

### The problem

`standardPairing.ts` adds each block's pairings to `playedPairsSet` to prevent same-session rematches across time blocks. But `shouldExcludeEdge`, `buildWeightedGraphWithRelaxation`, and `analyzeGraphFeasibility` all gate `playedPairsSet` checks behind `config.avoidRematches`. When `avoidRematches` is `false`, the set is populated but never consulted — teams can face the same opponent twice in one scheduling session.

### The fix

**1 file** — `src/utils/autoSchedule/blossomPairingAlgorithm.ts`

Separate the `playedPairsSet` check (same-session) from the `avoidRematches` flag (season history). The set should **always** be checked since it represents tonight's pairings, not historical ones.

**`shouldExcludeEdge`** (~line 588-605): Add an unconditional same-session check before the `avoidRematches` block:

```typescript
function shouldExcludeEdge(team1: Team, team2: Team, config: TeamPairingConfig): boolean {
  if (isExtremeTierDifference(team1, team2)) {
    return true;
  }

  // Always block same-session rematches (populated by standardPairing across blocks)
  if (config.playedPairsSet) {
    const pairingKey = [team1.id, team2.id].sort().join('-');
    if (config.playedPairsSet.has(pairingKey) && !isBothRecreational(team1, team2)) {
      return true;
    }
  }

  // Historical rematches only blocked when avoidRematches is enabled
  if (config.avoidRematches) {
    const hasPlayedBefore = haveTeamsPlayedBeforeSync(team1.id, team2.id, config);
    if (hasPlayedBefore && !isBothRecreational(team1, team2)) {
      return true;
    }
  }

  return false;
}
```

Wait — `haveTeamsPlayedBeforeSync` already checks `playedPairsSet`, so the above would double-check. The cleaner approach: since `playedPairsSet` contains **both** season history pairs (loaded in `standardPairing.ts` from `fetchSeasonHistoryForTeams`) **and** same-session pairs (added after each block), we should always check the set, and only skip it when `avoidRematches` is false AND the pair was NOT added during this session.

Actually, looking more carefully: the `playedPairsSet` is a single set containing both historical and session pairs — they can't be distinguished. The simplest correct fix is:

**Always check `playedPairsSet`** in `shouldExcludeEdge`, `buildWeightedGraphWithRelaxation`, and `analyzeGraphFeasibility`, regardless of `avoidRematches`. The `avoidRematches` flag already controls whether historical pairs are loaded into the set (line 395: `if (!config.playedPairsSet && config.avoidRematches)`). When `avoidRematches` is false, the set only contains same-session pairs — exactly what we want to block.

#### Changes in `shouldExcludeEdge` (line 596):
Remove the `config.avoidRematches` gate — always check `playedPairsSet`:

```typescript
// Hard constraint: Block rematches from playedPairsSet
// This covers both season history (when avoidRematches=true) and 
// same-session rematches (always added by standardPairing across blocks)
const hasPlayedBefore = haveTeamsPlayedBeforeSync(team1.id, team2.id, config);
if (hasPlayedBefore && !isBothRecreational(team1, team2)) {
  return true;
}
```

#### Changes in `buildWeightedGraphWithRelaxation` (line 235-238):
Same pattern — remove the `config.avoidRematches` gate:

```typescript
const hasPlayedBefore = haveTeamsPlayedBeforeSync(team1.id, team2.id, config);
if (effectiveRelaxation < 1 && hasPlayedBefore && !isBothRecreational(team1, team2)) {
  continue;
}
```

#### Changes in `analyzeGraphFeasibility` (line 129-132):
Same pattern:

```typescript
const hasPlayedBefore = haveTeamsPlayedBeforeSync(team1.id, team2.id, config);
const rematchBlocked =
  relaxationLevel < 1 && hasPlayedBefore && !isBothRecreational(team1, team2);
```

### What changes

- **1 file** — `src/utils/autoSchedule/blossomPairingAlgorithm.ts`: remove `config.avoidRematches` gate from 3 locations so `playedPairsSet` is always consulted
- **0 migrations, 0 other files**

