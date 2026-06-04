## Problem
The `ChallongeFallback` embeds render below the `PlayoffViewSelector` (which contains the bracket manager brackets) on the Playoffs page. The user wants the Challonge fallback brackets to appear **above** the bracket manager brackets.

## Fix
In `src/components/playoffs/layout/PlayoffPageLayout.tsx`, move the `ChallongeFallback` block to render **before** `<PlayoffViewSelector>` instead of after it.

### Current order in JSX:
1. `PlayoffHeader`
2. `SeasonSelector`
3. `PlayoffViewSelector` (bracket manager brackets)
4. `ChallongeFallback` (Challonge embeds) ← **move this up**
5. `RealtimeIndicator`

### Target order:
1. `PlayoffHeader`
2. `SeasonSelector`
3. `ChallongeFallback` (Challonge embeds) ← **here**
4. `PlayoffViewSelector` (bracket manager brackets)
5. `RealtimeIndicator`

### Files changed
- `src/components/playoffs/layout/PlayoffPageLayout.tsx` — relocate the conditional `ChallongeFallback` render block.

No other files or logic changes needed.