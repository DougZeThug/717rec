# Merge "D.Bags @ Marion" into "Toss D.Bag"

Combine the two teams into one. All history from D.Bags @ Marion moves to Toss D.Bag, then the old team is removed from the teams list.

This is a **data-only change** — no app code, no new tables. It runs as one all-or-nothing database operation.

## What you will see after

- One team: **Toss D.Bag** (same name, logo, division as today).
- Its history page shows **7 seasons**: Summer 1 2025, Summer 2 2025, Fall 2025, Winter 1 2026, Winter 2 2026, Spring 2026, Summer 1 2026.
- Career totals, power score, playoff results, badges, and past schedules from both teams show under Toss D.Bag.
- Roster stays **AJ, Ryan, Sam, Zai** (Todd is not carried over).
- "D.Bags @ Marion" no longer appears anywhere.

## Why this is safe

Checked the live data first:

- The two teams never played in the same season, so no season records collide.
- No schedule dates overlap between them.
- The old team currently holds 0 wins/losses on its live counters; all its real record lives in per-season stats, which move over intact.
- Each season keeps its own division label (Intermediate 2 / Intermediate), so old standings still read correctly.

## Steps

1. Move every record that points at D.Bags @ Marion to Toss D.Bag: season stats, playoff matches and records, archived matches, brackets/participants, timeslots, badges, ranking snapshots, team memberships, season signups.
2. Handle the roster: AJ and Ryan already exist on Toss D.Bag, so any game or round data recorded against the old AJ/Ryan is repointed to the Toss D.Bag versions, then the duplicate rows are dropped. Todd is dropped per your answer.
3. Merge the old team's counters into Toss D.Bag's live win/loss and game win/loss totals, then run the existing reconcile step so the numbers match the underlying matches exactly.
4. Delete the D.Bags @ Marion team row.
5. Verify: 7 seasons listed, no duplicate rows, no leftover references, standings and career pages load.

## Technical notes

- Old team id `abd71084-cf3f-431e-a57a-428cbe96b459` -> new team id `5df437df-d777-48d1-88ea-e41bc73bd095`.
- Tables updated: `team_season_stats`, `team_details_archive`, `ranking_snapshots`, `power_score_snapshots`, `playoff_matches` (team1/team2/winner/loser), `playoff_team_records`, `matches_archive`, `matches`, `participants`, `participant`, `team_timeslots`, `team_badge_events`, `team_memberships`, `season_team_participation`, `team_players`, `match_rounds` (thrower ids), `game_players`, `messages`, `teams`.
- Constraint-aware ordering: `participants (bracket_id, team_id)`, `team_badge_events (team_id, badge_type, season_id)`, `ranking_snapshots (team_id, season_id)`, `team_memberships (user_id)`, and `team_players (team_id, display_name)` are de-duplicated before or during the repoint so no unique constraint fires.
- `teams.players` text array is left as the Toss D.Bag list.
- Executed through the data-change tool inside a single transaction; a pre-merge count snapshot is taken and re-checked afterwards.
