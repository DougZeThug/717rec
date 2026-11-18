-- Division truth, script 05: UNDO, only if needed. Two paths.
--
-- NOT A MIGRATION. Paste the WHOLE file into the Supabase SQL Editor and run it.
-- Type 1 or 2 on the line marked TYPE HERE. Read the result at the bottom.
--
--   PATH 1 = PUT THE SAVED NUMBERS BACK.
--     Sets power_score, career_power_score, sos and recorded_at of the six seasons
--     back to what the backup (script 01) holds. This gives back TODAY's stored
--     numbers, exactly. It is safe because the six seasons are closed: no match
--     is scored in them any more, so it cannot lose a newer score. It does NOT
--     stop the overrides: the view still reads them, so the next recompute, or a
--     Sandbox "Save & rescore", would write the new numbers again.
--
--   PATH 2 = STOP USING THE OVERRIDES.
--     FIRST copies every row of power_score_division_override into the locked table
--     power_score_division_override_pre_undo (so a row added by hand is not lost).
--     Then deletes every row in power_score_division_override, puts the view
--     v_power_score_team_matches_rated back to the text of migration 20261003183939
--     (no override step), and recomputes the six seasons from the rules. This
--     gives the numbers today's rules give. It is NOT the same as today's stored
--     numbers: 62 team-seasons already differ today, because older rule changes
--     were never recomputed (see docs/OPERATIONS.md section 6g). The empty table
--     can stay; nothing reads it once the old view is back.
--     IT STOPS (nothing written) if the override table holds a row for a season that
--     is NOT one of the six: path 2 recomputes only the six seasons, so the stored
--     scores of that other season would stay worked out with a row path 2 deletes.
--     The error names the season ids. Recompute those seasons by hand first, or
--     remove those rows, then run path 2 again.
--
--   TO GO ALL THE WAY BACK to the state before this fix: run PATH 2, then run
--   PATH 1. (Path 2 first, so path 1 has the last word on the stored numbers.)
--
--   TO PUT THE OVERRIDE ROWS BACK after path 2 (rows saved in the pre_undo table):
--     INSERT INTO public.power_score_division_override
--       (team_id, season_id, division_id, reason, created_at)
--     SELECT DISTINCT ON (team_id, season_id) team_id, season_id, division_id, reason, created_at
--     FROM public.power_score_division_override_pre_undo
--     ORDER BY team_id, season_id, saved_at DESC
--     ON CONFLICT (team_id, season_id) DO NOTHING;
--   (Each path 2 run appends only the rows it deleted. A second path 2 run has nothing
--   to delete and adds nothing.) Drop the pre_undo table when it is no longer needed.
--   The recipe puts the ROWS back, nothing else: the old view stays until the migration
--   file 20261117130000_power_score_division_override.sql is run again, and the stored
--   scores stay as path 2 left them (run script 04, one season per run, to rebuild them).
--
-- It takes the Sandbox weight-save lock, so the two never run together. The old
-- view text below is copied from 20261003183939. If the migration file is still
-- in the repo, the next hand-apply of all migrations would add the override step
-- again: revert the pull request too.
--
-- ROUNDING. On the live database power_score is numeric(8,3) and sos is numeric(6,3)
-- (3 decimals; the repo migrations do not say so). The view has full precision, so a
-- stored number is never exactly equal to it. The report line that compares with the
-- RULES therefore ignores a gap of 0.0006 or less in power_score and sos (the same
-- rule as script 04 and check L4). The line that compares with the BACKUP stays
-- exact: both sides are stored values with 3 decimals. Path 2's own recompute is the
-- same UPDATE as script 04 and rewrites about every row of the six seasons.
--
-- SAFE TO RE-RUN. Each path ends in the same place when run twice.

DROP TABLE IF EXISTS pg_temp.division_truth_undo;
CREATE TEMP TABLE division_truth_undo (ord int, what text, val text);

DO $undo$
DECLARE
  v_path text := 'TYPE-1-OR-2-HERE';   -- <<<<<< TYPE HERE: 1 or 2 (keep the quotes)
  v_rows integer;
  v_del  bigint;
  v_saved bigint;
  v_other text;
