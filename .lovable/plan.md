
# Plan: Wider Container with 3-Column Layout

## Summary

Keep 3 columns for team selection but make the dialog container larger on desktop to ensure team names remain fully visible.

## Changes

### File: `src/components/playoffs/BracketCreationDialog.tsx`

| Line | Current | Change |
|------|---------|--------|
| 236 | `max-w-2xl lg:max-w-4xl` | `max-w-2xl lg:max-w-5xl xl:max-w-6xl` |

This gives:
- Mobile/tablet: 672px max (unchanged)
- Large desktop (1024px+): 1024px max
- Extra large (1280px+): 1152px max

### File: `src/components/playoffs/form/bracket-teams/components/TeamSelectionForm.tsx`

| Line | Current | Change |
|------|---------|--------|
| 265 | `grid-cols-1 sm:grid-cols-2 gap-3` | `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3` |

Restores 3 columns on large screens.

## Result

| Screen Size | Dialog Width | Columns | Button Width |
|-------------|--------------|---------|--------------|
| Mobile | ~100% | 1 | Full width |
| Tablet (640px+) | 672px | 2 | ~320px |
| Desktop (1024px+) | 1024px | 3 | ~320px |
| Large Desktop (1280px+) | 1152px | 3 | ~370px |

With 240px minimum button width and flex layout for team names, all team names should be fully visible in 3 columns on desktop.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/playoffs/BracketCreationDialog.tsx` | Widen dialog to max-w-5xl/6xl |
| `src/components/playoffs/form/bracket-teams/components/TeamSelectionForm.tsx` | Restore lg:grid-cols-3 |
