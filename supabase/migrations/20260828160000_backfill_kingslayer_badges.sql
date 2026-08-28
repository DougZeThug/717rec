-- B-32 recovery: replay King Slayer for every team in the active season.
--
-- Until this release King Slayer was the one check that could not heal itself:
-- it judged a single pairing and nothing re-derived it, so any earned in a match
-- finalised through live scoring -- which ran no badge check at all -- was simply
-- missing. Every other pattern badge recomputes from a team's whole history and
-- corrects itself the next time that team is scored.
--
-- recompute_kingslayer_badge() (migration 20260828150000) now does exactly that
-- for King Slayer too, so the recovery is one call per team rather than a replay
-- of every match. It awards when any win this season qualifies and revokes when
-- none does, so it also corrects badges that a later narrow win had wrongly
-- taken away under the old pairing-scoped check.
--
-- Only the active season is covered: the check stamps the badge with whichever
-- season is active now, so an older season would be misattributed. A King Slayer
-- lost on a live-scored match in an already-closed season stays lost.
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
