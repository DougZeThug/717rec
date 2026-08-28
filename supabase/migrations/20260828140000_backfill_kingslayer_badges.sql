-- B-32 recovery: replay the one badge check that cannot heal itself.
--
-- Every other pattern badge is recomputed from a team's whole season history, so
-- a team's badges correct themselves the next time that team is scored. King
-- Slayer is the exception: award_kingslayer_badge() judges one specific pairing
-- and is never re-derived. Any earned in a match finalised through live scoring
-- -- which ran no badge check at all before this release -- is simply missing.
--
-- Two deliberate departures from the earlier badge backfill, 20260225215316:
--
--   * No DELETE first. award_kingslayer_badge() has had ON CONFLICT DO UPDATE
--     since 20260225214218, so it is already idempotent, and deleting first
--     would destroy correct badges if this were interrupted.
--
--   * Stop at a winner's first qualifying match. The function's ELSE branch
--     REVOKES the badge when the career-score gap is under the threshold, and
--     the badge is unique per (team, season) -- so replaying a winner's
--     low-gap match after a high-gap one silently undoes the award it just
--     made. The 20260225215316 loop has exactly that flaw.
--
-- Only the active season is scanned: award_kingslayer_badge() stamps the badge
-- with whichever season is active now, so replaying an older match would
-- attribute an old win to today's season. A King Slayer lost on a live-scored
-- match in an already-archived season stays lost; recovering it would need a
-- season-aware variant of the function, which is out of scope here.
DO $$
DECLARE
  v_season_id uuid;
  v_match     record;
  v_result    jsonb;
  v_winner    uuid := NULL;
  v_awarded   boolean := false;
  v_count     integer := 0;
BEGIN
  SELECT id INTO v_season_id FROM public.seasons WHERE is_active = true LIMIT 1;

  IF v_season_id IS NULL THEN
    RAISE NOTICE 'king slayer backfill skipped: no active season';
    RETURN;
  END IF;

  FOR v_match IN
    SELECT m.winner_id, m.loser_id
    FROM public.matches m
    WHERE m.season_id = v_season_id
      AND m.iscompleted = true
      AND m.winner_id IS NOT NULL
      AND m.loser_id IS NOT NULL
    ORDER BY m.winner_id, COALESCE(m.date, m.created_at)
  LOOP
    IF v_match.winner_id IS DISTINCT FROM v_winner THEN
      v_winner  := v_match.winner_id;
      v_awarded := false;
    ELSIF v_awarded THEN
      CONTINUE;  -- already earned; do not let a later match revoke it
    END IF;

    BEGIN
      v_result := public.award_kingslayer_badge(v_match.winner_id, v_match.loser_id);
      IF COALESCE((v_result->>'awarded')::boolean, false) THEN
        v_awarded := true;
        v_count := v_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'king slayer backfill skipped % over %: %',
        v_match.winner_id, v_match.loser_id, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'king slayer backfill complete: % badge(s) active', v_count;
END;
$$;
