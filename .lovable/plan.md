

## Plan: Fix INFO-Level Linter Warnings (Indexes + Auth Connection)

These are all INFO-level, not security or correctness issues. They're minor performance optimizations.

### 1. Add missing foreign key indexes (29 indexes)

Foreign key columns without indexes cause slow DELETE/UPDATE cascades and slow joins. One migration to add all missing indexes:

- `match`: `group_id` (covers both `fk_match_group` and `match_group_id_fkey`)
- `matches`: `bracket_id`
- `participants`: `team_id`
- `playoff_games`: `winner_id`
- `playoff_matches`: `team1_id`, `team2_id`, `loser_id`, `next_lose_match_id`, `next_win_match_id`, `winner_id` (note: `team1_id` and `team2_id` each have two FK constraints pointing to the same column -- one index per column is sufficient)
- `playoff_team_records`: `bracket_id`
- `power_score_snapshots`: `division_id`
- `score_submissions`: `match_id`, `reviewed_by`
- `season_team_participation`: `submitted_by`, `team_id`
- `seasons`: `champion_team_id`, `runner_up_team_id`, `third_place_team_id`
- `team_analysis`: `created_by`, `updated_by`
- `team_memberships`: `approved_by`
- `team_requests`: `season_id`
- `team_season_opt_out`: `season_id`
- `team_season_stats`: `team_id`
- `team_stats`: `team_id`

### 2. Drop unused indexes (20 indexes)

These indexes consume storage and slow down writes but have never been used:

- `brackets`: `idx_brackets_bracket_data`, `idx_brackets_division_id`, `idx_brackets_migrated`, `idx_brackets_wb_champion_id`
- `debug_match_updates`: `idx_debug_match_updates_user_id`
- `messages`: `idx_messages_team_created`, `idx_messages_user_created`, `idx_messages_user_id`
- `participant`: `idx_participant_team_id`, `idx_participant_position`, `idx_participant_tournament`
- `participants`: `idx_participants_tournament`
- `seasons`: `idx_seasons_is_archived`
- `power_score_snapshots`: `idx_snapshots_team_season`
- `team_memberships`: `idx_team_memberships_is_approved`, `idx_team_memberships_team`
- `match_reactions`: `match_reactions_match_id_idx`
- `matches_archive`: `matches_archive_iscompleted_idx`
- `team_requests`: `idx_team_requests_team_id`, `idx_team_requests_created_at`

### 3. Auth DB connection strategy -- skip

This is a Supabase infrastructure setting (switch from absolute to percentage-based connection allocation). It cannot be changed via migration -- it's configured in the Supabase dashboard under project settings. I'll note this for you but won't include it in the migration.

### What changes

- **1 migration file** -- CREATE INDEX + DROP INDEX statements only, no schema or data changes
- **0 code changes**

