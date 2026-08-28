-- B-32 recovery: replay King Slayer for every team in the active season.
DO $$
DECLARE
  v_season_id uuid;
  v_team      uuid;
  v_count     integer := 0;
BEGIN
  SELECT id INTO v_season_id FROM public.seasons WHERE is_active = true LIMIT 1;

  IF v_season_id IS NULL THEN
    RAISE NOTICE 'king slayer backfill skipped: no active season';
    RETURN;
  END IF;

  FOR v_team IN
    SELECT DISTINCT m.winner_id
    FROM public.matches m
    WHERE m.season_id = v_season_id
      AND m.iscompleted = true
      AND m.winner_id IS NOT NULL
  LOOP
    BEGIN
      PERFORM public.recompute_kingslayer_badge(v_team);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'king slayer backfill skipped team %: %', v_team, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'king slayer backfill complete: % team(s) recomputed', v_count;
END;
$$;