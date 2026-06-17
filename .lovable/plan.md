## What's broken

In the Intermediate Spring 2026 bracket the WB Final (Smooth Sliders 2–0) and LB Final (The Triple Nipple 2–0) are both marked complete, but neither winner reached the Grand Final. Both Grand Final slots remain empty so the match can't be played.

## Where to look in code

| Concern | File |
|---|---|
| 1. Match completion save path | `src/services/brackets/manager/services/BracketUpdateService.ts` → `updateMatch()` |
| 2. Are `opponent1` + `opponent2` results forwarded to brackets-manager? | Same file, "NORMAL MATCH PATH", `manager.update.match()` call at L292 |
| 3. Is the GF round/group structure correct? | `src/services/brackets/manager/services/normalization/LbStructureService.ts` (`findGfGroup` expects `group.number === 3`) |
| 4. GF auto-population safety net | `src/services/brackets/manager/services/normalization/GrandFinalNormalizationService.ts` → `normalizeGrandFinalPopulation()` |
| 5. Cross-group propagation safety net | `src/services/brackets/manager/services/normalization/MatchPropagationRepairService.ts` → `propagateCompletedMatches()` |
| 6. Bracket build / position assignment | `src/services/brackets/manager/services/BracketCreationService.ts` and `SupabaseSqlStorage.loadParticipantsForTournament()` |

## Root-cause analysis

Per brackets-manager.js, finishing a WB Final and LB Final in a double-elimination stage with a Grand Final group is supposed to automatically place the WB winner into GF match 1 `opponent1` and the LB winner into GF match 1 `opponent2`. Our codebase relies on the library for that and only has thin safety nets after the call. Three real defects combine to produce the observed empty GF:

1. **Silent swallow of propagation errors (most likely cause).** In `BracketUpdateService.updateMatch()` (L294–308) any `manager.update.match()` failure whose message contains `"Match not found"` or `"Position is undefined"` is logged and treated as success. The Grand Final has no `position` written for `opponent1`/`opponent2` until the parent matches complete, so the library can throw `Position is undefined` while trying to advance the WB Final winner — and we swallow it. Same thing happens on the LB Final → GF write.

2. **`normalizeGrandFinalPopulation()` only repairs `opponent2`.** L55 short-circuits if `opponent2` is already populated and never even looks at `opponent1`. If brackets-manager failed to write the WB winner into `opponent1`, our safety net cannot recover it. Both opponents being empty (as in the screenshot) means *both* the library and the safety net are missing the WB→GF path.

3. **`propagateCompletedMatches()` only iterates the losers bracket** (`findLbGroup` → group number 2). It never looks at WB Final → GF or LB Final → GF cross-group edges, so it can't backfill either slot. The repair service is structurally blind to the Grand Final.

Secondary contributors (not the immediate cause but make the bug stick):

- `findGfGroup` assumes `group.number === 3`. If a bracket was created with `grand_final: 'simple'` (single GF match) vs `'double'` (reset match), the GF group still exists at number 3, so this is fine — but if any historical migration created brackets without a GF group, this returns `null` silently.
- `markBracketCompleteIfDone()` only counts matches with both opponents present. Because the GF match has no opponents, it isn't "playable" and is excluded — that's why the bracket already shows `state = 'completed'` even though GF is empty, which keeps re-firing `useBracketCompletion` and adding to user confusion.

This is not a seeding issue, not a data-shape issue at the round/match level, and not an incorrect manual state update. It's a silent error in the library call combined with safety nets that don't cover the WB→GF edge.

## Fix plan

### Step 1 — Stop swallowing GF propagation errors

In `BracketUpdateService.updateMatch()` (NORMAL MATCH PATH, around L294):

- Keep tolerating `Match not found` (legitimate when a bracket is fully archived).
- For `Position is undefined`, do **not** swallow — instead, after the catch, explicitly call a new repair routine (`backfillGrandFinalFromParents(stageId)`) before returning.
- Log every swallowed message with `errorLog` plus the match id so future cases surface in Sentry/console.

### Step 2 — Expand GF normalization to cover both slots

In `GrandFinalNormalizationService.normalizeGrandFinalPopulation()`:

- Remove the early return on `gfMatch.opponent2?.id` and instead check each slot independently.
- For `opponent1`: find the WB Final match (the highest-numbered round in WB group `number === 1`, last match), and if it's `status === 4`, write its winner into `gfMatch.opponent1`.
- For `opponent2`: keep existing LB Final logic.
- After either write, if both slots are now filled and `gfMatch.status <= 1`, bump status to 2 (Ready) so the UI lets admins enter the score.
- Use the same `position: undefined` shape already used for `opponent2`.

### Step 3 — Add WB Final lookup helper

Add `findWbFinalRound(stageId)` to `LbStructureService.ts` (or rename the class — it already deals with non-LB groups). Mirrors `findLbFinalRound` but filters `group.number === 1` and picks the max round number. Used by Step 2.

### Step 4 — Make the cross-bracket repair service cover GF

In `MatchPropagationRepairService.propagateCompletedMatches()`:

- After walking LB rounds, also walk: WB-Final → GF round 1 and LB-Final → GF round 1.
- Reuse the existing "find empty slot, never overwrite, bump status to Ready" branch.
- If the stage has a GF round 2 (double grand final / reset), propagate GF round 1 → GF round 2 the same way.

### Step 5 — One-off data fix for the broken bracket

Once the code is shipped, run a Supabase migration or admin script for the affected bracket only:

1. Look up the WB Final match and its winning participant.
2. Look up the LB Final match and its winning participant.
3. Update the GF match (group 3, round 1) to set `opponent1_id`, `opponent2_id`, and `status = 2`.

Should be presented to the user as a SQL snippet to run from the admin SQL editor rather than a migration, since it touches one row.

### Step 6 — Tests

Add `BracketUpdateService.grandFinal.test.ts` (or extend the existing test file) with:

- Setup: a fake `SupabaseSqlStorage`/manager pair representing a completed-WB-Final + completed-LB-Final + empty-GF state.
- Case A: `updateMatch` for the WB Final populates GF.opponent1.
- Case B: `updateMatch` for the LB Final populates GF.opponent2.
- Case C: After both, GF status flips to Ready (2).
- Case D: If brackets-manager throws `Position is undefined`, the new backfill still places the winner.
- Case E: GF already populated → safety net is a no-op.

Also add an integration-level test in `tests/` that builds a small 4-team double-elimination stage end-to-end through `bracketManagerService.updateMatch()` and asserts GF is populated and playable.

## Out of scope

- Standings calculation (covered by the recent "Standings Pending" work).
- UI changes to the bracket viewer.
- Reset/championship match scoring logic — only the population edge.

## Risk

Low. The changes are additive safety nets plus tighter error handling. The only behavior change for healthy brackets is that GF `opponent1` may be written by our code instead of brackets-manager — same value either way.
