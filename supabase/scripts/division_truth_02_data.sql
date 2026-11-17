-- Division truth, script 02: WRITE THE OVERRIDE ROWS (hand-apply step 3).
--
-- NOT A MIGRATION. Paste the WHOLE file into the Supabase SQL Editor and run it.
-- Run it AFTER the backup (01) and AFTER the migration 20261117130000. Right
-- before it, run the precheck (00) and the dry run (02a). Order and reasons:
-- docs/OPERATIONS.md section 6g. Step 3 changes the VIEW at once; the stored
-- numbers change only at the recompute (04), if all six seasons are closed.
-- To back out BEFORE step 6: DELETE FROM public.power_score_division_override;
--
-- WHAT IT DOES. It writes rows into power_score_division_override, so a game is
-- rated by the division the opponent had in THAT season. Nothing else. It does
-- not recompute any stored score (that is script 04).
--
-- THE RULE (Doug, 2026-11-17). For Spring 2025, Summer 1 2025 and Summer 2 2025:
-- every opponent team-season that has at least ONE game the Power Score rated by
-- a guess or not at all (resolved_by is division_history, current_division,
-- last_known_division or unresolved) gets a row. A team-season whose games are
-- all answered by a weekly snapshot, the archive or a bracket gets NO row: those
-- answers are already the real division. A team-season that already has an
-- override is not listed again, so a re-run adds 0 rows.
--
-- THE DIVISION. It is the opponent's name for that season (team_season_stats.
-- division_name), turned into a division by Doug's map. The stored name is a
-- LABEL: "Competitive" can hide Competitive Low and "Recreational" can hide
-- Recreational High, and "Intermediate 1/2" come from alphabetical bracket
-- titles. So Doug decided the map by hand:
--     Competitive    -> Competitive
--     Recreational   -> Recreational
--     Intermediate 1 -> Intermediate High
--     Intermediate 2 -> Intermediate Low
--     Intermediate   -> Intermediate
-- A division is found by its NAME (lower-case, spaces trimmed), never by its
-- display name. Any other stored name inserts NOTHING and is listed.
--
-- DOUG'S EXCEPTIONS WIN over the map: "Here for Fireball" in Summer 1 2025 and
-- Summer 2 2025 was Recreational High. The team is found by NAME.
--
-- PLUS 3 explicit rows for the 7 newer games that are unrated today:
--     Shut Your Cornhole  Fall 2025       Competitive  (4 games)
--     Red Roof Rockets    Winter 1 2026   Recreational (1 game)
--     The Tomato Saucers  Winter 2 2026   Recreational (2 games)
--
-- IT STOPS (error, nothing written) if: the migration is not applied; the backup
-- (01) is missing; a division name in the map matches anything but exactly ONE
-- rateable division; "Here for Fireball" matches anything but exactly ONE team;
-- one of the 3 teams or one of the 6 seasons is missing.
--
-- SAFE TO RE-RUN: ON CONFLICT DO NOTHING. Expect about 85 rows (an estimate; the
-- result below gives the real number).
--
-- LOOK FIRST: script 02a (division_truth_02a_dryrun.sql) lists, without writing
-- anything, the exact rows this script would insert. Run it before this one. The
-- two scripts share one block of SQL (marked SHARED BLOCK): keep it identical.
--
-- The reason text on each row holds no person's name, because the table can be
-- read through the public API. It starts with "League owner, 2026-11-17".
--
-- UNDO: supabase/scripts/division_truth_05_undo.sql.
--
-- The result at the bottom is the only thing the editor shows. Read it all.

DO $$
DECLARE
  v_bad   text := '';
  v_rec   record;
  v_n     bigint;
