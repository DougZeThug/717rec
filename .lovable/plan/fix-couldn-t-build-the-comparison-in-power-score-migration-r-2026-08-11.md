# Fix "Couldn't build the comparison" in Power Score Migration Review

## What is wrong

**The two backup-reader database functions declare the wrong column types, so they fail every time.**

Confirmed in the live database:

- `admin_get_pre_unification_team_power()` says it returns `wins, losses, game_wins, game_losses` as **bigint**, but the backup table `team_details_power_pre_unification` stores them as **numeric**.
- `admin_get_pre_unification_season_stats()` says it returns `playoff_rank` as **integer**, but `team_season_stats_pre_unification` stores it as **smallint**.

Postgres rejects this with "structure of query does not match function result type" (code 42804). That code is not in the app's "migration not applied yet" list, so the panel shows the red **Couldn't build the comparison** message. The status card above it still works because it uses a different function.

## The fix

One database-only migration. No frontend code changes.

- Recreate `admin_get_pre_unification_team_power()` with explicit casts: `b.wins::bigint`, `b.losses::bigint`, `b.game_wins::bigint`, `b.game_losses::bigint`.
- Recreate `admin_get_pre_unification_season_stats()` with `b.playoff_rank::integer`.
- Keep everything else identical: `SECURITY DEFINER`, `STABLE`, `SET search_path = 'pg_catalog','public'`, the `current_user_is_admin()` guard, and the existing `EXECUTE` grant to `authenticated` only.

## Verification

- Re-run both functions and confirm they return rows (247 season rows, 49 team rows expected).
- Reload the Admin > Power Score Migration Review tab and confirm the before/after Career Standings table renders instead of the error.