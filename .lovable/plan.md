## Goal
Render the Team of the Week team logo as a square (with the existing rounded card corners), not a circle, everywhere the Team of the Week card appears.

## Changes

1. `src/components/home/TeamOfTheWeekCard.tsx`
   - Remove the `rounded` prop on `<TeamLogo>` so the logo renders as a square instead of a circle.
   - Change the hover glow div behind the logo from `rounded-full` to `rounded-xl` so the glow matches the new square shape.
   - Keep the amber/cyan ring, size, and hover behavior unchanged.

2. `src/components/home/TeamOfTheWeekSkeleton.tsx`
   - Change the logo skeleton from `rounded-full` to `rounded-xl` so the placeholder matches the new square shape.

## Out of scope
Other team logos across the app (standings, team pages, etc.) keep their current shape. Only the Team of the Week card + its skeleton change.
