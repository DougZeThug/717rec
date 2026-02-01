
# Plan: Fix Team Name Visibility in Playoff Bracket Creation (Revised)

## Root Cause Analysis

The previous fix applied `lg:max-w-none` to the team name, but this doesn't work because:

1. **Dialog constraint**: The `BracketCreationDialog` uses `max-w-2xl` (672px max width)
2. **Breakpoint mismatch**: `lg:` breakpoint (1024px) applies to the **viewport**, not the container
3. **Result**: Even on a 1440px desktop, the team buttons inside a 672px dialog still see `max-w-[120px]` applied because the button itself isn't 1024px wide

Looking at the screenshot, team names like "Bag Bombers", "Corn Dogs", and "Corn Kings" are truncated to just a few characters because the button layout gives priority to the seed badge and power score over the team name.

## Solution

### Approach 1: Widen the Dialog + Fix Layout (Recommended)

**Changes:**

| File | Line | Current | Change |
|------|------|---------|--------|
| `BracketCreationDialog.tsx` | 236 | `max-w-2xl` | `max-w-2xl lg:max-w-4xl` |
| `TeamSelectionForm.tsx` | 111 | `max-w-[120px] lg:max-w-none` | Remove truncation entirely |
| `TeamSelectionForm.tsx` | 94 | `min-w-[200px]` | `min-w-[240px]` |
| `TeamSelectionForm.tsx` | 265 | `xl:grid-cols-3` | Keep as 2 columns only: `sm:grid-cols-2` |

### Detailed Changes

#### 1. Widen the Dialog (BracketCreationDialog.tsx)

Current:
```tsx
<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
```

Change to:
```tsx
<DialogContent className="max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
```

This gives 896px on large screens instead of 672px, providing ~440px per button in a 2-column layout.

#### 2. Remove Name Truncation (TeamSelectionForm.tsx)

Current:
```tsx
<span className="font-medium truncate max-w-[120px] lg:max-w-none">
```

Change to:
```tsx
<span className="font-medium truncate flex-1 min-w-0">
```

This allows the name to flex and take available space while still truncating gracefully if truly needed.

#### 3. Increase Button Minimum Width (TeamSelectionForm.tsx)

Current:
```tsx
className={`flex items-center gap-2 p-3 h-auto justify-start min-w-0 overflow-hidden min-w-[200px]...`}
```

Change to:
```tsx
className={`flex items-center gap-2 p-3 h-auto justify-start overflow-hidden min-w-[240px]...`}
```

Note: Also remove duplicate `min-w-0` since we're setting a specific min-width.

#### 4. Lock to 2 Columns (TeamSelectionForm.tsx)

Current:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
```

Change to:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
```

With a wider dialog and minimum button width of 240px, 2 columns provides optimal readability. The 3-column option at xl would recreate the truncation problem.

## Visual Result

| Before | After |
|--------|-------|
| Dialog: 672px max | Dialog: 896px max on lg+ |
| Button: ~320px | Button: ~430px |
| Name: "Bag..." (truncated at 120px) | Name: "Bag Bombers" (uses flex space) |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/playoffs/BracketCreationDialog.tsx` | Widen dialog on lg screens |
| `src/components/playoffs/form/bracket-teams/components/TeamSelectionForm.tsx` | Fix button layout and name display |

## Technical Notes

- The `lg:` prefix on the dialog works because it's applied to the viewport, which IS 1024px+ on desktop
- Inside the wider dialog, the buttons get more space, so the flex layout gives more room to team names
- The `truncate flex-1 min-w-0` pattern is the standard Tailwind approach for "fill available space, truncate only if necessary"
- Increased gap from `gap-2` to `gap-3` improves visual separation
