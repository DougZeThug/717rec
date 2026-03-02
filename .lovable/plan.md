

## Fix History Page: Missing Teams and Merged Intermediate Divisions

### What's Wrong

Two issues affecting all pre-Winter 2026 seasons:

1. **Missing teams**: Many teams were archived with `division_name = 'Hidden'` in `team_season_stats`. The history page filters out "Hidden" divisions, so these teams disappear entirely. For example, Fall 2025 has 22 out of 43 teams hidden.

2. **Merged Intermediate divisions**: Seasons with separate Intermediate 1 and Intermediate 2 playoff brackets show all intermediate teams in a single "Intermediate" table instead of two.

### Root Cause

The old archival process assigned `division_name` based on the team's base `division_id` from the `teams` table. Teams in divisions like "cuspers" or "Recreational High" got mapped to "Hidden" because those internal division names weren't recognized. The bracket-aware naming (which correctly assigns "Intermediate 1", "Intermediate 2", etc. based on actual bracket participation) was only added recently and first used for Winter 1 2026.

### Fix: One-Time Data Repair Migration

A SQL migration to update `team_season_stats.division_name` for all affected seasons:

**Fall 2025** (has bracket participant data):
- Update division_name using the `participants` + `brackets` tables to map each team to its actual bracket
- Extract division name from bracket title: "Intermediate 1 Fall 2025" → "Intermediate 1", "Competitive Fall 2025" → "Competitive", etc.
- Teams not in any bracket: fall back to `team_details_archive.divisionname`

**Spring 2025, Summer 1 2025, Summer 2 2025** (no participant data in brackets):
- Update division_name using `team_details_archive.divisionname` for all teams currently marked "Hidden"
- These seasons can't be split into Int 1/Int 2 (no bracket participant records exist), but at least all teams will show up under the correct general division (Competitive, Intermediate, Recreational)

### Changes

| What | Change |
|---|---|
| New migration (data fix) | UPDATE `team_season_stats.division_name` for 4 seasons using bracket participants (Fall 2025) and `team_details_archive` (Spring/Summer seasons) |

No frontend or RPC changes needed — the existing display logic already handles "Intermediate 1" / "Intermediate 2" names correctly.

