-- Division truth, script 02a: DRY RUN of script 02 (hand-apply step 3, read-only).
--
-- NOT A MIGRATION. Paste the WHOLE file into the Supabase SQL Editor and run it.
-- It WRITES NOTHING. Run it AFTER the migration (step 2) and BEFORE script 02.
-- Doug looks at the list. If it looks right, run script 02.
-- Once script 07 has retired the backup, this list ends with a CHECK row for the
-- missing backup table: script 02 was a one-time job and cannot run any more.
--
-- It lists the exact rows script 02 would insert, and what script 02 would skip.
-- It uses the SAME selection and the SAME map as script 02: both files hold one
-- block of SQL (marked SHARED BLOCK) that must stay word for word identical. A
-- test (supabase/tests/division_truth_scripts.sql) checks that the rows listed
-- here are the rows script 02 inserts.
--
-- THE COLUMNS
--   action             INSERT = script 02 would write this row.
--                      SKIP = it would not (the reason follows).
--                      CHECK = something that would make script 02 stop.
--   season, team       the opponent team-season
--   stored_label       the name the team had for that season (team_season_stats)
--   assigned_division  the division Doug's map gives it (or the exception list)
--   weight             that division's weight today
--   games_affected     games that team-season faces that the Power Score rates by
--                      a guess or not at all today (these are the games that change)
--
-- SORTED by stored_label, then team, so Doug can read all the "Intermediate 1"
-- teams together, then all the "Intermediate 2" teams. EYEBALL THESE TWO LISTS.
-- The order Intermediate 1 = Intermediate High, Intermediate 2 = Intermediate Low is
-- believed, not proven, in all three old seasons (there are no playoff brackets).
--
-- The result is the only thing the editor shows. INSERT rows first, then SKIP
-- and CHECK rows.

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
-- The rows script 02 would insert: the same rows, minus those that already exist.
would_insert AS (
  SELECT w.* FROM wanted w
  WHERE NOT EXISTS (SELECT 1 FROM public.power_score_division_override o
                     WHERE o.team_id = w.team_id AND o.season_id = w.season_id)
),
-- Things that would make script 02 stop, shown instead of stopping.
map_check AS (
  SELECT k.division_key, count(dr.id) AS n
  FROM (VALUES ('competitive'), ('recreational'), ('intermediate high'),
               ('intermediate low'), ('intermediate'), ('recreational high')) k(division_key)
  LEFT JOIN public.v_division_rateable dr ON lower(btrim(dr.name)) = k.division_key
  GROUP BY k.division_key
)
SELECT r.action, r.season, r.team, r.stored_label, r.assigned_division, r.weight, r.games_affected
FROM (
  -- 1. the rows that would be inserted
  SELECT 1 AS grp, 'INSERT' AS action, se.start_date AS season_date, se.name AS season, t.name AS team,
         COALESCE(w.stored_label, '(no stored row)') AS stored_label,
         d.name AS assigned_division, d.division_weight AS weight, w.games_affected
  FROM would_insert w
  JOIN public.seasons se ON se.id = w.season_id
  JOIN public.teams t ON t.id = w.team_id
  JOIN public.divisions d ON d.id = w.division_id
  UNION ALL
  -- 2. skipped: the stored name is not in the map
  SELECT 2, 'SKIP: stored name not in the map', se.start_date, se.name, t.name,
         COALESCE(btrim(j.stored_name), ''), '(none)', NULL, j.weak_games
  FROM judged j
  JOIN public.teams t ON t.id = j.team_id
  JOIN public.seasons se ON se.id = j.season_id
  WHERE j.has_stored AND j.exc_key IS NULL AND j.map_key IS NULL
  UNION ALL
  -- 3. skipped: no stored season row
  SELECT 3, 'SKIP: no stored season row', se.start_date, se.name, COALESCE(t.name, j.team_id::text),
         '(no stored row)', '(none)', NULL, j.weak_games
  FROM judged j
  LEFT JOIN public.teams t ON t.id = j.team_id
  JOIN public.seasons se ON se.id = j.season_id
  WHERE NOT j.has_stored AND j.exc_key IS NULL
  UNION ALL
  -- 4. skipped: the row already exists
  SELECT 4, 'SKIP: a row already exists', se.start_date, se.name, t.name,
         COALESCE(w.stored_label, '(no stored row)'), d.name, d.division_weight, w.games_affected
  FROM wanted w
  JOIN public.seasons se ON se.id = w.season_id
  JOIN public.teams t ON t.id = w.team_id
  JOIN public.divisions d ON d.id = w.division_id
  WHERE NOT EXISTS (SELECT 1 FROM would_insert x WHERE x.team_id = w.team_id AND x.season_id = w.season_id)
  UNION ALL
  -- 5. skipped: an exception team-season that has no guessed or unrated game
  SELECT 5, 'SKIP: exception, but no guessed or unrated game', se.start_date, se.name, t.name,
         COALESCE((SELECT btrim(s.division_name) FROM public.team_season_stats s
                    WHERE s.season_id = e.season_id AND s.team_id = e.team_id), '(no stored row)'),
         '(none)', NULL, 0
  FROM exception_rows e
  JOIN public.teams t ON t.id = e.team_id
  JOIN public.seasons se ON se.id = e.season_id
  WHERE NOT EXISTS (SELECT 1 FROM cand c WHERE c.team_id = e.team_id AND c.season_id = e.season_id)
    AND NOT EXISTS (SELECT 1 FROM public.power_score_division_override o
                     WHERE o.team_id = e.team_id AND o.season_id = e.season_id)
  UNION ALL
  -- 6. checks: script 02 would STOP
  SELECT 6, 'CHECK: script 02 would STOP', NULL, '', 'division "' || m.division_key || '"',
         'matches ' || m.n || ' rateable divisions (must be 1)', NULL, NULL, NULL
  FROM map_check m WHERE m.n <> 1
  UNION ALL
  SELECT 6, 'CHECK: script 02 would STOP', NULL, '', 'team "Here for Fireball"',
         'matches ' || n.n || ' teams (must be 1)', NULL, NULL, NULL
  FROM (SELECT count(*) AS n FROM public.teams WHERE lower(btrim(name)) = 'here for fireball') n
  WHERE n.n <> 1
  UNION ALL
  SELECT 6, 'CHECK: script 02 would STOP', NULL, '', 'backup table',
         'the backup was retired; script 02 was a one-time job; later override rows are added by hand (see docs/OPERATIONS.md section 6g)', NULL, NULL, NULL
  WHERE to_regclass('public.team_season_stats_pre_division_truth') IS NULL
  UNION ALL
  -- One of the 3 dropped-out teams is not in the teams table. The list above would
  -- leave its explicit row out without a word, but script 02 stops.
  SELECT 6, 'CHECK: script 02 would STOP (a dropped-out team is missing)', NULL, '', e.team_name,
         'no team has the id ' || e.team_id, NULL, NULL, NULL
  FROM (VALUES ('Shut Your Cornhole',  '5db6b718-81af-4bd0-a0cd-0a0eae4330ad'::uuid),
               ('Red Roof Rockets',    'e91cb2d1-ef48-48e7-b15f-735c941f3679'::uuid),
               ('The Tomato Saucers',  'accd6e20-f761-4769-8cdc-6c9495cc231c'::uuid)) e(team_name, team_id)
  WHERE NOT EXISTS (SELECT 1 FROM public.teams t WHERE t.id = e.team_id)
  UNION ALL
  -- One of the 6 seasons is not in the seasons table. Script 02 stops.
  SELECT 6, 'CHECK: script 02 would STOP (a season is missing)', NULL, '', v.season_name,
         'no season has the id ' || v.season_id, NULL, NULL, NULL
  FROM (VALUES ('Spring 2025',   'd6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a'::uuid),
               ('Summer 1 2025', 'e537c594-3ba9-4d79-ba63-f6ed90c89e30'::uuid),
               ('Summer 2 2025', 'd50bb12e-99be-4170-802a-695a402373ce'::uuid),
               ('Fall 2025',     '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'::uuid),
               ('Winter 1 2026', '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106'::uuid),
               ('Winter 2 2026', '9cd55eb8-672c-4a43-a9df-3552a7759cca'::uuid)) v(season_name, season_id)
  WHERE NOT EXISTS (SELECT 1 FROM public.seasons se WHERE se.id = v.season_id)
) r
ORDER BY r.grp, lower(r.stored_label), r.team, r.season_date;
