

## Issue: The `archive_season` RPC Has Two Bugs That Will Break History

### Bug 1: Grand Final runner-up detection fails
The function on **line 69** looks for `match_type = 'finals'`, but your brackets only use `'winners'` and `'losers'`. The Grand Final is stored as `match_type = 'winners'` at the highest round number. This means the runner-up will never be detected — it silently returns NULL and skips the update.

**Fix**: Change the runner-up detection to find the loser of the highest-round `winners` match (where `winner_id = wb_champion_id`), which is the Grand Final.

### Bug 2: Only ranks 1-3 are set — past seasons ranked every team
Fall 2025's history page shows `playoff_rank` for **all teams** (ranks 1 through 15), not just the top 3. The current RPC only auto-detects champion, runner-up, and 3rd place. Every other team would show `#-` on the history page.

**Fix**: After setting ranks 1-3 from bracket data, auto-assign remaining teams ranks 4+ based on their elimination round in the bracket. Teams eliminated in earlier rounds get higher (worse) rank numbers. Teams eliminated in the same round share the same rank. Teams with no playoff matches get no rank (sorted by wins on the history page).

### How rank assignment works from bracket data
For each bracket in the season:
- Rank 1: `wb_champion_id` (already handled)
- Rank 2: Grand Final loser (fix needed)  
- Rank 3: Losers Final loser (already handled)
- Rank 4+: Derived from `playoff_matches` — the earlier a team was eliminated (lower round number), the worse their rank. Teams eliminated in the same round share a rank.

Specifically, walk through all completed `playoff_matches` for the bracket, find every team that lost, and assign ranks based on the round they lost in — losers from later rounds rank higher (better).

### Changes

| What | Change |
|---|---|
| `archive_season` RPC function | Fix `'finals'` → detect Grand Final from highest `winners` round. Add logic to assign ranks 4+ from elimination rounds. |

This is a single migration to `CREATE OR REPLACE` the function with the corrected logic. No frontend changes needed — the history page already reads `playoff_rank` and sorts by it.

