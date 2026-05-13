## Bug verified

Confirmed in `src/components/playoffs/BracketCreationDialog.tsx`:

- Line 110: `seed: data.teamSeeds?.[team.id] ?? team.seed ?? 0` coerces NULL/undefined seeds to `0`.
- Line 142: `seed: team.seed || index + 1` then turns that `0` into a positional seed.

By the time `src/services/bracket-creator.ts` runs, every team has a positive integer `seed`, so the "BOTH have manual seeds" branch (line 52) is always taken and the `power_score`-based fallback (line 63) is dead code. Result: top seed goes to whatever the array's first team is (often alphabetical), not the highest `power_score`.

## Fix

Single file: `src/components/playoffs/BracketCreationDialog.tsx`. Stop fabricating seeds in the UI; pass `undefined` when no manual override exists so `bracket-creator.ts` can run its existing power_score sort.

```ts
const selectedTeams = teams
  .filter((team) => data.teams.includes(team.id))
  .map((team) => {
    const manualSeed = data.teamSeeds?.[team.id];
    return {
      ...team,
      // Only a real, user-provided seed counts. team.seed from DB is
      // intentionally ignored here so power_score ranking can drive auto-seeds.
      seed: typeof manualSeed === 'number' && manualSeed > 0 ? manualSeed : undefined,
    };
  });
```

And in the mutation payload (replacing line 139–143):

```ts
teams: selectedTeams.map((team) => ({
  id: team.id,
  name: team.name,
  seed: team.seed, // undefined when no manual override → bracket-creator sorts by power_score
})),
```

`CreateBracketArgs.teams[].seed` is already `seed?: number` (line 11 of `bracket-creator.ts`), so passing `undefined` is type-safe and routes through the existing branch that sorts by `power_score` and assigns `index + 1` per the sorted order.

## Out of scope

- DB-stored `team.seed` is intentionally not used as an auto-seed source. If a league wants per-team default seeds, that's a separate feature (and would need a UI to make it visible).
- Not touching `BracketFormTeamsContainer` ordering or `v_team_details` ORDER BY — `bracket-creator.ts` re-sorts by `power_score` regardless of input order once seeds are undefined.

## Verification

- 8 teams, no manual seeds, varying power_score: created bracket's seed 1 = highest power_score team (was previously alphabetical first).
- 8 teams, manual seed set on 2 teams via the seed editor: those two keep their manual seeds; the rest fill in by power_score order around them (current bracket-creator behavior, unchanged).
- Type check passes (`seed?: number` accepts undefined).

Risk: Low. One file, one component. Rollback: trivial.