BEGIN
  IF to_regclass('public.power_score_division_override') IS NULL THEN
    RAISE EXCEPTION 'STOP: the migration 20261117130000 is not applied (no power_score_division_override table).';
  END IF;
  IF to_regclass('public.team_season_stats_pre_division_truth') IS NULL THEN
    RAISE EXCEPTION 'STOP: there is no backup. Run division_truth_01_backup.sql first.';
  END IF;

  -- Each division name in the map must match exactly ONE rateable division.
  -- (divisions.name has no unique rule, so this is checked, not assumed.)
  FOR v_rec IN
    SELECT k.division_key, count(dr.id) AS n
    FROM (VALUES ('competitive'), ('recreational'), ('intermediate high'),
                 ('intermediate low'), ('intermediate'), ('recreational high')) k(division_key)
    LEFT JOIN public.v_division_rateable dr ON lower(btrim(dr.name)) = k.division_key
    GROUP BY k.division_key
    HAVING count(dr.id) <> 1
  LOOP
    v_bad := v_bad || format(' "%s" matches %s rateable divisions;', v_rec.division_key, v_rec.n);
  END LOOP;
  IF v_bad <> '' THEN
    RAISE EXCEPTION 'STOP: a division name must match exactly ONE rateable division.%', v_bad;
  END IF;

  -- "Here for Fireball" must be exactly one team.
  SELECT count(*) INTO v_n FROM public.teams WHERE lower(btrim(name)) = 'here for fireball';
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'STOP: the name "Here for Fireball" matches % teams (need exactly 1).', v_n;
  END IF;

  -- The 3 explicit teams and the 6 seasons must exist.
  SELECT count(*) INTO v_n FROM public.teams
   WHERE id IN ('5db6b718-81af-4bd0-a0cd-0a0eae4330ad', 'e91cb2d1-ef48-48e7-b15f-735c941f3679',
                'accd6e20-f761-4769-8cdc-6c9495cc231c');
  IF v_n <> 3 THEN
    RAISE EXCEPTION 'STOP: only % of the 3 dropped-out teams (Shut Your Cornhole, Red Roof Rockets, The Tomato Saucers) were found.', v_n;
  END IF;
  SELECT count(*) INTO v_n FROM public.seasons
   WHERE id IN ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30',
                'd50bb12e-99be-4170-802a-695a402373ce', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac',
                '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106', '9cd55eb8-672c-4a43-a9df-3552a7759cca');
  IF v_n <> 6 THEN
    RAISE EXCEPTION 'STOP: only % of the 6 seasons were found.', v_n;
  END IF;
END $$;

