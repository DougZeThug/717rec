-- Carry the match date through the power-score match views.
--
-- Preparation only. No behaviour changes here: nothing reads match_date yet.
-- The follow-up migration uses it to resolve each opponent's division as of the
-- date the match was played, instead of using whatever division that team
-- happens to be in today.
--
-- Column source per branch:
--   regular   matches.date
--   archived  matches_archive.date
--   playoff   playoff_matches has no date column at all, so fall back through
--             updated_at -> created_at -> the bracket's created_at. Playoffs run
--             at the end of a season, so any of these lands inside the final
--             week of that season, which is the resolution the lookup needs.
--
-- matches.date is the SCHEDULED date, not a completion timestamp -- no
-- completion timestamp exists anywhere in the schema. A match played well after
-- it was scheduled can therefore land in the wrong week. The error window is one
-- week, and a team almost never changes division inside one week, so this is
-- accepted rather than worked around.
--
-- New columns are appended at the END of each select list, which is what
-- CREATE OR REPLACE VIEW allows. Do not reorder the existing columns.

-- ---------------------------------------------------------------------------
-- 1. The shared source.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_power_score_match_source
WITH (security_invoker = on) AS
SELECT
  m.id,
  m.season_id,
  m.team1_id,
  m.team2_id,
  -- Left raw, not coalesced: the regular-season half must stay byte-equivalent
  -- to what the current consumers already compute.
  m.team1_game_wins,
  m.team2_game_wins,
  m.winner_id,
  m.loser_id,
  'regular'::text AS source,
  m."date" AS match_date
FROM public.matches m
WHERE m.iscompleted = true
  AND m.season_id IS NOT NULL

UNION ALL

SELECT
  ma.id,
  ma.season_id,
  ma.team1_id,
  ma.team2_id,
  ma.team1_game_wins,
  ma.team2_game_wins,
  ma.winner_id,
  ma.loser_id,
  'archived'::text AS source,
  ma."date"
FROM public.matches_archive ma
WHERE ma.iscompleted = true
  AND ma.season_id IS NOT NULL

UNION ALL

SELECT
  pm.id,
  b.season_id,
  pm.team1_id,
  pm.team2_id,
  -- playoff_matches.team1_score/team2_score hold GAME WINS, the same unit as
  -- matches.team1_game_wins/team2_game_wins.
  COALESCE(pm.team1_score, 0) AS team1_game_wins,
  COALESCE(pm.team2_score, 0) AS team2_game_wins,
  pm.winner_id,
  pm.loser_id,
  'playoff'::text AS source,
  COALESCE(pm.updated_at, pm.created_at, b.created_at)
FROM public.playoff_matches pm
JOIN public.brackets b ON b.id = pm.bracket_id
WHERE pm.winner_id IS NOT NULL
  -- Bye exclusion: a bye is a row with a winner and no opponent. Counting one
  -- hands the team a free win, which is what v_team_season_agg does today.
  AND pm.team1_id IS NOT NULL
  AND pm.team2_id IS NOT NULL
  AND b.season_id IS NOT NULL;

COMMENT ON VIEW public.v_power_score_match_source IS
  'Every completed match across matches, matches_archive and playoff_matches, '
  'shaped like public.matches. Playoff byes are excluded. Canonical input for '
  'power score. match_date is the scheduled date for regular and archived rows, '
  'and a best-effort timestamp for playoff rows.';

-- ---------------------------------------------------------------------------
-- 2. The live-season scope. Re-issued because its SELECT * was expanded to an
--    explicit column list when the view was created, so it does not pick up the
--    new column on its own.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_power_score_match_source_current
WITH (security_invoker = on) AS
SELECT *
FROM public.v_power_score_match_source
WHERE source = 'regular'
   OR (
     source = 'playoff'
     AND season_id = public.current_standings_season_id()
   );

COMMENT ON VIEW public.v_power_score_match_source_current IS
  'v_power_score_match_source limited to the live season: all regular-season rows '
  'plus playoff rows for the current standings season only.';

-- ---------------------------------------------------------------------------
-- 3. Per-team unpivot. Same shape as before, plus match_date.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_power_score_team_matches
WITH (security_invoker = on) AS
SELECT
  src.id AS match_id,
  src.season_id,
  src.source,
  src.team1_id AS team_id,
  src.team2_id AS opponent_id,
  (src.winner_id = src.team1_id) AS is_win,
  (src.winner_id IS NOT NULL AND src.winner_id <> src.team1_id) AS is_loss,
  COALESCE(src.team1_game_wins, 0) AS game_wins,
  COALESCE(src.team2_game_wins, 0) AS game_losses,
  src.match_date
FROM public.v_power_score_match_source src
WHERE src.team1_id IS NOT NULL

UNION ALL

SELECT
  src.id,
  src.season_id,
  src.source,
  src.team2_id,
  src.team1_id,
  (src.winner_id = src.team2_id),
  (src.winner_id IS NOT NULL AND src.winner_id <> src.team2_id),
  COALESCE(src.team2_game_wins, 0),
  COALESCE(src.team1_game_wins, 0),
  src.match_date
FROM public.v_power_score_match_source src
WHERE src.team2_id IS NOT NULL;

COMMENT ON VIEW public.v_power_score_team_matches IS
  'One row per team per match, with the opponent and that match''s date. Feeds '
  'the power score component views.';