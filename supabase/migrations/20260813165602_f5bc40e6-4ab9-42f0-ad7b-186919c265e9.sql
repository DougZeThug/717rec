-- Earned-schedule power score: SOS points are now earned, not free.
-- Teams below 30% performance (weighted match win + weighted game win blend)
-- only receive a proportional fraction of their strength-of-schedule credit.
-- Teams above 30% performance are unchanged.

-- 1. Data snapshots before the formula changes.
CREATE TABLE IF NOT EXISTS public.team_season_stats_pre_floor_adjustment AS
SELECT *, now() AS backed_up_at
FROM public.team_season_stats;

COMMENT ON TABLE public.team_season_stats_pre_floor_adjustment IS
  'Full copy of team_season_stats taken before the 2026-08-13 floor-adjustment '
  'so the old numbers can be restored if the new spread is rejected.';

CREATE TABLE IF NOT EXISTS public.team_details_pre_floor_adjustment AS
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

COMMENT ON TABLE public.team_details_pre_floor_adjustment IS
  'Snapshot of the live standings numbers before the 2026-08-13 floor-adjustment, '
  'for before/after comparison.';

-- 2. Lock the backup tables down.
ALTER TABLE public.team_season_stats_pre_floor_adjustment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_details_pre_floor_adjustment      ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.team_season_stats_pre_floor_adjustment TO service_role;
GRANT ALL ON public.team_details_pre_floor_adjustment      TO service_role;

REVOKE ALL ON public.team_season_stats_pre_floor_adjustment FROM anon, authenticated;
REVOKE ALL ON public.team_details_pre_floor_adjustment      FROM anon, authenticated;

-- 3. DDL snapshot of the previous power_score_100 definition so it can be restored in-place.
CREATE TABLE IF NOT EXISTS public.power_score_floor_ddl_backup (
  object_name text PRIMARY KEY,
  object_type text NOT NULL,
  definition  text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.power_score_floor_ddl_backup TO service_role;
REVOKE ALL ON public.power_score_floor_ddl_backup FROM anon, authenticated;

COMMENT ON TABLE public.power_score_floor_ddl_backup IS
  'Executable definition of public.power_score_100() before the floor adjustment.';

INSERT INTO public.power_score_floor_ddl_backup (object_name, object_type, definition)
VALUES (
  'power_score_100',
  'function',
  pg_get_functiondef((SELECT oid FROM pg_proc WHERE proname = 'power_score_100' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')))
)
ON CONFLICT (object_name) DO NOTHING;

-- 4. Replace the power-score formula.
CREATE OR REPLACE FUNCTION public.power_score_100(p_weighted_win_pct numeric, p_sos numeric, p_weighted_game_win_pct numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT (COALESCE(p_weighted_win_pct, 0)      * 40.0)
       + (COALESCE(p_weighted_game_win_pct, 0) * 15.0)
       + (COALESCE(p_sos, 0.5)                 * 45.0
          * LEAST(1.0, ((COALESCE(p_weighted_win_pct, 0) * 40.0
                       + COALESCE(p_weighted_game_win_pct, 0) * 15.0)
                       / 55.0)
                       / 0.30))
$function$;

-- 5. Backfill every season.
UPDATE public.team_season_stats tss
SET power_score = agg.power_score,
    sos         = agg.sos,
    recorded_at = now()
FROM public.v_team_season_agg agg
WHERE agg.season_id = tss.season_id
  AND agg.team_id = tss.team_id;

-- 6. Verify the backup and backfill are real.
DO $$
DECLARE
  v_live      bigint;
  v_backup    bigint;
  v_ddl       bigint;
  v_backfill  bigint;
BEGIN
  SELECT count(*) INTO v_live     FROM public.team_season_stats;
  SELECT count(*) INTO v_backup   FROM public.team_season_stats_pre_floor_adjustment;
  SELECT count(*) INTO v_ddl      FROM public.power_score_floor_ddl_backup;
  SELECT count(*) INTO v_backfill FROM public.team_season_stats WHERE power_score IS NOT NULL;

  IF v_live > 0 AND v_backup < v_live THEN
    RAISE EXCEPTION
      'Backup is incomplete: team_season_stats has % rows but the snapshot has %. '
      'Do not proceed.', v_live, v_backup;
  END IF;

  IF v_live > 0 AND v_ddl = 0 THEN
    RAISE EXCEPTION
      'power_score_100 definition was not captured. Do not proceed.';
  END IF;

  IF v_live > 0 AND v_backfill = 0 THEN
    RAISE EXCEPTION
      'Backfill appears to have failed: no team_season_stats rows have a power_score.';
  END IF;

  RAISE NOTICE
    'floor adjustment: % stat rows backed up, % power_score rows backfilled, % DDL definitions captured',
    v_backup, v_backfill, v_ddl;
END $$;
