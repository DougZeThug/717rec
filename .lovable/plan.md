
# Plan: Fix Team Name Visibility in Playoff Bracket Creation

## Problem

On desktop view, team names in the playoff bracket creation component are being truncated to just a few characters (e.g., "Bag...", "B...", "Corn...") making them nearly impossible to read. This happens because:

1. **3-column grid** on large screens (`lg:grid-cols-3`) creates narrow button widths
2. **`truncate` class** on team names clips text with ellipsis
3. **Fixed-width elements** (logo, seed badge, power score) consume available space, leaving little room for names

## Solution

Reduce the grid to 2 columns on desktop and improve the button layout to prioritize team name visibility while preserving all necessary information.

### Changes to Make

**File: `src/components/playoffs/form/bracket-teams/components/TeamSelectionForm.tsx`**

| Line | Current | Change |
|------|---------|--------|
| 265 | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` | `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3` |
| 94 | Compact button padding | Add `min-w-[200px]` to ensure minimum width |
| 111 | `truncate` on team name | Use `truncate` with `max-w-[140px] lg:max-w-none` to allow full names on larger screens |

### Detailed Implementation

1. **Adjust grid breakpoints** - Change `lg:grid-cols-3` to `xl:grid-cols-3` so 3 columns only appear on extra-large screens (1280px+), giving more space per button on typical desktop sizes

2. **Ensure minimum button width** - Add `min-w-[200px]` to buttons so they never shrink too small

3. **Responsive team name width** - Remove hard truncation on desktop by using `lg:max-w-none` which allows the name to use available space on larger screens

4. **Simplify seed badge** - Update SeedStatusBadge to hide extra text ("Manual", "Pending") at small sizes since the icon already conveys this information

## Visual Result

| Before | After |
|--------|-------|
| "Bag..." | "Bag Bombers" |
| "Corn..." | "Corn Kings" |
| "B..." | "Believers" |

Teams will display their full names on desktop while maintaining the compact layout on mobile. All other information (logos, seeds, power scores) remains visible.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/playoffs/form/bracket-teams/components/TeamSelectionForm.tsx` | Adjust grid columns, button min-width, and team name truncation |
| `src/components/playoffs/form/bracket-teams/components/SeedStatusBadge.tsx` | Hide extra text at `sm` size for compactness |
