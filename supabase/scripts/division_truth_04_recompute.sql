-- Division truth, script 04: RECOMPUTE ONE SEASON (hand-apply step 6).
--
-- NOT A MIGRATION. Paste the WHOLE file into the Supabase SQL Editor and run it,
-- ONE season per run. Run it only AFTER Doug approved the preview (03).
--
-- WHAT IT DOES. For the season you type below, it rewrites 4 columns of
-- team_season_stats (power_score, career_power_score, sos, recorded_at) for the
-- teams whose stored number differs from what the rules give now
-- (v_team_season_agg). Nothing else is touched: not the win-loss record, the
-- games, the division name, the champion or the playoff rank, and not
-- power_score_snapshots. It is the same UPDATE as admin_recompute_season_power()
-- (20260820120000) and as the foot of 20261006120000, without the admin check
-- (the SQL editor has no signed-in admin, so that function would refuse).
--
-- It does NOT call upsert_team_season_stats() and it is NOT the Sandbox
-- "Save & rescore": those rewrite every season.
--
-- It takes the same lock as a Sandbox weight save (pg_advisory_xact_lock on
-- 'power_score_weights'), so the two can never run at the same moment. If a
-- weight save is running, this waits for it, then reads the new rules.
--
-- SAFE TO RE-RUN: a second run changes 0 rows. Only the SIX seasons below are
-- allowed. Any other id stops the script and changes nothing.
--
-- HOW TO RUN IT
--   1. Type ONE season id between the quotes on the line marked TYPE HERE.
--   2. Run. Read the result. "rows changed" is the number of teams that moved.
--   3. Do the next season (change the id, run again). Start with one of the three
--      newer seasons (only a few teams move), the three 2025 seasons last.
--
--   Spring 2025     d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a
--   Summer 1 2025   e537c594-3ba9-4d79-ba63-f6ed90c89e30
--   Summer 2 2025   d50bb12e-99be-4170-802a-695a402373ce
--   Fall 2025       34cd19e2-abf5-43b8-a16f-6d73a0e998ac
--   Winter 1 2026   4b90a1d8-b90a-4e47-8e8c-b89a7b54e106
--   Winter 2 2026   9cd55eb8-672c-4a43-a9df-3552a7759cca
--
-- UNDO: supabase/scripts/division_truth_05_undo.sql. These six seasons are closed,
-- so restoring the saved numbers (undo path 1) cannot lose a newer score.

DROP TABLE IF EXISTS pg_temp.division_truth_recompute;
DROP TABLE IF EXISTS pg_temp.division_truth_before;
CREATE TEMP TABLE division_truth_recompute (ord int, what text, detail text, val text);

DO $$
DECLARE
  v_season text := 'TYPE-THE-SEASON-ID-HERE';   -- <<<<<< TYPE HERE (keep the quotes)
  v_id     uuid;
  v_rows   integer;
  v_name   text;
BEGIN
  IF v_season NOT IN ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30',
                      'd50bb12e-99be-4170-802a-695a402373ce', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac',
                      '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106', '9cd55eb8-672c-4a43-a9df-3552a7759cca') THEN
    RAISE EXCEPTION 'STOP: "%" is not one of the six allowed season ids (see the list at the top of this file). Nothing was changed.', v_season;
  END IF;
  v_id := v_season::uuid;
  SELECT name INTO v_name FROM public.seasons WHERE id = v_id;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'STOP: this season id is not in the seasons table. Nothing was changed.';
  END IF;

  -- One writer at a time, same lock as a Sandbox weight save.
  PERFORM pg_advisory_xact_lock(hashtext('power_score_weights'));

  -- What is stored now, for the before-and-after lines below.
  CREATE TEMP TABLE division_truth_before ON COMMIT DROP AS
  SELECT s.team_id, s.power_score, s.career_power_score, s.sos
  FROM public.team_season_stats s
  WHERE s.season_id = v_id;

  UPDATE public.team_season_stats tss
     SET power_score        = agg.power_score,
         career_power_score = agg.career_power_score,
         sos                = agg.sos,
         recorded_at        = now()
    FROM public.v_team_season_agg agg
   WHERE agg.season_id = tss.season_id
     AND agg.team_id   = tss.team_id
     AND tss.season_id = v_id
     AND (tss.power_score        IS DISTINCT FROM agg.power_score
       OR tss.career_power_score IS DISTINCT FROM agg.career_power_score
       OR tss.sos                IS DISTINCT FROM agg.sos);
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  INSERT INTO division_truth_recompute VALUES
    (1, 'season', v_name, ''),
    (2, 'ROWS CHANGED', '', v_rows::text);

  -- One line per team that moved: old score -> new score (0-100 scale).
  INSERT INTO division_truth_recompute
  SELECT 3, 'moved', t.name,
         COALESCE(round(b.power_score * 100, 2)::text, 'none') || ' -> '
         || COALESCE(round(s.power_score * 100, 2)::text, 'none')
  FROM public.team_season_stats s
  JOIN division_truth_before b ON b.team_id = s.team_id
  JOIN public.teams t ON t.id = s.team_id
  WHERE s.season_id = v_id
    AND (s.power_score        IS DISTINCT FROM b.power_score
      OR s.career_power_score IS DISTINCT FROM b.career_power_score
      OR s.sos                IS DISTINCT FROM b.sos);

  -- Still different from the rules after the update? Must be 0.
  INSERT INTO division_truth_recompute
  SELECT 4, 'rows still different from the rules (must be 0)', '', count(*)::text
  FROM public.team_season_stats s
  JOIN public.v_team_season_agg a ON a.season_id = s.season_id AND a.team_id = s.team_id
  WHERE s.season_id = v_id
    AND (s.power_score        IS DISTINCT FROM a.power_score
      OR s.career_power_score IS DISTINCT FROM a.career_power_score
      OR s.sos                IS DISTINCT FROM a.sos);
END $$;

SELECT what, detail, val
FROM division_truth_recompute
ORDER BY ord, detail;
