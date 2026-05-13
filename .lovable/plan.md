## Goal
When the last match of a bracket finishes, write `brackets.state = 'completed'` so the existing `useBracketCompletion` realtime subscription fires and `calculateFinalStandings()` populates `playoff_team_records`.

## Root cause
- `useBracketCompletion` (`src/hooks/useBracketCompletion.ts`) listens for `state === 'completed'` UPDATE events on the `brackets` row.
- No code path ever sets `brackets.state` to `'completed'`. The column is created as `'pending'` and stays that way.
- The UI's "completed" display is purely client-side (`computeBracketState` derived from match data), so the gap was invisible until someone needed the final standings rows.

## Fix
Detect "bracket just finished its final match" inside the existing match-update flow and write `brackets.state = 'completed'` exactly once. The existing realtime subscription will then call `calculateFinalStandings()`. No new pathway, no schema change.

### Where
`src/services/brackets/manager/services/BracketUpdateService.ts` — at the end of `updateMatch`, after normalization and propagation already run.

### How
1. Resolve the `bracketId` (tournament UUID) from the stage row already fetched in this method (`stage.tournament_id`).
2. Pull all `match` rows for that tournament (already supported via `storage.select('match', { stage_id })` per stage; loop the bracket's stages — usually one for SE, one for DE plus optional grand-final stage).
3. Determine "all matches done" using the same logic shape as `computeBracketState`:
   - Single elimination: every match with both opponents present has `status === 4` (Completed) AND the finals match has a winner.
   - Double elimination: championship match (finals round 1) is complete AND either (a) the WB champion won it (no reset needed — also confirmed by the existing `brackets.reset_match_needed` flag/`wb_champion_id`) OR (b) the reset match (finals round 2) is complete.
4. If complete, `supabase.from('brackets').update({ state: 'completed' }).eq('id', bracketId).neq('state', 'completed')` — the `neq` guard prevents redundant UPDATE events and re-firing the realtime hook.
5. Wrap in try/catch → `errorLog`; never throw out of this side-effect (match update must not fail because completion-detection failed).

### Reuse
- Prefer wiring the existing `computeBracketState(bracket: PlayoffBracket)` from `src/services/brackets/computeBracketState.ts` rather than duplicating logic. If its `PlayoffBracket` shape is awkward to assemble from `storage`, factor a small `isBracketComplete(matches, format)` helper alongside it that takes the lower-level match rows; keep the existing function intact.

### Backfill (optional, separate)
Existing brackets that already finished but were never marked completed will still have empty `playoff_team_records`. A one-shot admin action — call `bracketManagerService.calculateFinalStandings(bracketId)` plus the same UPDATE for any bracket whose matches are all done — can be added later. Not part of this PR.

## Files touched
- `src/services/brackets/manager/services/BracketUpdateService.ts` — append completion-detection block at end of `updateMatch`.
- (Optional) `src/services/brackets/computeBracketState.ts` — extract a row-level helper if needed.

## Verification
1. Existing bracket with one match left: enter the final score → check Supabase `brackets.state` flips to `completed` → console shows `useBracketCompletion` toast "Tournament Complete!" → `playoff_team_records` rows appear → `<FinalStandings>` renders.
2. Edit an already-completed bracket's earlier match score → `state` stays `completed` (no duplicate UPDATE thanks to `.neq`).
3. Double-elimination with reset match: completing championship without reset triggers state=completed only when WB champion wins; otherwise waits for the reset match.

## Risk
Low. Single additive write, guarded against re-firing, wrapped in try/catch so it cannot break the match-update flow. No schema change, no RLS change (admins are the only callers of `updateMatch`).
