

## Widen Score Buttons to Fit All 4 in One Row on Mobile

### Problem
The score buttons wrap to a second row on mobile because the card has `p-4` padding and the buttons use `min-w-[3.5rem]` with `flex-wrap`. On a 360px viewport, 4 buttons + gaps + padding don't fit in one line.

### Changes

**File 1: `src/components/admin/mass-score-entry/MatchRow.tsx`**
- Reduce horizontal padding from `p-4` to `px-3 py-4` to reclaim ~8px of horizontal space on each side

**File 2: `src/components/admin/mass-score-entry/components/ScoreButtonGroup.tsx`**
- Change the button container from `flex gap-1.5 sm:gap-3 flex-wrap` to `grid grid-cols-4 gap-1.5 sm:gap-3` so all 4 buttons always sit in one row and expand equally to fill the width

**File 3: `src/components/admin/mass-score-entry/components/ScoreButton.tsx`**
- Change `min-w-[3.5rem]` to `w-full` so buttons fill their grid cell instead of having a fixed minimum width