WITH
-- ===== SHARED BLOCK. Script 02 (writes) and script 02a (dry run) must hold this
-- ===== block word for word. Change one, change the other.
old_seasons(season_id) AS (VALUES
  ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a'::uuid),  -- Spring 2025
  ('e537c594-3ba9-4d79-ba63-f6ed90c89e30'::uuid),  -- Summer 1 2025
  ('d50bb12e-99be-4170-802a-695a402373ce'::uuid)   -- Summer 2 2025
),
-- Doug's map: stored season name -> division name. Both sides lower-case.
tier_map(stored_key, division_key) AS (VALUES
  ('competitive',    'competitive'),
  ('recreational',   'recreational'),
  ('intermediate 1', 'intermediate high'),
  ('intermediate 2', 'intermediate low'),
  ('intermediate',   'intermediate')
),
-- One division per name, and only when exactly one rateable division has it
-- (the check above already stopped the script otherwise; this keeps the insert
-- safe on its own).
division_pick AS (
  SELECT lower(btrim(dr.name)) AS division_key,
         (array_agg(dr.id))[1] AS division_id,
         (array_agg(dr.name))[1] AS division_name,
         (array_agg(dr.division_weight))[1] AS division_weight
  FROM public.v_division_rateable dr
  GROUP BY lower(btrim(dr.name))
  HAVING count(*) = 1
),
-- Doug's exceptions: they win over the map. The reason text is public (the table
-- can be read through the API), so it holds no person's name.
exception_rows(team_id, season_id, division_key, reason) AS (
  SELECT t.id, s.season_id, 'recreational high',
         'League owner, 2026-11-17: was Recreational High'
  FROM public.teams t
  CROSS JOIN (VALUES ('e537c594-3ba9-4d79-ba63-f6ed90c89e30'::uuid),
                     ('d50bb12e-99be-4170-802a-695a402373ce'::uuid)) s(season_id)
  WHERE lower(btrim(t.name)) = 'here for fireball'
),
-- The 3 explicit rows for the 7 newer games.
explicit_rows(team_id, season_id, division_key, reason) AS (VALUES
  ('5db6b718-81af-4bd0-a0cd-0a0eae4330ad'::uuid, '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'::uuid, 'competitive',
   'League owner, 2026-11-17: dropped-out team; its real division that season was Competitive'),
  ('e91cb2d1-ef48-48e7-b15f-735c941f3679'::uuid, '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106'::uuid, 'recreational',
   'League owner, 2026-11-17: dropped-out team; its real division that season was Recreational'),
  ('accd6e20-f761-4769-8cdc-6c9495cc231c'::uuid, '9cd55eb8-672c-4a43-a9df-3552a7759cca'::uuid, 'recreational',
   'League owner, 2026-11-17: dropped-out team; its real division that season was Recreational')
),
-- THE PER-GAME RULE: opponent team-seasons with at least one guessed or unrated
-- game. 'manual_override' is not in the list, so a re-run finds none of them.
-- weak_games = how many of its games are guessed or unrated.
cand AS (
  SELECT r.season_id, r.opponent_id AS team_id, count(*) AS games,
         count(*) FILTER (WHERE r.resolved_by IN ('division_history', 'current_division',
                                                  'last_known_division', 'unresolved')) AS weak_games
  FROM public.v_power_score_team_matches_rated r
  JOIN old_seasons o ON o.season_id = r.season_id
  GROUP BY r.season_id, r.opponent_id
  HAVING bool_or(r.resolved_by IN ('division_history', 'current_division',
                                   'last_known_division', 'unresolved'))
),
judged AS (
  SELECT c.season_id, c.team_id, c.games, c.weak_games,
         s.division_name AS stored_name,
         (s.team_id IS NOT NULL) AS has_stored,
         e.division_key AS exc_key,
         e.reason AS exc_reason,
         m.division_key AS map_key
  FROM cand c
  LEFT JOIN public.team_season_stats s ON s.season_id = c.season_id AND s.team_id = c.team_id
  LEFT JOIN exception_rows e ON e.season_id = c.season_id AND e.team_id = c.team_id
  LEFT JOIN tier_map m ON m.stored_key = lower(btrim(s.division_name))
),
-- The rows that get a division: old-season team-seasons (by the map or the
-- exception list), then the 3 explicit rows.
wanted AS (
  SELECT j.season_id, j.team_id, d.division_id,
         COALESCE(j.exc_reason,
                  format('League owner, 2026-11-17: season division name "%s" = %s',
                         btrim(j.stored_name), d.division_name)) AS reason,
         btrim(j.stored_name) AS stored_label,
         j.weak_games AS games_affected
  FROM judged j
  JOIN division_pick d ON d.division_key = COALESCE(j.exc_key, j.map_key)
  UNION ALL
  SELECT e.season_id, e.team_id, d.division_id, e.reason,
         (SELECT btrim(s.division_name) FROM public.team_season_stats s
           WHERE s.season_id = e.season_id AND s.team_id = e.team_id),
         (SELECT count(*) FROM public.v_power_score_team_matches_rated r
           WHERE r.season_id = e.season_id AND r.opponent_id = e.team_id
             AND r.resolved_by IN ('division_history', 'current_division',
                                   'last_known_division', 'unresolved'))
  FROM explicit_rows e
  JOIN division_pick d ON d.division_key = e.division_key
),
-- ===== END OF SHARED BLOCK =====
ins AS (
  INSERT INTO public.power_score_division_override (team_id, season_id, division_id, reason)
  SELECT w.team_id, w.season_id, w.division_id, w.reason FROM wanted w
  ON CONFLICT (team_id, season_id) DO NOTHING
  RETURNING team_id, season_id, division_id
)
SELECT r.what, r.detail, r.n
FROM (
  SELECT 1 AS ord, 'opponent team-seasons with a guessed or unrated game' AS what, '' AS detail, count(*) AS n
    FROM cand
  UNION ALL
  SELECT 2, 'ROWS INSERTED NOW', '', count(*) FROM ins
  UNION ALL
  SELECT 3, 'inserted, by season', se.name, count(*)
    FROM ins JOIN public.seasons se ON se.id = ins.season_id GROUP BY se.name
  UNION ALL
  SELECT 4, 'inserted, by division', d.name, count(*)
    FROM ins JOIN public.divisions d ON d.id = ins.division_id GROUP BY d.name
  UNION ALL
  SELECT 5, 'inserted from Doug''s exception list',
         t.name || ' / ' || se.name, 1
    FROM ins
    JOIN exception_rows e ON e.team_id = ins.team_id AND e.season_id = ins.season_id
    JOIN public.teams t ON t.id = ins.team_id
    JOIN public.seasons se ON se.id = ins.season_id
  UNION ALL
  SELECT 6, 'NOT inserted, total: stored name is not in the map', '(count)', count(*)
    FROM judged j WHERE j.has_stored AND j.exc_key IS NULL AND j.map_key IS NULL
  UNION ALL
  SELECT 6, 'NOT inserted: stored name is not in the map',
         t.name || ' / ' || se.name || ' / "' || COALESCE(btrim(j.stored_name), '') || '"', 1
    FROM judged j
    JOIN public.teams t ON t.id = j.team_id
    JOIN public.seasons se ON se.id = j.season_id
   WHERE j.has_stored AND j.exc_key IS NULL AND j.map_key IS NULL
  UNION ALL
  SELECT 7, 'NOT inserted, total: no stored season row', '(count)', count(*)
    FROM judged j WHERE NOT j.has_stored AND j.exc_key IS NULL
  UNION ALL
  SELECT 7, 'NOT inserted: no stored season row',
         COALESCE(t.name, j.team_id::text) || ' / ' || se.name, 1
    FROM judged j
    LEFT JOIN public.teams t ON t.id = j.team_id
    JOIN public.seasons se ON se.id = j.season_id
   WHERE NOT j.has_stored AND j.exc_key IS NULL
  UNION ALL
  SELECT 8, 'NOT inserted: a row already existed',
         t.name || ' / ' || se.name, 1
    FROM wanted w
    JOIN public.teams t ON t.id = w.team_id
    JOIN public.seasons se ON se.id = w.season_id
   WHERE NOT EXISTS (SELECT 1 FROM ins i WHERE i.team_id = w.team_id AND i.season_id = w.season_id)
  UNION ALL
  SELECT 9, 'NOT inserted: exception team-season has no guessed or unrated game',
         t.name || ' / ' || se.name, 1
    FROM exception_rows e
    JOIN public.teams t ON t.id = e.team_id
    JOIN public.seasons se ON se.id = e.season_id
   WHERE NOT EXISTS (SELECT 1 FROM cand c WHERE c.team_id = e.team_id AND c.season_id = e.season_id)
     AND NOT EXISTS (SELECT 1 FROM public.power_score_division_override o
                      WHERE o.team_id = e.team_id AND o.season_id = e.season_id)
  UNION ALL
  SELECT 99, 'verdict',
         CASE WHEN (SELECT count(*) FROM ins) > 0 THEN 'Rows written. Now run the preview (03).'
              ELSE 'No new rows. Either this was already run, or nothing qualified. Read the lines above.' END,
         0
) r
ORDER BY r.ord, r.detail;
