## Bug verified

`src/utils/autoSchedule/blossom/generatePairings.ts` line 162 returns `findGuaranteedSolution(...)` from the catch block without validation. `findGuaranteedSolution`/`repairUnmatchedTeams` log a warning when teams still don't reach `targetMatchesPerTeam` but return the incomplete result anyway. Downstream, `src/hooks/scheduling/utils/standardPairing.ts` only flags teams with **zero** appearances as unmatched, so teams with 1/2 matches are silently treated as "matched" — the schedule looks fine to the user despite being incomplete.

The primary blossom path (lines ~120–146) already calls `validatePairings` / `validatePairingsWithDetails` (both throw on incomplete results). The catch-block fallback is the only escape that doesn't.

## Fix

Two files, minimal diffs.

### 1. `src/utils/autoSchedule/blossom/generatePairings.ts`

In the catch block, validate the fallback before returning so partial results surface as a generation failure (caller already shows a toast):

```ts
warnLog('Falling back to guaranteed matching solution...');
const fallbackPairings = await findGuaranteedSolution(teams, config, targetMatchesPerTeam);
validatePairingsWithDetails(teams, fallbackPairings, targetMatchesPerTeam, config);
return fallbackPairings;
```

`validatePairingsWithDetails` is already imported. It throws with a detailed per-team message; the original error from blossom is already logged via `errorLog` two lines above, so context is preserved.

### 2. `src/hooks/scheduling/utils/standardPairing.ts`

Defense in depth: count appearances per team and flag any team with fewer than 2 matches (the blossom target) as unmatched, instead of only zero-match teams. Replace the current `pairedTeamIds` Set logic with:

```ts
const TARGET_MATCHES = 2;
const matchCounts = new Map<string, number>();
teamsInBlock.forEach((t) => matchCounts.set(t.id, 0));
blockPairings.forEach((pair) => {
  matchCounts.set(pair.team1.id, (matchCounts.get(pair.team1.id) ?? 0) + 1);
  matchCounts.set(pair.team2.id, (matchCounts.get(pair.team2.id) ?? 0) + 1);
});
const blockUnmatchedTeams = teamsInBlock
  .filter((team) => (matchCounts.get(team.id) ?? 0) < TARGET_MATCHES)
  .map((team) => team.id);
```

Also `warnLog` when any team has 1 (partial) match so it's visible in logs.

## Verification

- `npm run test:file -- src/utils/autoSchedule/blossom/__tests__/repair.test.ts`
- `npm run test:file -- src/hooks/scheduling/utils/__tests__/standardPairing.test.ts` (if present)
- Existing repair test asserts `<= 2` matches; no change needed there. The new behavior is "throw if any team has != 2".
- Manual: with a tight 5-team standard-mode block that previously returned a partial schedule, generation should now fail loudly with "Generation Failed" toast plus detailed per-team analysis in the console.

Risk: Medium. Schedules that previously appeared "complete but partial" will now error visibly. That is the intended behavior per the bug report. Rollback: trivial (revert two hunks).