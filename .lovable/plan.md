# Stop streak badge flicker

## Result
Hot Streak and Cold Streak badges will stay fully visible. They will no longer pulse or flicker.

## Change
- Remove the repeating opacity animation from streak badges only.
- Keep each badge's color, icon, size, tooltip, tap action, and normal hover effect unchanged.
- Do not change other animated items in the app.

## Check
- Run the focused badge tests.
- Run the type and style checks.
- Confirm both streak badges remain steady in the preview.

## Technical detail
`TeamBadge` currently applies Tailwind's infinite `animate-pulse` class to `hot_streak` and `cold_streak`. The fix removes that conditional class and its now-unused check.
