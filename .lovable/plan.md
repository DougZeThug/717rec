

## Fix: Hidden Division Teams Missing from History Page

### What's happening

When a team is moved to the "Hidden" division, their past season history entries on the history page disappear. This affects 79 team-season rows across all archived seasons.

**Root cause**: Three places overwrite the frozen `division_name` in `team_season_stats` with the team's *current* division:

1. **`v_team_season_agg` view** — joins `teams.division_id` to get `division_name`, so it always reflects the team's current division, not the one they played in
2. **`upsert_team_season_stats()` RPC** — blindly overwrites `division_name` for all rows including archived seasons on every call
3. **`archive_season()` STEP 2** — stamps current division over history at archive time (so if a team was hidden before archival, it gets "Hidden" baked in permanently)

### What the migration will do (single SQL file, 4 parts)

**Part 1 — Fix the view**: Recreate `v_team_season_agg` so `division_name` uses `team_details_archive.divisionname` for archived seasons, falling back to the live `teams→divisions` join only for the active season.

**Part 2 — Fix the upsert**: Rewrite `upsert_team_season_stats()` so `ON CONFLICT DO UPDATE` skips updating `division_name` when the season is archived. Stats (wins, losses, etc.) still update normally.

**Part 3 — Fix archive_season**: Gate STEP 2's `UPDATE` so it won't stamp "Hidden" over an existing division_name. All other steps are unchanged.

**Part 4 — Repair corrupted data**: One-time `UPDATE` to restore 66 rows where `team_details_archive` has the correct historical division. A second pass infers division from opponent match data for ~4 more rows. The remaining ~9 rows (teams hidden before playing any matches in Fall 2025) cannot be automatically recovered — they'll need manual admin correction or will stay hidden for that season.

### Files

**New file**: `supabase/migrations/<timestamp>_fix_archived_division_name_preservation.sql`

**No application code changes** — the frontend filter in `SeasonAccordion.tsx` that hides "Hidden" division teams is correct; the data was wrong.

### Verification

- Before: pick a hidden team (e.g. "Mailmen") → history page Fall 2025 → team is missing
- After migration: same team appears under "Intermediate" in Fall 2025
- Smoke test: score a match in the active season → confirm archived seasons don't flip back to "Hidden"

