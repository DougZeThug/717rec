-- Division truth, script 00: PRECHECK (hand-apply: run right before step 3, read-only).
--
-- NOT A MIGRATION. Paste the WHOLE file into the Supabase SQL Editor and run it.
-- It reads only. It changes nothing. Run it again right before step 3 (writing the
-- override rows): a season could have been un-archived since you last looked.
--
-- WHY. The fix is safe because the six seasons are CLOSED (archived) and hold no
-- regular-season games. Then the stored scores change only when you run the
-- recompute (step 6). If a season is NOT archived, the next match scored in the
-- league rewrites that season's stored numbers by itself, with no preview.
--
-- WHAT TO WANT. Every row ends with PASS in the last column. CHECK means stop and
-- tell the developer. If any row says CHECK, do NOT go on to step 3.
--
--   U1 editor and view   role=postgres   bypass_rls=true   view_owner=postgres
--                        options={security_invoker=on}     has_history_step=true
--                        history_table=true  distrust_table=true  rateable_view=true
--   U2 <season>          is_archived=true  regular_games=0   (one row per season,
--                        six rows: Spring 2025, Summer 1 2025, Summer 2 2025,
--                        Fall 2025, Winter 1 2026, Winter 2 2026)
--   U4 <division>        a weight (not empty) and history_rows=1. Six divisions:
--                        Competitive, Recreational, Intermediate High,
--                        Intermediate Low, Intermediate, Recreational High.
--                        One history row means TODAY's weight is the weight that
--                        applied on every old game date. A name shown twice means
--                        two divisions share it: script 02 would stop.
--   U5 no row ...        NO such rows. A row here is an old team-season whose stored
--                        name is not in Doug's map: script 02 would give it no row.
--                        The last line "U5 summary" says "none" when all is well.
--
-- The result list is the only thing the editor shows.

SELECT check_name, result,
       CASE WHEN verdict THEN 'PASS' ELSE 'CHECK' END AS verdict
FROM (
  SELECT 1 AS k1, NULL::date AS k2, 'U1 editor and view' AS check_name,
         concat_ws(' | ',
           'role=' || current_user,
           'bypass_rls=' || COALESCE((SELECT rolbypassrls::text FROM pg_roles WHERE rolname = current_user), '?'),
           'view_owner=' || COALESCE((SELECT viewowner FROM pg_views WHERE schemaname = 'public' AND viewname = 'v_power_score_team_matches_rated'), '?'),
           'options=' || COALESCE((SELECT reloptions::text FROM pg_class WHERE oid = 'public.v_power_score_team_matches_rated'::regclass), 'none'),
           'has_history_step=' || (position('division_history' IN pg_get_viewdef('public.v_power_score_team_matches_rated'::regclass)) > 0)::text,
           'history_table=' || (to_regclass('public.team_division_history') IS NOT NULL)::text,
           'distrust_table=' || (to_regclass('public.division_archive_distrust') IS NOT NULL)::text,
           'rateable_view=' || (to_regclass('public.v_division_rateable') IS NOT NULL)::text
         ) AS result,
         (
           COALESCE((SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user), false)
           AND COALESCE((SELECT 'security_invoker=on' = ANY (reloptions) FROM pg_class
                          WHERE oid = 'public.v_power_score_team_matches_rated'::regclass), false)
           AND position('division_history' IN pg_get_viewdef('public.v_power_score_team_matches_rated'::regclass)) > 0
           AND to_regclass('public.team_division_history') IS NOT NULL
           AND to_regclass('public.division_archive_distrust') IS NOT NULL
           AND to_regclass('public.v_division_rateable') IS NOT NULL
         ) AS verdict
  UNION ALL
  SELECT 2, se.start_date, 'U2 ' || se.name,
         'is_archived=' || COALESCE(se.is_archived::text, 'null') ||
         ' regular_games=' || (SELECT count(*) FROM public.v_power_score_team_matches m
                                WHERE m.season_id = se.id AND m.source = 'regular')::text,
         COALESCE(se.is_archived, false)
           AND (SELECT count(*) FROM public.v_power_score_team_matches m
                 WHERE m.season_id = se.id AND m.source = 'regular') = 0
  FROM public.seasons se
  WHERE se.id IN ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a','e537c594-3ba9-4d79-ba63-f6ed90c89e30',
                  'd50bb12e-99be-4170-802a-695a402373ce','34cd19e2-abf5-43b8-a16f-6d73a0e998ac',
                  '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106','9cd55eb8-672c-4a43-a9df-3552a7759cca')
  UNION ALL
  SELECT 2, NULL, 'U2 seasons found',
         count(*)::text || ' of 6',
         count(*) = 6
  FROM public.seasons se
  WHERE se.id IN ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a','e537c594-3ba9-4d79-ba63-f6ed90c89e30',
                  'd50bb12e-99be-4170-802a-695a402373ce','34cd19e2-abf5-43b8-a16f-6d73a0e998ac',
                  '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106','9cd55eb8-672c-4a43-a9df-3552a7759cca')
  UNION ALL
  SELECT 3, NULL, 'U4 ' || d.name,
         'weight=' || COALESCE(d.division_weight::text, 'NONE') || ' history_rows=' || count(h.*)::text,
         d.division_weight IS NOT NULL AND count(h.*) = 1
           AND (SELECT count(*) FROM public.divisions d2
                 WHERE lower(btrim(d2.name)) = lower(btrim(d.name))) = 1
  FROM public.divisions d
  LEFT JOIN public.division_weight_history h ON h.division_id = d.id
  WHERE lower(btrim(d.name)) IN ('competitive','recreational','intermediate high','intermediate low','intermediate','recreational high')
  GROUP BY d.id, d.name, d.division_weight
  UNION ALL
  SELECT 3, NULL, 'U4 divisions found',
         count(DISTINCT lower(btrim(d.name)))::text || ' of 6 names',
         count(DISTINCT lower(btrim(d.name))) = 6
  FROM public.divisions d
  WHERE lower(btrim(d.name)) IN ('competitive','recreational','intermediate high','intermediate low','intermediate','recreational high')
  UNION ALL
  SELECT 4, se.start_date, 'U5 no row: ' || se.name,
         t.name || ' (stored name: ' || COALESCE(s.division_name, '(blank)') || ')',
         false
  FROM public.team_season_stats s
  JOIN public.seasons se ON se.id = s.season_id
  JOIN public.teams t ON t.id = s.team_id
  WHERE s.season_id IN ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a','e537c594-3ba9-4d79-ba63-f6ed90c89e30','d50bb12e-99be-4170-802a-695a402373ce')
    AND lower(btrim(COALESCE(s.division_name, ''))) NOT IN ('competitive','recreational','intermediate 1','intermediate 2','intermediate')
  UNION ALL
  SELECT 5, NULL, 'U5 summary',
         CASE WHEN n.n = 0 THEN 'none' ELSE n.n || ' old team-seasons have a stored name that is not in the map (listed above)' END,
         n.n = 0
  FROM (SELECT count(*) AS n
        FROM public.team_season_stats s
        WHERE s.season_id IN ('d6f67c01-1d50-4f2c-9b0e-e1dfefa89a2a','e537c594-3ba9-4d79-ba63-f6ed90c89e30','d50bb12e-99be-4170-802a-695a402373ce')
          AND lower(btrim(COALESCE(s.division_name, ''))) NOT IN ('competitive','recreational','intermediate 1','intermediate 2','intermediate')) n
) x
ORDER BY k1, k2, check_name, result;
