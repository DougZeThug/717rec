-- Division truth, script 06: THE CHECKS (hand-apply steps 4 and 7, read-only).
--
-- NOT A MIGRATION. Paste the WHOLE file into the Supabase SQL Editor and run it.
-- It changes no stored number. (It makes one temporary view that vanishes with the
-- session.) Run it at three moments:
--   a. right after the data script (02), before the recompute: L4 shows the six
--      seasons still differ (that is expected), everything else must be PASS;
--   b. after each recompute: the same;
--   c. after the last recompute: L4 must show 0 team-seasons in the six seasons that
--      still differ by more than rounding.
-- ONE list comes back: check, result, detail. Every result starts with PASS, FAIL
-- or INFO. Any FAIL: stop, do not recompute more, send the list to the developer.
--
--   L1  every game that a snapshot, the archive or a bracket answered BEFORE keeps
--       the same opponent division, the same weight and the same label
--   L2  no row was added or lost, and every game NOT rated by an override is
--       identical, column for column, to the old rule; an override game keeps
--       its winner, its games and its date
--   L3  the number of manual_override games is what the override rows say it
--       should be, and no game is left unrated in the six seasons
--   L3b every manual_override game's opponent weight equals that division's weight
--       today (it should: each map division has one weight-history row)
--   L4  stored scores that differ from the rules now by MORE THAN ROUNDING (0.0006).
--       On the live database power_score and sos are stored with 3 decimals, so a
--       stored number can differ from the full-precision view value (storage rounds
--       it to 3 decimals). Only the six seasons may differ (before the recompute).
--       The LIVE season is listed on its own: a season that is the live standings
--       season (the active one, else the one with playoffs active) and is NOT
--       archived refreshes by itself when the next match is scored. A gap in an
--       ARCHIVED season is never refreshed that way, so it is a FAIL even if the
--       season is marked active.
--   L5  the live-season views (v_team_details) read no override game
--   L6  the scores are re-derived with the live formula from the game rows: the
--       new numbers equal what the recompute stores, the old numbers equal the
--       backup's live_rules numbers, and a team with no changed game moves by
--       exactly 0 (the line L6c lists who moved in the three newer seasons)
--   L7  win-loss, games, division name, champion, runner-up and playoff rank of
--       the six seasons are identical to the backup (power_score_snapshots is not
--       in the backup; no script here writes it)
--   L6b, L6c, L6d and L7 need the backup (script 01). Script 07 retires the backup
--   (docs/OPERATIONS.md section 6g). Once it is gone these four say INFO, "skipped,
--   backup retired", and the other checks run as before. The team list of L6a comes
--   from team_season_stats, so it does not need the backup either.
--   L8  the three dropped-out teams: the SQL row and the TypeScript list
--       (src/constants/dropoutDivisions.ts) name the same tier
--
-- L9 (a team in two brackets of different divisions) cannot be run: the three
-- old seasons have no playoff brackets.
--
-- The empty-table check (before any override row exists) is the fingerprint in
-- docs/OPERATIONS.md section 6g, step 2. It is the same count and md5 before and
-- after the migration.

-- The OLD rule, for comparing. This is the body of v_power_score_team_matches_rated
-- exactly as migration 20261003183939 wrote it, without the override step, saved as
-- a TEMPORARY view: it lives only in this editor session and changes nothing.
DROP VIEW IF EXISTS pg_temp.division_truth_old_rated;
CREATE TEMP VIEW division_truth_old_rated AS
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

-- The saved numbers (script 01), copied into a TEMPORARY table, so this script does not
-- fail once script 07 has dropped the backup. If the backup is gone, the temporary
-- table is the same table with no rows, and L6b, L6c, L6d and L7 are skipped. Like the
-- view above, it lives only in this editor session and changes nothing.
DROP TABLE IF EXISTS pg_temp.division_truth_bk;
DO $$
BEGIN
  IF to_regclass('public.team_season_stats_pre_division_truth') IS NOT NULL THEN
    EXECUTE 'CREATE TEMP TABLE division_truth_bk AS '
         || 'SELECT season_id, team_id, match_wins, match_losses, game_wins, game_losses, division_name, '
         || 'playoff_rank, power_score, sos, champion, runner_up, recorded_at, career_power_score, '
         || 'live_power_score, live_sos, live_career_power_score '
         || 'FROM public.team_season_stats_pre_division_truth';
  ELSE
    EXECUTE 'CREATE TEMP TABLE division_truth_bk AS '
         || 'SELECT s.season_id, s.team_id, s.match_wins, s.match_losses, s.game_wins, s.game_losses, s.division_name, '
         || 's.playoff_rank, s.power_score, s.sos, s.champion, s.runner_up, s.recorded_at, s.career_power_score, '
         || 'NULL::numeric AS live_power_score, NULL::numeric AS live_sos, NULL::numeric AS live_career_power_score '
         || 'FROM public.team_season_stats s WHERE false';
  END IF;
