-- Return team and winner ids from get_opponent_match_history.
--
-- The function returned names only. OpponentHistoryModal therefore had to decide
-- W/L by comparing winner_name against the opponent's name, which is wrong
-- whenever two teams share a name: public.teams.name has no unique constraint,
-- so winner_name equals the opponent's name for BOTH outcomes and every
-- non-tie reads as a loss. A rename landing between the two reads could flip a
-- result the same way.
--
-- Ids are already in hand inside the function (winner_id, team1_id, team2_id on
-- all three sources), so this only surfaces them. winner_name stays for
-- display and for any other caller.
--
-- winner_id is normalised the same way winner_name always was: NULL unless it
-- matches one of the two teams in the row, so a match with no winner (a tie)
-- stays NULL rather than leaking an unrelated id.
--
-- RETURNS TABLE changes shape, so the function must be dropped first; CREATE OR
-- REPLACE cannot change a return type.
--
-- This also repairs a fault the function has carried since it was created in
-- 20250906000458: playoff_matches.team1_score/team2_score are numeric while the
-- matches and matches_archive columns are integer, so UNION ALL resolved those
-- output columns to numeric and every call raised "structure of query does not
-- match function result type". The dialog that calls it therefore rendered
-- nothing at all. The playoff branch now casts to integer.

DROP FUNCTION IF EXISTS public.get_opponent_match_history(uuid, uuid);

CREATE FUNCTION public.get_opponent_match_history(p_team_id uuid, p_opponent_id uuid)
RETURNS TABLE(
  id uuid,
  date timestamp with time zone,
  team1_id uuid,
  team2_id uuid,
  team1_name text,
  team2_name text,
  team1_score integer,
  team2_score integer,
  team1_game_wins integer,
  team2_game_wins integer,
  winner_id uuid,
  winner_name text,
  location text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH all_matches AS (
    -- Regular season matches from matches table
    SELECT
      m.id,
      m.date,
      m.team1_id,
      m.team2_id,
      t1.name as team1_name,
      t2.name as team2_name,
      m.team1_score,
      m.team2_score,
      m.team1_game_wins,
      m.team2_game_wins,
      CASE
        WHEN m.winner_id = m.team1_id THEN m.team1_id
        WHEN m.winner_id = m.team2_id THEN m.team2_id
        ELSE NULL
      END as winner_id,
      CASE
        WHEN m.winner_id = m.team1_id THEN t1.name
        WHEN m.winner_id = m.team2_id THEN t2.name
        ELSE NULL
      END as winner_name,
      m.location
    FROM public.matches m
    JOIN public.teams t1 ON m.team1_id = t1.id
    JOIN public.teams t2 ON m.team2_id = t2.id
    WHERE m.iscompleted = true
      AND (
        (m.team1_id = p_team_id AND m.team2_id = p_opponent_id) OR
        (m.team1_id = p_opponent_id AND m.team2_id = p_team_id)
      )

    UNION ALL

    -- Archived matches from matches_archive table
    SELECT
      ma.id,
      ma.date,
      ma.team1_id,
      ma.team2_id,
      t1.name as team1_name,
      t2.name as team2_name,
      ma.team1_score,
      ma.team2_score,
      ma.team1_game_wins,
      ma.team2_game_wins,
      CASE
        WHEN ma.winner_id = ma.team1_id THEN ma.team1_id
        WHEN ma.winner_id = ma.team2_id THEN ma.team2_id
        ELSE NULL
      END as winner_id,
      CASE
        WHEN ma.winner_id = ma.team1_id THEN t1.name
        WHEN ma.winner_id = ma.team2_id THEN t2.name
        ELSE NULL
      END as winner_name,
      ma.location
    FROM public.matches_archive ma
    JOIN public.teams t1 ON ma.team1_id = t1.id
    JOIN public.teams t2 ON ma.team2_id = t2.id
    WHERE ma.iscompleted = true
      AND (
        (ma.team1_id = p_team_id AND ma.team2_id = p_opponent_id) OR
        (ma.team1_id = p_opponent_id AND ma.team2_id = p_team_id)
      )

    UNION ALL

    -- Playoff matches from playoff_matches table
    SELECT
      pm.id,
      pm.created_at as date,
      pm.team1_id,
      pm.team2_id,
      t1.name as team1_name,
      t2.name as team2_name,
      -- playoff_matches.team1_score/team2_score are numeric while the same
      -- columns on matches and matches_archive are integer. UNION ALL resolves
      -- the branch types to numeric, which does not match the integer declared
      -- below, so every call raised "structure of query does not match function
      -- result type" before these casts. Scores are whole numbers everywhere
      -- else in the schema.
      pm.team1_score::integer,
      pm.team2_score::integer,
      -- For playoff matches, calculate game wins from the scores
      CASE WHEN pm.team1_score IS NOT NULL THEN pm.team1_score ELSE 0 END::integer as team1_game_wins,
      CASE WHEN pm.team2_score IS NOT NULL THEN pm.team2_score ELSE 0 END::integer as team2_game_wins,
      CASE
        WHEN pm.winner_id = pm.team1_id THEN pm.team1_id
        WHEN pm.winner_id = pm.team2_id THEN pm.team2_id
        ELSE NULL
      END as winner_id,
      CASE
        WHEN pm.winner_id = pm.team1_id THEN t1.name
        WHEN pm.winner_id = pm.team2_id THEN t2.name
        ELSE NULL
      END as winner_name,
      NULL::text as location
    FROM public.playoff_matches pm
    JOIN public.teams t1 ON pm.team1_id = t1.id
    JOIN public.teams t2 ON pm.team2_id = t2.id
    WHERE pm.winner_id IS NOT NULL
      AND (
        (pm.team1_id = p_team_id AND pm.team2_id = p_opponent_id) OR
        (pm.team1_id = p_opponent_id AND pm.team2_id = p_team_id)
      )
  )
  SELECT
    all_matches.id,
    all_matches.date,
    all_matches.team1_id,
    all_matches.team2_id,
    all_matches.team1_name,
    all_matches.team2_name,
    all_matches.team1_score,
    all_matches.team2_score,
    all_matches.team1_game_wins,
    all_matches.team2_game_wins,
    all_matches.winner_id,
    all_matches.winner_name,
    all_matches.location
  FROM all_matches
  ORDER BY all_matches.date DESC NULLS LAST
  LIMIT 20;
END;
$function$;
