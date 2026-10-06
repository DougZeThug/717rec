-- Snapshot team_season_stats before 20261006120000_exclude_ties_from_win_rate.sql.
--
-- NOT A MIGRATION. Paste it into the Supabase SQL Editor and run it once,
-- immediately BEFORE the migration. See docs/OPERATIONS.md section 6e.
--
-- The snapshot is for the before/after check only. Do not restore scores from
-- it: matches played after the snapshot would lose their ratings. To undo the
-- change, run supabase/scripts/revert_tie_exclusion.sql, which recomputes from
-- match history instead.
--
-- Safe to re-run: CREATE TABLE IF NOT EXISTS keeps the FIRST snapshot.
-- Drop the table once Doug accepts the new numbers:
--   DROP TABLE public.team_season_stats_pre_tie_exclusion;

CREATE TABLE IF NOT EXISTS public.team_season_stats_pre_tie_exclusion AS
SELECT season_id, team_id, match_wins, match_losses, game_wins, game_losses,
       division_name, playoff_rank, power_score, sos, champion, runner_up,
       recorded_at, career_power_score, now() AS backed_up_at
FROM public.team_season_stats;

REVOKE ALL ON public.team_season_stats_pre_tie_exclusion FROM PUBLIC, anon, authenticated;
ALTER TABLE public.team_season_stats_pre_tie_exclusion ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.team_season_stats_pre_tie_exclusion TO service_role;

COMMENT ON TABLE public.team_season_stats_pre_tie_exclusion IS
  'team_season_stats as it stood before ties left the win-rate denominators '
  '(20261006120000). Before/after check only; never a restore source.';

DO $$
DECLARE
  v_backup bigint;
  v_live   bigint;
BEGIN
  SELECT count(*) INTO v_backup FROM public.team_season_stats_pre_tie_exclusion;
  SELECT count(*) INTO v_live   FROM public.team_season_stats;
  RAISE NOTICE 'tie-exclusion backup: % rows saved, % rows live (the two must match on a first run)',
    v_backup, v_live;
END $$;
