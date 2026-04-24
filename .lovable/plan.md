## Goal
Allow the first Grand Final match in the Competitive bracket to save normally when both teams are present, instead of failing with “The match is locked.”

## What I found
- Your screenshot shows the Grand Final editor opening with a badge that says **Waiting / Not editable yet**, even though both teams are already in the match.
- The current save fix only unlocks matches when status is **5 = Archived**.
- `brackets-manager` also treats earlier statuses as locked. Its documented status enum is:
  - `0 = Locked`
  - `1 = Waiting`
  - `2 = Ready`
  - `3 = Running`
  - `4 = Completed`
  - `5 = Archived`
- In your app, the badge currently maps statuses incorrectly for the editor: it labels `1` as “Waiting” and says opponents are not determined, but your screenshot proves that status can still appear on a fully populated Grand Final match.
- The likely failure path is:
  1. Grand Final match has both participants
  2. Match status is still `0` or `1` instead of `2`
  3. Save calls `manager.update.match()`
  4. Library rejects it with “The match is locked.”

## Plan
1. Fix the save path for normal brackets-manager matches
- In `BracketUpdateService.updateMatch()`, expand the pre-save unlock logic.
- If a non-BYE match has both opponents present and status is below `2`, temporarily update it to `2 = Ready` before calling `manager.update.match()`.
- Keep the existing archived-match handling, but fold it into one safer “unlock when needed” rule:
  - `0/1 -> 2` for populated matches that are incorrectly still locked/waiting
  - `5 -> 4` for archived matches
- Do not change BYE handling.

2. Correct the editor badge messaging
- Update `MatchStatusBadge.tsx` so the label/description matches the library’s real meanings.
- Make the copy clearer for the real-world cases:
  - `0 Locked`: upstream prerequisite matches not finished
  - `1 Waiting`: one or more participants may still be pending, or the library has not promoted the match to Ready yet
  - `2 Ready`: editable now
  - `3 Running`: editable now
  - `4 Completed`: editable now
  - `5 Archived`: editable now because the service temporarily unlocks it
- This prevents misleading “Opponents not yet determined” text on populated finals.

3. Add a narrow safeguard for Grand Final edge cases
- When deciding whether a locked/waiting match can be promoted to Ready, require:
  - both opponents exist
  - this is not a BYE match
- This keeps the fix small and avoids enabling saves for truly incomplete matches.

4. Verify with focused checks
- Confirm the first Grand Final match can now save when it has both teams.
- Confirm genuinely incomplete matches still remain blocked.
- Confirm archived earlier-round matches still remain editable.
- Confirm the badge text matches the actual match state more accurately.

## Technical details
Files likely involved:
- `src/services/brackets/manager/services/BracketUpdateService.ts`
- `src/components/playoffs/match-score-editor/MatchStatusBadge.tsx`

Expected logic change:
```text
if BYE match:
  keep existing direct-SQL path
else if status === 5:
  temporarily set status to 4
else if status < 2 and both opponents exist:
  temporarily set status to 2
then call manager.update.match()
```

## Why this is the safest fix
- Small diff
- Leaves the bracket structure logic alone
- Uses the existing service-layer workaround pattern already in place
- Targets the actual library lock condition instead of only changing UI text