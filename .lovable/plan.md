

## Add Season Toggle to View Historical Brackets on Playoffs Page

### What's Happening Now

The Playoffs page filters out all brackets with `state = 'completed'` (line 112 in `usePlayoffViewModel.compat.ts`). Since archived seasons have all their brackets marked as completed, those brackets are invisible. There are 19 completed brackets across 5 past seasons sitting in the database.

### The Fix

Add a season selector dropdown at the top of the Playoffs page. When the current season is selected, it shows active/pending brackets (current behavior). When a past season is selected, it shows that season's completed brackets instead.

### Changes

| File | What |
|---|---|
| `src/hooks/usePlayoffViewModel.compat.ts` | Remove the hardcoded `completed` filter. Instead, accept a `seasonId` parameter and filter brackets by season. When viewing the current season, still exclude completed brackets. When viewing a past season, show only completed brackets for that season. |
| `src/components/playoffs/hooks/usePlayoffPageData.ts` | Add `selectedSeasonId` state (defaults to current active season). Pass it down to `usePlayoffData`. Expose it and its setter in the `PlayoffPageData` interface. |
| `src/components/playoffs/layout/PlayoffPageLayout.tsx` | Render a season selector dropdown below the header, before the bracket list. Uses the seasons data to populate options. |
| New: `src/components/playoffs/SeasonSelector.tsx` | A simple dropdown component showing all seasons (current + archived). Displays season name, highlights the active one. When a past season is picked, the bracket list switches to show that season's completed brackets. |

### How It Works

1. User lands on Playoffs page → sees current season's active brackets (no change from today)
2. User clicks the season dropdown → sees list of all seasons (e.g., "Winter 2 2026 (Current)", "Winter 1 2026", "Fall 2025", etc.)
3. User picks "Winter 1 2026" → the bracket query re-runs filtered to that season, including completed brackets
4. The bracket list shows the historical brackets grouped by division, and clicking one opens the bracket viewer as usual

The bracket detail/viewer components don't need changes — they already handle completed brackets fine since they load data by bracket ID.

