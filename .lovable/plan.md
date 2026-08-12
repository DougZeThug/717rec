# Apply backup-only migration: 20260811205000_power_score_rollout_backup.sql

## What this plan does

Apply exactly one SQL migration from the repo, verbatim:

- File: `supabase/migrations/20260811205000_power_score_rollout_backup.sql`
- No frontend or backend code changes.
- No other migration is applied.

## What the migration does

The migration is backup-only. It creates three snapshot tables:

1. `public.team_season_stats_pre_power_rollout` — full copy of `team_season_stats`.
2. `public.team_details_pre_power_rollout` — copy of rendered standings from `v_team_details`.
3. `public.power_score_rollout_ddl_backup` — captured `CREATE` statements for views and functions that the power-score rollout replaces.

It then enables RLS on those tables and revokes all access from `anon` and `authenticated` roles. Finally, it verifies the snapshot is complete and prints a NOTICE.

## Verification after migration

1. Confirm the NOTICE line matches:
   ```text
   power-score rollout backup: N stat rows, 15 object definitions captured
   ```
2. Confirm the query returns matching live and backup rows and non-zero DDL rows:
   ```sql
   SELECT (SELECT count(*) FROM public.team_season_stats)                    AS live_rows,
          (SELECT count(*) FROM public.team_season_stats_pre_power_rollout)  AS backup_rows,
          (SELECT count(*) FROM public.power_score_rollout_ddl_backup)       AS ddl_rows;
   ```
