## Plan

### What I’ll fix
1. Repair the incorrect archived data for Winter 2 2026.
2. Make playoff finalization stop depending on missing `wb_champion_id` values.
3. Preserve the correct historical division for teams that later moved to Hidden or another division.

### What I found
- Winter 2 is already marked archived, but all three winner fields on `seasons` are still empty.
- All three Winter 2 brackets have `wb_champion_id = NULL`, so `finalize_playoffs()` skipped champion/rank assignment entirely.
- The History page reads from `team_season_stats`, and every Winter 2 row currently has `champion = false` and `playoff_rank = NULL`, which is why it shows “No champion.”
- Several teams that played Winter 2 were archived with `division_name = Hidden` because their current team division was used instead of their playoff/season snapshot.
- Bracket participation shows the correct historical placements, for example:
  - Competitive bracket included Hidden-now teams like Offdogs, Jager Bombers, Came from Dicks.
  - Intermediate bracket included Hidden-now teams like Toss D.Bag and Miracle @ Marion.
  - Recreational bracket included Cornelius Bag even though that team is currently Intermediate.

### Implementation steps
1. **Harden the `finalize_playoffs` SQL function**
   - Change the champion/rank logic to derive winners from actual `playoff_matches` instead of requiring `brackets.wb_champion_id`.
   - Use the latest completed/decided finals data per bracket to determine champion and runner-up.
   - Derive third place from the latest losers-bracket elimination.
   - Continue assigning bracket-aware division names using `participants`, so historical placement follows the bracket the team actually played in.

2. **Add a targeted Winter 2 data repair migration**
   - Recompute Winter 2 champions, runner-up, third-place, playoff ranks, and historical division names.
   - Update all three affected data stores so they agree:
     - `seasons`
     - `team_season_stats`
     - `team_details_archive`
   - Repair only the archived Winter 2 season rows, so this stays a small, safe fix.

3. **Preserve correct historical divisions for archived seasons**
   - Ensure the repair writes division snapshots from bracket participation / season snapshot data, not the team’s current division.
   - This will restore missing teams to the correct History sections and prevent “Hidden” from swallowing legitimate past teams.

4. **Verify the repaired result**
   - Confirm the History page can now show champions and full team lists for Winter 2.
   - Confirm the season-level winners are populated as:
     - Competitive: Cuzzo’s Clinic
     - Intermediate: The Triple Nipple
     - Recreational: On a Mission
   - Confirm all Winter 2 teams appear in the correct historical division buckets.

## Technical details
- Root cause 1: `finalize_playoffs()` loops only over brackets where `wb_champion_id IS NOT NULL`. For Winter 2, all three brackets have `NULL`, so no champion/rank updates ran.
- Root cause 2: archived division snapshots for some teams were taken from current team/division state instead of authoritative season/bracket participation, causing Hidden and wrong-division history rows.
- The UI itself appears to be reading the repaired fields correctly already, so this should mainly be a backend/data correction with light validation in the app.

If you approve, I’ll implement the SQL hardening + Winter 2 repair, then verify the corrected winners and divisions end-to-end.