## Goal
Make the Grand Final visually show newly populated teams when the `match` table changes, including changes made by SQL/admin repair and future automatic GF repair.

## What I found
- Supabase now has the correct Grand Final row:
  - `match.id = 2659`
  - `opponent1 = Smooth Sliders`
  - `opponent2 = The Triple Nipple`
  - `status = 2` / Ready
- The bracket viewer is still showing `-` because the rendered viewer is not being forced to reload/re-render when opponent IDs change in the `match` table.
- There is also a render-skip fingerprint that only compares match IDs and scores/results, so opponent changes can be treated as “no change.”

## Plan
1. **Wire live match updates into the bracket viewer**
   - Use the existing realtime hook’s `lastUpdate` value in `BracketView`.
   - Pass it down to `BracketsViewerComponent` as a refresh signal.
   - When the `match` table updates, the viewer will run its SQL transform again.

2. **Fix the viewer’s “same data” check**
   - Update the bracket viewer fingerprint to include:
     - `opponent1.id`
     - `opponent2.id`
     - `status`
     - scores/results
   - This prevents the viewer from skipping a render when teams populate but scores are still blank.

3. **Keep the change small and safe**
   - Only touch the playoff bracket viewer path.
   - No schema changes.
   - No new SQL.
   - No changes to bracket advancement logic.

4. **Add/update focused tests**
   - Confirm realtime match updates pass a refresh signal into the viewer.
   - Confirm the viewer refresh signal changes the rendered container key / render cycle.
   - Confirm opponent-ID changes are included in the fingerprint behavior where practical.

## How you’ll verify
After the fix ships:
1. Open the Intermediate Spring 2026 bracket.
2. Hard refresh once if the old viewer is already open.
3. The Grand Final should show Smooth Sliders vs The Triple Nipple instead of `-` / `-`.
4. Future WB/LB Final completions should update the GF visually without needing Recalculate Standings.