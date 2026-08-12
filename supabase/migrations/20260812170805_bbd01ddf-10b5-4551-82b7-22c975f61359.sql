-- Snapshot everything the power-score rollout can change, BEFORE it changes.
--
-- RUN THIS FIRST. It is timestamped ahead of 20260811210000 so a lexical apply
-- picks it up first, but if you are pasting by hand into the SQL Editor, this
-- file must go in before any of:
--
--   20260811210000_power_score_weighted_denominators.sql
--   20260812110000_fix_member_update_guard_is_hidden.sql
--   20260812120000_power_score_match_date.sql
--   20260812130000_power_score_historical_opponent_division.sql
--   20260812140000_power_score_formula_control_bypass.sql
--
-- Two kinds of state are at risk, and this captures both.
--
-- DATA. team_season_stats.power_score / .sos / .division_name are rewritten by
-- upsert_team_season_stats(), which takes no season parameter and re-derives
-- every season on every match finalize. Once a view changes, all history follows
-- on the next write. The row snapshots below are the way back.
--
-- DDL. The rollout replaces a chain of views and functions. Their definitions
-- are recoverable from git, but capturing them here makes a revert possible
-- entirely inside the database, with no repo checkout and no guessing about
-- which migration was last applied. Each captured definition is stored as a
-- ready-to-execute statement.
--
-- This is deliberately separate from the backup inside 20260812130000. That one
-- captures state after the denominator fix; this one captures state before
-- anything in the rollout has run. Both are useful, and they are different
-- points in time.
--
-- Idempotent: re-running will not overwrite an existing snapshot, so the
-- earliest capture always wins. To take a deliberate fresh snapshot, drop the
-- tables first.
--
-- Restore procedure: docs/POWER_SCORE_ROLLOUT.md.

-- ---------------------------------------------------------------------------
-- 1. Data snapshots.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.team_season_stats_pre_power_rollout AS
SELECT *, now() AS backed_up_at
FROM public.team_season_stats;

COMMENT ON TABLE public.team_season_stats_pre_power_rollout IS
  'Full copy of team_season_stats taken before the 20260811210000-20260812140000 '
  'power-score rollout. Primary restore source. Safe to drop once the new '
  'numbers have been accepted on the live site.';

-- The rendered standings numbers, so a before/after comparison does not depend
-- on recomputing anything.
CREATE TABLE IF NOT EXISTS public.team_details_pre_power_rollout AS
SELECT
  team_id,
  name,
  divisionname,
  wins,
  losses,
  game_wins,
  game_losses,
  win_percentage,
  game_win_percentage,
  weighted_win_percentage,
  weighted_game_win_percentage,
  sos,
  power_score,
  now() AS backed_up_at
FROM public.v_team_details;

COMMENT ON TABLE public.team_details_pre_power_rollout IS
  'Snapshot of the live standings numbers before the power-score rollout, for '
  'before/after comparison.';

-- ---------------------------------------------------------------------------
-- 2. DDL snapshot.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.power_score_rollout_ddl_backup (
  object_name text PRIMARY KEY,
  object_type text NOT NULL,
  definition  text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.power_score_rollout_ddl_backup IS
  'Executable CREATE statements for every view and function the power-score '
  'rollout replaces, captured before it ran. definition can be passed straight '
  'to EXECUTE. Recreate views in the order given by docs/POWER_SCORE_ROLLOUT.md '
  '-- dependencies are not encoded here.';

-- Views. pg_get_viewdef returns only the SELECT body and drops the view
-- options, so security_invoker is reattached from reloptions -- without it a
-- restored view would silently run with owner rights.
INSERT INTO public.power_score_rollout_ddl_backup (object_name, object_type, definition)
SELECT
  c.relname,
  'view',
  'CREATE OR REPLACE VIEW public.' || quote_ident(c.relname)
    || CASE
         WHEN c.reloptions IS NOT NULL
           THEN ' WITH (' || array_to_string(c.reloptions, ', ') || ')'
         ELSE ''
       END
    || ' AS ' || pg_get_viewdef(c.oid, true)
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'v'
  AND c.relname = ANY (ARRAY[
    'v_power_score_match_source',
    'v_power_score_match_source_current',
    'v_power_score_team_matches',
    'v_power_score_components',
    'v_power_score_components_current',
    'v_team_match_stats',
    'v_team_details',
    'v_team_details_with_season',
    'v_team_power_scores',
    'v_team_season_agg'
  ])
ON CONFLICT (object_name) DO NOTHING;

-- Functions. pg_get_functiondef is already executable as-is.
INSERT INTO public.power_score_rollout_ddl_backup (object_name, object_type, definition)
SELECT
  p.proname,
  'function',
  pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = ANY (ARRAY[
    'upsert_team_season_stats',
    'power_score_100',
    'admin_revert_power_score_unification',
    'admin_reapply_power_score_unification',
    'prevent_member_competitive_field_updates'
  ])
ON CONFLICT (object_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Lock the backups down. They duplicate data the app can already read, but
--    nothing should query them from the client.
-- ---------------------------------------------------------------------------
ALTER TABLE public.team_season_stats_pre_power_rollout ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_details_pre_power_rollout      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.power_score_rollout_ddl_backup      ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.team_season_stats_pre_power_rollout FROM anon, authenticated;
REVOKE ALL ON public.team_details_pre_power_rollout      FROM anon, authenticated;
REVOKE ALL ON public.power_score_rollout_ddl_backup      FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Prove the snapshot is real before trusting it.
--
-- Fails loudly rather than leaving an empty backup that looks like success.
-- Skipped on a database with no stats at all, which is the CI replay case.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_live   bigint;
  v_backup bigint;
  v_ddl    bigint;
BEGIN
  SELECT count(*) INTO v_live   FROM public.team_season_stats;
  SELECT count(*) INTO v_backup FROM public.team_season_stats_pre_power_rollout;
  SELECT count(*) INTO v_ddl    FROM public.power_score_rollout_ddl_backup;

  IF v_live > 0 AND v_backup < v_live THEN
    RAISE EXCEPTION
      'Backup is incomplete: team_season_stats has % rows but the snapshot has %. '
      'Do not proceed with the rollout.', v_live, v_backup;
  END IF;

  IF v_live > 0 AND v_ddl = 0 THEN
    RAISE EXCEPTION
      'No view or function definitions were captured. Do not proceed with the rollout.';
  END IF;

  RAISE NOTICE
    'power-score rollout backup: % stat rows, % object definitions captured',
    v_backup, v_ddl;
END $$;