BEGIN
  IF v_path NOT IN ('1', '2') THEN
    RAISE EXCEPTION 'STOP: type 1 or 2 on the line marked TYPE HERE. Nothing was changed.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('power_score_weights'));

  IF v_path = '1' THEN
    IF to_regclass('public.team_season_stats_pre_division_truth') IS NULL THEN
      RAISE EXCEPTION 'STOP: there is no backup table, so path 1 has nothing to restore. Nothing was changed.';
    END IF;

    UPDATE public.team_season_stats tss
       SET power_score        = b.power_score,
           career_power_score = b.career_power_score,
           sos                = b.sos,
           recorded_at        = b.recorded_at
      FROM public.team_season_stats_pre_division_truth b
     WHERE b.season_id = tss.season_id
       AND b.team_id   = tss.team_id
       AND (tss.power_score        IS DISTINCT FROM b.power_score
         OR tss.career_power_score IS DISTINCT FROM b.career_power_score
         OR tss.sos                IS DISTINCT FROM b.sos
         OR tss.recorded_at        IS DISTINCT FROM b.recorded_at);
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    INSERT INTO division_truth_undo VALUES
      (1, 'PATH RUN', '1 = saved numbers put back'),
      (2, 'ROWS RESTORED FROM THE BACKUP', v_rows::text);
  ELSE
    IF to_regclass('public.power_score_division_override') IS NULL THEN
      RAISE EXCEPTION 'STOP: the override table does not exist, so there is nothing to undo. Nothing was changed.';
    END IF;

    -- Path 2 recomputes only the six seasons. A row for any other season would be
    -- deleted while that season's stored scores stay worked out with it. Stop.
    SELECT string_agg(DISTINCT o.season_id::text, ', ' ORDER BY o.season_id::text)
      INTO v_other
      FROM public.power_score_division_override o
     WHERE o.season_id NOT IN ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30',
                               'd50bb12e-99be-4170-802a-695a402373ce', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac',
                               '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106', '9cd55eb8-672c-4a43-a9df-3552a7759cca');
    IF v_other IS NOT NULL THEN
      RAISE EXCEPTION 'STOP: the override table holds rows for season(s) outside the six: %. Path 2 recomputes only the six seasons, so the stored scores of those seasons would stay worked out with rows that path 2 deletes. Recompute those seasons by hand first, or remove those rows, then run path 2 again. Nothing was changed.', v_other;
    END IF;

    -- Save a copy first, so nothing added by hand is lost. Append-only; locked like
    -- the other backup tables (service_role only).
    CREATE TABLE IF NOT EXISTS public.power_score_division_override_pre_undo (
      team_id     uuid NOT NULL,
      season_id   uuid NOT NULL,
      division_id uuid NOT NULL,
      reason      text NOT NULL,
      created_at  timestamptz,
      saved_at    timestamptz NOT NULL DEFAULT now()
    );
    REVOKE ALL ON public.power_score_division_override_pre_undo FROM PUBLIC, anon, authenticated;
    ALTER TABLE public.power_score_division_override_pre_undo ENABLE ROW LEVEL SECURITY;
    GRANT ALL ON public.power_score_division_override_pre_undo TO service_role;

    -- ONE statement: every deleted row is saved by the same statement that deletes it.
    WITH removed AS (
      DELETE FROM public.power_score_division_override o
      RETURNING o.team_id, o.season_id, o.division_id, o.reason, o.created_at
    )
    INSERT INTO public.power_score_division_override_pre_undo
      (team_id, season_id, division_id, reason, created_at)
    SELECT team_id, season_id, division_id, reason, created_at FROM removed;
    GET DIAGNOSTICS v_saved = ROW_COUNT;
    v_del := v_saved;

    -- The view, exactly as migration 20261003183939 wrote it (no override step).
    CREATE OR REPLACE VIEW public.v_power_score_team_matches_rated
    WITH (security_invoker = on) AS
      WITH resolved AS (
        SELECT tm.match_id, tm.season_id, tm.source, tm.team_id, tm.opponent_id,
          tm.is_win, tm.is_loss, tm.game_wins, tm.game_losses, tm.match_date,
          COALESCE(snap.division_id, tda_id.id, brk.division_id, hist.division_id, dcur.division_id, lastk.division_id) AS opp_division_id,
          CASE
            WHEN snap.division_id IS NOT NULL AND snap.at_or_before THEN 'snapshot_at_date'
            WHEN snap.division_id IS NOT NULL THEN 'snapshot_earliest_in_season'
            WHEN tda_id.id IS NOT NULL THEN 'archive_division_id'
            WHEN brk.division_id IS NOT NULL THEN 'bracket_division_id'
            WHEN hist.division_id IS NOT NULL THEN 'division_history'
            WHEN dcur.division_id IS NOT NULL THEN 'current_division'
            WHEN lastk.division_id IS NOT NULL THEN 'last_known_division'
            ELSE 'unresolved'
          END AS resolved_by
        FROM public.v_power_score_team_matches tm
        LEFT JOIN LATERAL (
          SELECT dr.id AS division_id,
            (s.snapshot_date <= COALESCE(tm.match_date::date, 'infinity'::date)) AS at_or_before
          FROM public.power_score_snapshots s
          JOIN public.v_division_rateable dr ON dr.id = s.division_id
          WHERE s.team_id = tm.opponent_id AND s.season_id = tm.season_id
          ORDER BY (s.snapshot_date <= COALESCE(tm.match_date::date, 'infinity'::date)) DESC,
            CASE WHEN s.snapshot_date <= COALESCE(tm.match_date::date, 'infinity'::date) THEN s.snapshot_date END DESC NULLS LAST,
            s.snapshot_date
          LIMIT 1) snap ON true
        LEFT JOIN public.team_details_archive tda ON tda.team_id = tm.opponent_id AND tda.season_id = tm.season_id
          AND NOT EXISTS (SELECT 1 FROM public.division_archive_distrust dd WHERE dd.season_id = tda.season_id)
        LEFT JOIN public.v_division_rateable tda_id ON tda_id.id = tda.division_id
          AND (tda.divisionname IS NULL
            OR lower(btrim(tda_id.display_division)) = lower(btrim(tda.divisionname))
            OR lower(btrim(tda_id.name)) = lower(btrim(tda.divisionname)))
        LEFT JOIN LATERAL (
          SELECT dr.id AS division_id
          FROM public.participants p
          JOIN public.brackets b ON b.id = p.bracket_id
          JOIN public.v_division_rateable dr ON dr.id = b.division_id
          WHERE p.team_id = tm.opponent_id AND b.season_id = tm.season_id
          ORDER BY b.created_at, b.id LIMIT 1) brk ON true
        LEFT JOIN LATERAL (
          SELECT h.division_id
          FROM public.team_division_history h
          JOIN public.v_division_rateable dr ON dr.id = h.division_id
          WHERE h.team_id = tm.opponent_id AND h.changed_at > COALESCE(tm.match_date, now())
          ORDER BY h.changed_at LIMIT 1) hist ON true
        LEFT JOIN public.v_team_current_division dcur ON dcur.team_id = tm.opponent_id
        LEFT JOIN public.v_team_last_known_division lastk ON lastk.team_id = tm.opponent_id
      )
      SELECT r.match_id, r.season_id, r.source, r.team_id, r.opponent_id, r.is_win, r.is_loss,
        r.game_wins, r.game_losses, r.match_date, r.opp_division_id,
        COALESCE(wh.weight, dw.division_weight) AS opp_weight,
        (COALESCE(wh.weight, dw.division_weight) IS NOT NULL) AS rates,
        r.resolved_by
      FROM resolved r
      LEFT JOIN LATERAL (
        SELECT h.weight FROM public.division_weight_history h
        WHERE h.division_id = r.opp_division_id AND h.valid_from <= COALESCE(r.match_date, now())
        ORDER BY h.valid_from DESC LIMIT 1) wh ON true
      LEFT JOIN public.v_division_rateable dw ON dw.id = r.opp_division_id;

    UPDATE public.team_season_stats tss
       SET power_score        = agg.power_score,
           career_power_score = agg.career_power_score,
           sos                = agg.sos,
           recorded_at        = now()
      FROM public.v_team_season_agg agg
     WHERE agg.season_id = tss.season_id
       AND agg.team_id   = tss.team_id
       AND tss.season_id IN ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30',
                             'd50bb12e-99be-4170-802a-695a402373ce', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac',
                             '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106', '9cd55eb8-672c-4a43-a9df-3552a7759cca')
       AND (tss.power_score        IS DISTINCT FROM agg.power_score
         OR tss.career_power_score IS DISTINCT FROM agg.career_power_score
         OR tss.sos                IS DISTINCT FROM agg.sos);
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    INSERT INTO division_truth_undo VALUES
      (1, 'PATH RUN', '2 = overrides removed, old view back, six seasons recomputed'),
      (2, 'OVERRIDE ROWS SAVED FIRST (in power_score_division_override_pre_undo)', v_saved::text),
      (3, 'OVERRIDE ROWS DELETED', v_del::text),
      (4, 'STORED ROWS RECOMPUTED', v_rows::text);
  END IF;
