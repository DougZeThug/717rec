

## Push Team 2 to the Right Side

### Problem
Team 2 (bottom row) has `flex-row-reverse` which puts the logo on the right of the name, but the entire row still sits on the left side of the card. It should be pushed to the right so the logo aligns roughly under the trash icon.

### Change

**File: `src/components/admin/mass-score-entry/components/TeamDisplay.tsx`**
- Add `justify-end` when `align === 'right'` so the content is pushed to the far right of the container

