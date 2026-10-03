# Make playoff score editing usable on a phone

## The problem

The playoff score editor opens in a pop-up box that is at most 90% of the screen tall and scrolls inside itself. The **Save Scores** button sits at the very bottom of the form, under the header and every game row. On a phone held upright, the button is below the fold — and when the on-screen keyboard opens, the visible area shrinks even more, so the button can be unreachable.

## The fix

Keep the Save / Cancel buttons glued to the bottom of the pop-up so they are always visible, no matter how long the form is.

### Changes

1. **`PlayoffDialogs.tsx`** — the score editor pop-up:
   - On phones, let the pop-up use nearly the full screen height (`max-h-[95dvh]`) so more of the form fits.
   - Turn the pop-up into a column layout: the form scrolls in the middle, the button row stays fixed at the bottom.

2. **`MatchScoreActions.tsx`** — the button row:
   - Make it sticky at the bottom of the scrolling area (`sticky bottom-0` with a background so scores don't show through).
   - On phones, stack the buttons full-width (Save on top, Cancel below) so both are easy to tap; keep the current side-by-side row on larger screens.

3. **`MatchScoreEditor.tsx`** — small spacing tweaks so the sticky bar does not cover the last game row (extra padding at the bottom of the scroll area).

4. Same treatment for the **Quick Score Editor** pop-up if its buttons have the same problem (checked during the work).

### What does not change

- How scores are validated or saved.
- The desktop look beyond the pop-up height tweak.
- Any bracket logic.

## How to check

- Open Playoffs on a phone-size preview, tap a match to edit its score: the Save Scores button is visible without scrolling, even with several game rows.
- Type a score with the on-screen keyboard open: the button is still reachable.
- Run the playoff score editor tests; type check and style check stay clean.

## Technical details

- Files: `src/components/playoffs/dialogs/PlayoffDialogs.tsx`, `src/components/playoffs/match-score-editor/MatchScoreEditor/components/MatchScoreActions.tsx`, `src/components/playoffs/match-score-editor/MatchScoreEditor/MatchScoreEditor.tsx`, possibly `QuickScoreEditor`.
- Pattern: `sticky bottom-0` footer inside the dialog's scroll container, matching the existing playoffs sticky-bottom-bar mobile pattern.
- Tests: update/extend the match-score-editor tests to assert the action bar is rendered with the sticky classes; run the playoffs test group.
