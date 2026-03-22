

## Fix: Weekly Recap showing wrong week and pulling all-season upsets

### Root Cause

All regular-season matches have `round_number = 0`. The current code uses `round_number` to determine the "current week" and filter matches — so it gets week 0 and pulls ALL completed matches across the entire season as upsets.

### How weeks actually work

Matches are played on specific dates in weekly clusters (e.g. Mar 5-6, Mar 12-13, Mar 19-20). The correct "week" is derived from the season's `start_date` (2026-03-05), matching the logic in `useSeasonWeek.ts`.

### Changes

**File: `src/services/WeeklyRecapService.ts`**

Replace the week detection and upset filtering logic:

1. **Determine "latest match week" by date, not round_number:**
   - Find the most recent `date` from completed regular-season matches
   - Calculate the week number from the season's `start_date` using the same formula as `useSeasonWeek`: `Math.floor(daysDiff / 7) + 1`

2. **Filter upsets to only that week's matches:**
   - Compute the start-of-week date (season start + (weekNumber-1) * 7 days)
   - Compute end-of-week date (start + 7 days)
   - Filter `_fetchUpsets` by date range instead of `round_number`

3. **Pass date range to `_fetchUpsets` instead of round_number:**
   - Change signature from `(seasonId, weekNumber)` to `(seasonId, weekStart, weekEnd)`
   - Replace `.eq('round_number', weekNumber)` with `.gte('date', weekStart).lt('date', weekEnd)`

### Concrete logic

```text
seasonStart = season.start_date  (2026-03-05)
latestMatchDate = max(date) from completed matches
weekNumber = floor((latestMatchDate - seasonStart) / 7 days) + 1
weekStart = seasonStart + (weekNumber - 1) * 7 days
weekEnd   = weekStart + 7 days

_fetchUpsets filters: .gte('date', weekStart).lt('date', weekEnd)
```

For week 3: weekStart = Mar 19, weekEnd = Mar 26 — captures exactly the Mar 19-20 matches.

No changes needed to `WeeklyRecapCard.tsx` or any other file.