END $undo$;

-- ONE result: what happened, and where things stand now.
SELECT r.what, r.val
FROM (
  SELECT ord, what, val FROM division_truth_undo
  UNION ALL
  SELECT 9, 'rows now in the pre_undo table (all path 2 runs)',
         -- query_to_xml reads the table only if the CASE reaches it.
         CASE WHEN to_regclass('public.power_score_division_override_pre_undo') IS NULL THEN 'no table (path 2 not run yet)'
              ELSE (xpath('/row/c/text()', query_to_xml(
                      'SELECT count(*) AS c FROM public.power_score_division_override_pre_undo',
                      false, true, '')))[1]::text END
  UNION ALL
  SELECT 10, 'override rows left',
         -- query_to_xml reads the table only if the CASE reaches it.
         CASE WHEN to_regclass('public.power_score_division_override') IS NULL THEN 'no table'
              ELSE (xpath('/row/c/text()', query_to_xml(
                      'SELECT count(*) AS c FROM public.power_score_division_override',
                      false, true, '')))[1]::text END
  UNION ALL
  SELECT 11, 'the rated view has the override step',
         CASE WHEN position('manual_override' IN pg_get_viewdef('public.v_power_score_team_matches_rated'::regclass)) > 0
              THEN 'yes' ELSE 'no (old view)' END
  UNION ALL
  SELECT 12, 'six seasons: rows that differ from the SAVED BACKUP (0 after path 1)',
         -- The backup table may have been dropped since (the runbook says to drop it
         -- once the new numbers are accepted). query_to_xml reads it only if the
         -- CASE reaches it.
         CASE WHEN to_regclass('public.team_season_stats_pre_division_truth') IS NULL THEN 'backup unavailable'
              ELSE (xpath('/row/c/text()', query_to_xml(
                      'SELECT count(*) AS c FROM public.team_season_stats s '
                      || 'JOIN public.team_season_stats_pre_division_truth b ON b.season_id = s.season_id AND b.team_id = s.team_id '
                      || 'WHERE s.power_score IS DISTINCT FROM b.power_score '
                      || 'OR s.career_power_score IS DISTINCT FROM b.career_power_score '
                      || 'OR s.sos IS DISTINCT FROM b.sos',
                      false, true, '')))[1]::text END
  UNION ALL
  SELECT 13, 'six seasons: rows that differ from the RULES NOW by more than rounding (0 after path 2)',
         count(*)::text
    FROM public.team_season_stats s
    JOIN public.v_team_season_agg a ON a.season_id = s.season_id AND a.team_id = s.team_id
   WHERE s.season_id IN ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30',
                         'd50bb12e-99be-4170-802a-695a402373ce', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac',
                         '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106', '9cd55eb8-672c-4a43-a9df-3552a7759cca')
      -- Rounding: on the live database power_score and sos keep 3 decimals, so a gap of
      -- 0.0006 or less is rounding (the same rule as script 04 and check L4).
      AND (abs(COALESCE(s.power_score, -1) - COALESCE(a.power_score, -1)) > 0.0006
        OR abs(COALESCE(s.sos, -1) - COALESCE(a.sos, -1)) > 0.0006
        OR s.career_power_score IS DISTINCT FROM a.career_power_score)
) r
ORDER BY r.ord;
