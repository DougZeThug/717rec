-- Read-only check: which divisions does the career bonus treat as UNRATED?
--
-- NOT A MIGRATION. This file only reads. It changes no table, no function and no
-- stored number. Paste it into the Supabase SQL Editor and Run. See
-- docs/OPERATIONS.md section 6f.
--
-- EXPECT 0 ROWS ("Success. No rows returned"). Any row is a place where the
-- career bonus leaves a division out, because no weight can be found for it:
--
--   * season finish     a past champion, runner-up or playoff season whose
--                       division name is blank, matches no division, or matches
--                       a division that has no weight. A title or runner-up
--                       there adds 0 to the career bonus. A playoff season there
--                       is left out of the playoff weight average (a run with no
--                       rated season uses the team's current division).
--   * team              a team with no division, or whose division has no weight.
--                       Its own weight is unrated. It is only used when none of
--                       its past finishes is rated.
--   * bracket           a bracket with no division, or whose division has no
--                       weight. It is never counted as a competitive playoff win.
--   * playoff results   completed playoff matches that sit in a bracket with no
--                       division (or in no bracket at all).
--   * division          a division that exists but has no weight.
--
-- When there is at least one problem, the first row is a SUMMARY line with the
-- count. The rest are the rows themselves. Run this BEFORE renaming a division
-- (past seasons find their weight by division NAME) and AFTER using Edit
-- Divisions on a past season (a name typed there is free text).
--
-- KNOWN LIMIT (not new, not changed here): this check cannot see a rename of a
-- MULTI-WORD division. The name lookup falls through to the first word, so an old
-- "Competitive Low" title (0.95) still finds the division "Competitive" (1.00)
-- after "Competitive Low" is renamed. The name resolves, so no row appears, but
-- the weight has silently changed. A single-word rename (for example "Cuspers")
-- does become unrated and is flagged here.
--
-- It asks the real database function, public.resolve_division_bonus_weight(), so
-- the synthetic season labels ("Intermediate 1") and the rest of the name rules
-- are not copied here. On a database without migration 20261117120000 that
-- function still returns 0.85 for an unknown name, so this check finds nothing
-- for season finishes. Apply the migration first.

WITH problems AS (
  SELECT
    'season finish' AS what,
    se.name AS season,
    t.name AS team,
    s.division_name AS division_name_found,
    concat_ws(', ',
      CASE WHEN s.champion THEN 'champion' END,
      CASE WHEN s.runner_up THEN 'runner-up' END,
      CASE WHEN s.playoff_rank IS NOT NULL THEN 'playoff rank ' || s.playoff_rank END
    ) || ': ' ||
    CASE WHEN btrim(COALESCE(s.division_name, '')) = ''
         THEN 'the division name is blank'
         ELSE 'the name matches no division, or a division with no weight'
    END AS detail
  FROM public.team_season_stats s
  LEFT JOIN public.seasons se ON se.id = s.season_id
  LEFT JOIN public.teams t ON t.id = s.team_id
  WHERE (s.champion = true OR s.runner_up = true OR s.playoff_rank IS NOT NULL)
    AND public.resolve_division_bonus_weight(s.division_name) IS NULL

  UNION ALL

  SELECT
    'team',
    NULL,
    t.name,
    d.name,
    CASE WHEN t.division_id IS NULL THEN 'the team has no division'
         ELSE 'the team''s division has no weight'
    END
  FROM public.teams t
  LEFT JOIN public.divisions d ON d.id = t.division_id
  WHERE t.division_id IS NULL OR d.division_weight IS NULL

  UNION ALL

  SELECT
    'bracket',
    se.name,
    b.title,
    d.name,
    CASE WHEN b.division_id IS NULL THEN 'the bracket has no division'
         ELSE 'the bracket''s division has no weight'
    END
  FROM public.brackets b
  LEFT JOIN public.divisions d ON d.id = b.division_id
  LEFT JOIN public.seasons se ON se.id = b.season_id
  WHERE b.division_id IS NULL OR d.division_weight IS NULL

  UNION ALL

  SELECT
    'playoff results',
    NULL,
    NULL,
    NULL,
    count(*) || ' completed playoff match(es) sit in a bracket with no division, or in no bracket'
  FROM public.playoff_matches pm
  LEFT JOIN public.brackets b ON b.id = pm.bracket_id
  WHERE pm.winner_id IS NOT NULL
    AND (pm.bracket_id IS NULL OR b.division_id IS NULL)
  HAVING count(*) > 0

  UNION ALL

  SELECT
    'division',
    NULL,
    NULL,
    d.name,
    'the division exists but has no weight'
  FROM public.divisions d
  WHERE d.division_weight IS NULL
)
SELECT what, season, team, division_name_found, detail
FROM (
  SELECT 0 AS sort_order,
         'SUMMARY' AS what,
         NULL::text AS season,
         NULL::text AS team,
         NULL::text AS division_name_found,
         (SELECT count(*) FROM problems) || ' problem row(s) found below. Fix them, or tell the developer, before you rename a division.' AS detail
  WHERE EXISTS (SELECT 1 FROM problems)

  UNION ALL

  SELECT 1, what, season, team, division_name_found, detail
  FROM problems
) AS report
ORDER BY sort_order, what, season, team;
