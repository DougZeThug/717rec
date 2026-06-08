## Problem
`submitTeamRequest` destructures `{ data: season }` from the `seasons` query inside a `Promise.all`, discarding the `error` field. Real database failures (timeouts, permissions, etc.) are silently ignored, the request is inserted with a missing `season_id`, and the UI shows a success toast.

## Files to Change
- `src/services/teams/TeamRequestService.ts` — fix error handling in `submitTeamRequest`
- `src/services/teams/__tests__/TeamRequestService.test.ts` — add test for season query failure

## Changes

1. **TeamRequestService.ts**: Stop destructuring the seasons result. Instead, capture the full result object, switch `.single()` to `.maybeSingle()`, and explicitly call `handleDatabaseError` if `seasonResult.error` is present. If there is no active season (`seasonResult.data` is null), `season_id` should still be set to `null` and the insert should proceed — only real database errors should throw.

2. **Test file**: Add a new test case that mocks the seasons query to return a real database error and asserts that `submitTeamRequest` rejects with `DatabaseError`.

## Verification
- Run `npm run test:file -- src/services/teams/__tests__/TeamRequestService.test.ts` and confirm all tests pass, including the new one.
- Ensure existing behavior is preserved: when no active season exists (zero rows), the request still submits successfully with `season_id: null`.