END $$;

WITH
six(season_id) AS (VALUES
  ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a'::uuid),  -- Spring 2025
  ('e537c594-3ba9-4d79-ba63-f6ed90c89e30'::uuid),  -- Summer 1 2025
  ('d50bb12e-99be-4170-802a-695a402373ce'::uuid),  -- Summer 2 2025
  ('34cd19e2-abf5-43b8-a16f-6d73a0e998ac'::uuid),  -- Fall 2025
  ('4b90a1d8-b90a-4e47-8e8c-b89a7b54e106'::uuid),  -- Winter 1 2026
  ('9cd55eb8-672c-4a43-a9df-3552a7759cca'::uuid)   -- Winter 2 2026
),
newer(season_id) AS (VALUES
  ('34cd19e2-abf5-43b8-a16f-6d73a0e998ac'::uuid),
  ('4b90a1d8-b90a-4e47-8e8c-b89a7b54e106'::uuid),
  ('9cd55eb8-672c-4a43-a9df-3552a7759cca'::uuid)
),
-- L1. A team-season is either all strong (a snapshot, the archive or a bracket answers
-- it for every game) or all weak: those steps depend on the opponent and the season,
-- never on the game. So an override can only replace a strong answer if someone wrote
-- a row for a strong team-season by hand. L1 is SUPPOSED to FAIL then. Do not weaken it.
l1 AS (
  SELECT count(*) AS bad
  FROM public.v_power_score_team_matches_rated n
  JOIN division_truth_old_rated o ON o.match_id = n.match_id AND o.team_id = n.team_id AND o.source = n.source
  WHERE o.resolved_by IN ('snapshot_at_date', 'snapshot_earliest_in_season',
                          'archive_division_id', 'bracket_division_id')
    AND (n.resolved_by IS DISTINCT FROM o.resolved_by
      OR n.opp_division_id IS DISTINCT FROM o.opp_division_id
      OR n.opp_weight IS DISTINCT FROM o.opp_weight)
),
l1n AS (
  SELECT count(*) AS n FROM division_truth_old_rated
  WHERE resolved_by IN ('snapshot_at_date', 'snapshot_earliest_in_season',
                        'archive_division_id', 'bracket_division_id')
),
-- L2
l2 AS (
  SELECT count(*) AS bad,
         count(*) FILTER (WHERE n.match_id IS NULL OR o.match_id IS NULL) AS missing
  FROM public.v_power_score_team_matches_rated n
  FULL JOIN division_truth_old_rated o
         ON o.match_id = n.match_id AND o.team_id = n.team_id AND o.source = n.source
  WHERE n.match_id IS NULL OR o.match_id IS NULL
     OR (n.resolved_by IS DISTINCT FROM 'manual_override' AND n::text <> o::text)
     OR (n.resolved_by = 'manual_override'
         AND (n.season_id, n.opponent_id, n.is_win, n.is_loss, n.game_wins, n.game_losses, n.match_date)
             IS DISTINCT FROM
             (o.season_id, o.opponent_id, o.is_win, o.is_loss, o.game_wins, o.game_losses, o.match_date))
),
-- L3
l3 AS (
  SELECT
    (SELECT count(*) FROM public.v_power_score_team_matches_rated WHERE resolved_by = 'manual_override') AS actual,
    (SELECT count(*)
       FROM public.v_power_score_team_matches_rated r
       JOIN public.power_score_division_override ov ON ov.team_id = r.opponent_id AND ov.season_id = r.season_id
       JOIN public.v_division_rateable dr ON dr.id = ov.division_id) AS expected,
    (SELECT count(*) FROM public.v_power_score_team_matches_rated r JOIN six USING (season_id)
      WHERE r.resolved_by = 'unresolved') AS unresolved_six,
    (SELECT count(*) FROM public.v_power_score_team_matches_rated r
      WHERE r.resolved_by = 'unresolved'
        AND r.season_id NOT IN (SELECT season_id FROM six)) AS unresolved_other,
    (SELECT count(*) FROM public.power_score_division_override) AS override_rows,
    (SELECT string_agg(x.label, '; ' ORDER BY x.label)
       FROM (SELECT DISTINCT t.name || ' [team ' || r.opponent_id || '] in ' || se.name
                    || ' [season ' || r.season_id || ']' AS label
             FROM public.v_power_score_team_matches_rated r
             JOIN six ON six.season_id = r.season_id
             JOIN public.teams t ON t.id = r.opponent_id
             JOIN public.seasons se ON se.id = r.season_id
             WHERE r.resolved_by = 'unresolved'
             LIMIT 12) x) AS unresolved_list
),
-- L3b
l3b AS (
  SELECT count(*) AS bad, count(*) FILTER (WHERE true) AS n_checked
  FROM public.v_power_score_team_matches_rated r
  JOIN public.divisions d ON d.id = r.opp_division_id
  WHERE r.resolved_by = 'manual_override'
    AND r.opp_weight IS DISTINCT FROM d.division_weight
),
l3b_n AS (
  SELECT count(*) AS n FROM public.v_power_score_team_matches_rated WHERE resolved_by = 'manual_override'
),
-- L4 (rounding-safe): power_score and sos are stored with 3 decimals, so a gap of
-- 0.0006 or less is rounding, not a real difference. The live season is listed on its
-- own. "Live" = the season the live standings follow (current_standings_season_id():
-- the active season, else the season with playoffs active) AND not archived: only
-- that season refreshes by itself when the next match is scored. An archived season
-- is never refreshed without the force flag, so a gap there is a FAIL, even if the
-- season is also marked active. With no live season, every season outside the six
-- counts as "elsewhere".
l4 AS (
  SELECT count(*) FILTER (WHERE s.season_id IN (SELECT season_id FROM six)) AS in_six,
         count(*) FILTER (WHERE s.season_id NOT IN (SELECT season_id FROM six)
                            AND NOT COALESCE(s.season_id = public.current_standings_season_id()
                                             AND se.is_archived IS NOT TRUE, false)) AS elsewhere,
         count(*) FILTER (WHERE s.season_id NOT IN (SELECT season_id FROM six)
                            AND COALESCE(s.season_id = public.current_standings_season_id()
                                         AND se.is_archived IS NOT TRUE, false)) AS live_season
  FROM public.team_season_stats s
  JOIN public.v_team_season_agg a ON a.season_id = s.season_id AND a.team_id = s.team_id
  JOIN public.seasons se ON se.id = s.season_id
  WHERE abs(COALESCE(s.power_score, -1) - COALESCE(a.power_score, -1)) > 0.0006
     OR abs(COALESCE(s.sos, -1) - COALESCE(a.sos, -1)) > 0.0006
     OR s.career_power_score IS DISTINCT FROM a.career_power_score
),
-- L5
l5 AS (
  SELECT count(*) AS bad
  FROM public.v_power_score_team_matches_rated r
  WHERE r.resolved_by = 'manual_override'
    AND (r.source = 'regular'
         OR (r.source = 'playoff' AND r.season_id = public.current_standings_season_id()))
),
l5fp AS (
  SELECT md5(COALESCE(string_agg(d::text, '|' ORDER BY d.team_id::text), '')) AS fp, count(*) AS n
  FROM public.v_team_details d
),
-- L6: the scores re-derived from the game rows with the live formula, old and new.
rows_all AS (
  SELECT 'new' AS tag, n.season_id, n.team_id, n.opponent_id, n.is_win, n.is_loss,
         n.game_wins, n.game_losses, n.opp_weight, n.rates
  FROM public.v_power_score_team_matches_rated n JOIN six ON six.season_id = n.season_id
  UNION ALL
  SELECT 'old', o.season_id, o.team_id, o.opponent_id, o.is_win, o.is_loss,
         o.game_wins, o.game_losses, o.opp_weight, o.rates
  FROM division_truth_old_rated o JOIN six ON six.season_id = o.season_id
),
derived AS (
  SELECT d.tag, d.season_id, d.team_id,
         CASE WHEN d.wins + d.losses > 0
              THEN public.power_score_100(d.wwp, d.sos, d.gwp) / 100.0 END AS power
  FROM (
    SELECT tag, season_id, team_id,
           COALESCE(sum(CASE WHEN is_win THEN 1 ELSE 0 END), 0) AS wins,
           COALESCE(sum(CASE WHEN is_loss THEN 1 ELSE 0 END), 0) AS losses,
           CASE WHEN COALESCE(sum(opp_weight) FILTER (WHERE rates AND (is_win IS TRUE OR is_loss IS TRUE)), 0) = 0 THEN 0
                ELSE COALESCE(sum(opp_weight) FILTER (WHERE rates AND is_win), 0)
                     / NULLIF(sum(opp_weight) FILTER (WHERE rates AND (is_win IS TRUE OR is_loss IS TRUE)), 0)
           END AS wwp,
           CASE WHEN count(DISTINCT opponent_id) FILTER (WHERE rates) = 0 THEN 0.5
                ELSE greatest(0.1, least(1.0, avg(opp_weight) FILTER (WHERE rates)))
           END AS sos,
           CASE WHEN COALESCE(sum((game_wins + game_losses) * opp_weight) FILTER (WHERE rates), 0) = 0 THEN 0
                ELSE COALESCE(sum(game_wins * opp_weight) FILTER (WHERE rates), 0)
                     / NULLIF(sum((game_wins + game_losses) * opp_weight) FILTER (WHERE rates), 0)
           END AS gwp
    FROM rows_all
    GROUP BY tag, season_id, team_id
  ) d
),
changed AS (
  SELECT n.season_id, n.team_id,
         count(*) FILTER (WHERE n.opp_weight IS DISTINCT FROM o.opp_weight
                             OR n.rates IS DISTINCT FROM o.rates) AS games_changed
  FROM public.v_power_score_team_matches_rated n
  JOIN six ON six.season_id = n.season_id
  LEFT JOIN division_truth_old_rated o ON o.match_id = n.match_id AND o.team_id = n.team_id AND o.source = n.source
  GROUP BY n.season_id, n.team_id
),
l6 AS (
  SELECT
    -- new numbers: re-derived vs what the recompute would store
    count(*) FILTER (WHERE dn.power IS DISTINCT FROM a.power_score
                       AND abs(COALESCE(dn.power, -1) - COALESCE(a.power_score, -1)) > 1e-9) AS bad_new,
    -- old numbers: re-derived vs the backup's live_rules numbers
    count(*) FILTER (WHERE b.team_id IS NOT NULL
                       AND abs(COALESCE(dold.power, -1) - COALESCE(b.live_power_score, -1)) > 1e-9) AS bad_old,
    -- no changed game: after = live_rules exactly
    count(*) FILTER (WHERE b.team_id IS NOT NULL AND COALESCE(c.games_changed, 0) = 0
                       AND (a.power_score IS DISTINCT FROM b.live_power_score
                         OR a.career_power_score IS DISTINCT FROM b.live_career_power_score
                         OR a.sos IS DISTINCT FROM b.live_sos)) AS bad_zero,
    count(*) AS team_seasons,
    count(b.team_id) AS backup_rows
  FROM public.team_season_stats t
  JOIN six ON six.season_id = t.season_id
  LEFT JOIN division_truth_bk b ON b.season_id = t.season_id AND b.team_id = t.team_id
  LEFT JOIN public.v_team_season_agg a ON a.season_id = t.season_id AND a.team_id = t.team_id
  LEFT JOIN derived dn   ON dn.tag = 'new' AND dn.season_id = t.season_id AND dn.team_id = t.team_id
  LEFT JOIN derived dold ON dold.tag = 'old' AND dold.season_id = t.season_id AND dold.team_id = t.team_id
  LEFT JOIN changed c    ON c.season_id = t.season_id AND c.team_id = t.team_id
),
-- The saved rows. 0 once script 07 has retired the backup: then the checks that need
-- them are skipped.
bk AS (
  SELECT count(*) AS n FROM division_truth_bk
),
l6c AS (
  SELECT count(*) AS n,
         string_agg(t.name || ' (' || se.name || ') ' || (CASE WHEN a.power_score >= b.live_power_score THEN '+' ELSE '' END)
                                                || round((a.power_score - b.live_power_score) * 100, 2)::text,
                    '; ' ORDER BY abs(a.power_score - b.live_power_score) DESC) AS list
  FROM division_truth_bk b
  JOIN newer ON newer.season_id = b.season_id
  JOIN public.v_team_season_agg a ON a.season_id = b.season_id AND a.team_id = b.team_id
  JOIN public.teams t ON t.id = b.team_id
  JOIN public.seasons se ON se.id = b.season_id
  WHERE a.power_score IS DISTINCT FROM b.live_power_score
),
-- L7
l7 AS (
  SELECT count(*) FILTER (WHERE s.team_id IS NULL) AS lost,
         count(*) FILTER (WHERE s.team_id IS NOT NULL
                            AND (s.match_wins, s.match_losses, s.game_wins, s.game_losses, s.division_name,
                                 s.playoff_rank, s.champion, s.runner_up)
                                IS DISTINCT FROM
                                (b.match_wins, b.match_losses, b.game_wins, b.game_losses, b.division_name,
                                 b.playoff_rank, b.champion, b.runner_up)) AS changed,
         count(*) AS n
  FROM division_truth_bk b
  LEFT JOIN public.team_season_stats s ON s.season_id = b.season_id AND s.team_id = b.team_id
),
-- L8: the same three rows as src/constants/dropoutDivisions.ts
l8 AS (
  SELECT count(*) FILTER (WHERE lower(btrim(d.display_division)) = lower(e.tier)) AS agree,
         count(*) AS n,
         string_agg(e.team_name || ': SQL says ' || COALESCE(d.display_division, 'NO ROW') || ', list says ' || e.tier,
                    '; ') FILTER (WHERE d.id IS NULL OR lower(btrim(d.display_division)) <> lower(e.tier)) AS wrong
  FROM (VALUES
    ('Shut Your Cornhole',  '5db6b718-81af-4bd0-a0cd-0a0eae4330ad'::uuid, '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'::uuid, 'Competitive'),
    ('Red Roof Rockets',    'e91cb2d1-ef48-48e7-b15f-735c941f3679'::uuid, '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106'::uuid, 'Recreational'),
    ('The Tomato Saucers',  'accd6e20-f761-4769-8cdc-6c9495cc231c'::uuid, '9cd55eb8-672c-4a43-a9df-3552a7759cca'::uuid, 'Recreational')
  ) e(team_name, team_id, season_id, tier)
  LEFT JOIN public.power_score_division_override ov ON ov.team_id = e.team_id AND ov.season_id = e.season_id
  LEFT JOIN public.divisions d ON d.id = ov.division_id
)
SELECT x.check_name, x.result, x.detail
FROM (
  SELECT 'L1 solid answers unchanged' AS check_name,
         CASE WHEN l1.bad = 0 THEN 'PASS' ELSE 'FAIL' END AS result,
         l1.bad || ' games changed, of ' || l1n.n || ' answered by a snapshot, the archive or a bracket' AS detail
    FROM l1, l1n
  UNION ALL
  SELECT 'L2 rows and records unchanged',
         CASE WHEN l2.bad = 0 THEN 'PASS' ELSE 'FAIL' END,
         l2.bad || ' rows differ from the old rule where they should not (' || l2.missing || ' added or lost)'
    FROM l2
  UNION ALL
  SELECT 'L3 override games counted',
         CASE WHEN l3.actual = l3.expected AND l3.unresolved_six = 0 THEN 'PASS'
              WHEN l3.override_rows = 0 THEN 'INFO'
              ELSE 'FAIL' END,
         l3.override_rows || ' override rows; manual_override games ' || l3.actual || ' (rows say ' || l3.expected
         || '); unrated games in the six seasons ' || l3.unresolved_six
         || '; unrated games in other seasons ' || l3.unresolved_other
         || CASE WHEN l3.unresolved_six > 0 THEN
              '. A FAIL here from a Hidden or unmapped name is EXPECTED, not a fault of the fix: script 02 gave that team no row. '
              || 'Still unrated: ' || COALESCE(l3.unresolved_list, '(none listed)')
              || '. NEXT STEP: write one row by hand for each, with the real division and a reason (the reason has no person name): '
              || 'INSERT INTO public.power_score_division_override (team_id, season_id, division_id, reason) VALUES '
              || '(''<team id>'', ''<season id>'', (SELECT id FROM public.divisions WHERE name = ''<division name>''), '
              || '''League owner, <date>: <why>''); '
              || 'then run this list again, and watch L1: a row added by hand can replace a snapshot, archive or bracket answer.'
            ELSE '' END
    FROM l3
  UNION ALL
  SELECT 'L3b override weight is today''s weight',
         CASE WHEN l3b.bad = 0 THEN 'PASS' ELSE 'FAIL' END,
         l3b.bad || ' of ' || l3b_n.n || ' override games carry a weight that is not the division''s weight today'
         || CASE WHEN l3b.bad > 0 THEN '. A division weight was changed after those games were played (division_weight_history has more than one row for it). '
              || 'The game is rated by the weight it had on the game date. Tell the developer.' ELSE '' END
    FROM l3b, l3b_n
  UNION ALL
  SELECT 'L4 stored vs rules now',
         CASE WHEN l4.elsewhere > 0 THEN 'FAIL'
              WHEN l4.in_six = 0 THEN 'PASS'
              ELSE 'INFO' END,
         l4.in_six || ' team-seasons in the six seasons still differ by more than rounding (0 after the recompute); '
         || l4.elsewhere || ' elsewhere, not counting the live season (must be 0); '
         || l4.live_season || ' in the live season (not caused by this fix; it refreshes when the next match is scored)'
    FROM l4
  UNION ALL
  SELECT 'L5 live-season views untouched',
         CASE WHEN l5.bad = 0 THEN 'PASS' ELSE 'FAIL' END,
         l5.bad || ' override games feed v_team_details. Fingerprint of v_team_details: '
         || l5fp.fp || ' (' || l5fp.n || ' rows). Compare it with one saved before step 2.'
    FROM l5, l5fp
  UNION ALL
  SELECT 'L6a new scores re-derived',
         CASE WHEN l6.bad_new = 0 THEN 'PASS' ELSE 'FAIL' END,
         l6.bad_new || ' of ' || l6.team_seasons || ' team-seasons differ from the live formula applied to the game rows'
    FROM l6
  UNION ALL
  SELECT 'L6b old scores re-derived',
         CASE WHEN bk.n = 0 THEN 'INFO' WHEN l6.bad_old = 0 THEN 'PASS' ELSE 'FAIL' END,
         CASE WHEN bk.n = 0 THEN 'skipped, backup retired (script 07): there are no saved numbers to compare with'
              ELSE l6.bad_old || ' of ' || l6.backup_rows || ' differ from the backup''s live_rules numbers' END
    FROM l6, bk
  UNION ALL
  SELECT 'L6c no changed game, no change',
         CASE WHEN bk.n = 0 THEN 'INFO' WHEN l6.bad_zero = 0 THEN 'PASS' ELSE 'FAIL' END,
         CASE WHEN bk.n = 0 THEN 'skipped, backup retired (script 07): there are no saved numbers to compare with'
              ELSE l6.bad_zero || ' team-seasons with no changed game moved against live_rules' END
    FROM l6, bk
  UNION ALL
  SELECT 'L6d three newer seasons: who moved',
         'INFO',
         CASE WHEN bk.n = 0 THEN 'skipped, backup retired (script 07): there are no saved numbers to compare with'
              ELSE l6c.n || ' teams moved against live_rules (7 expected on the live data). '
                   || COALESCE(l6c.list, 'none') END
    FROM l6c, bk
  UNION ALL
  SELECT 'L7 records identical to backup',
         CASE WHEN bk.n = 0 THEN 'INFO' WHEN l7.lost = 0 AND l7.changed = 0 THEN 'PASS' ELSE 'FAIL' END,
         CASE WHEN bk.n = 0 THEN 'skipped, backup retired (script 07): there are no saved numbers to compare with'
              ELSE l7.changed || ' of ' || l7.n || ' saved rows changed record, games, division, champion or rank; '
                   || l7.lost || ' rows missing' END
    FROM l7, bk
  UNION ALL
  SELECT 'L8 TypeScript list = SQL rows',
         CASE WHEN l8.agree = l8.n THEN 'PASS'
              WHEN (SELECT count(*) FROM public.power_score_division_override) = 0 THEN 'INFO'
              ELSE 'FAIL' END,
         l8.agree || ' of ' || l8.n || ' agree. ' || COALESCE(l8.wrong, '')
    FROM l8
) x
ORDER BY x.check_name;
