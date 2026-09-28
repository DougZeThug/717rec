# Stop the losers-bracket "Rearrange" from saying "saved" when nothing saved

## What I checked

- **The report is correct.** The Rearrange save checks only for a database error. When the security rules block a change, the database sends no error and changes 0 rows. The screen then says "Teams rearranged", but the bracket did not change.
- The "Edit teams" tool already has a safe save step that fails when 0 rows change. Rearrange does not use it.

## The fix

1. Rearrange saves each match with the same safe step as "Edit teams".
2. If the first save changes nothing, the admin sees: "Not saved — only admins can edit brackets. Nothing was changed."
3. If a later save fails after earlier saves worked, the admin sees that the change is half done and to run Repair Bracket.
4. Nothing else changes for a normal admin save.

## Technical details

- `rearrange/apply.ts`: replace the bare `update().eq()` loop with `updateMatchRowOrThrow(write.matchId, write.fields, NOT_SAVED_MESSAGE)`, and wrap failures after index 0 in a `BusinessLogicError` that says the change is half done and names Repair Bracket (same pattern as `editTeams/apply.ts`).
- New test `rearrange/__tests__/apply.test.ts`: zero rows on first write rejects with the not-saved message; zero rows on a later write rejects with the half-done message; normal rows resolve with `changedMatchIds`.

## Verify

- `npm run test:file` on the new test and the existing rearrange tests.
- `npm run typecheck` and `npm run lint`.
