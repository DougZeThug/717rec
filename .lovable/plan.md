## What's happening

The bracket `3457c81c-...` was flipped to `state='completed'`, which triggered `BracketStandingsService.calculateFinalStandings`. That in turn calls `brackets-manager`'s `doubleEliminationStandings`, which walks the losers bracket and throws **"Participant not found"**.

I dumped the match table for that bracket. All opponent IDs (1401–1406) resolve to real participants — so the helper isn't failing on a missing row. The real culprit is **match 2623** in the losers bracket (group 334, round 1161, number 2):

- `opponent1_id = 1406`, `opponent2_id = NULL`
- `status = 4` (ready/running, **not** completed — every other match is status 5)

`doubleEliminationStandings` assumes every losers-bracket round has a defined loser to read. When it hits this still-pending slot it calls the helper that throws "Participant not found". So the bracket was marked complete prematurely (likely off the grand final), while a losers-bracket match was still unresolved.

The current code then re-throws as a destructive toast: *"Standings Calculation Failed — Could not calculate final placements."* No partial data is written (good), but the user sees a scary error and has no way forward.

## The plan

### 1. Make the standings calculation defensive (code fix)

In `src/services/brackets/manager/services/BracketStandingsService.ts`:

- **Pre-check before calling `manager.get.finalStandings`**: query `match` rows for the chosen stage and find any with `status < 5` (not archived/completed) OR with a null opponent that isn't a real BYE. If found, log them and **return early without throwing** — there's nothing to compute yet.
- **Wrap `manager.get.finalStandings` in its own try/catch**: if it still throws (e.g. "Participant not found"), log the offending stage + the suspect matches we found, and return early instead of re-throwing. We never want a half-finished bracket to surface a destructive toast.

In `src/hooks/useBracketCompletion.ts`:

- Replace the "Standings Calculation Failed" destructive toast with a quieter info toast (or remove it entirely) when the service returns without writing records. The success toast still fires when records are actually upserted.

### 2. One-off data repair for this bracket (separate step, after code lands)

Once the code is safe, we still need to decide what to do with bracket `3457c81c-...`:

- **Option A**: flip `brackets.state` back to `in_progress` so the admin can finish match 2623, then completion re-fires naturally.
- **Option B**: if match 2623 should be a BYE for 1406, mark it `status = 5` with `opponent1_result = 'win'` so the losers bracket resolves.

I'd recommend **A** unless you confirm 2623 is supposed to be a BYE.

### 3. Verification

- Add a unit test in `src/services/brackets/manager/services/__tests__/BracketStandingsService.test.ts` covering: (a) stage with an incomplete match → returns early, no upsert, no throw; (b) `finalStandings` throwing → swallowed with log, no upsert, no throw; (c) happy path still upserts as today.
- Run `npm run test:file -- src/services/brackets/manager/services/__tests__/BracketStandingsService.test.ts`.

## Files touched

- `src/services/brackets/manager/services/BracketStandingsService.ts` — add pre-check + inner try/catch around `finalStandings`.
- `src/hooks/useBracketCompletion.ts` — soften the failure toast.
- `src/services/brackets/manager/services/__tests__/BracketStandingsService.test.ts` — new tests.

## Questions before I implement

1. For bracket `3457c81c-...`, do you want me to revert it to `in_progress` (recommended) or treat match 2623 as a BYE win for "Smacked"?
2. Should the "still has unfinished matches" case be totally silent, or show a small info toast like *"Standings will be calculated when all matches are complete"*?