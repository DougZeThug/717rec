-- Fix: Exclude current season from team_season_stats loop to avoid double-counting
-- with v_team_details (which also represents the current season).
-- Previously, the current season was counted once via team_season_stats and again
-- via v_team_details, inflating/deflating career scores toward current performance.

CREATE OR REPLACE FUNCTION public.calculate_career_power_score(p_team_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_total_weighted_score numeric := 0;
  v_total_matches int := 0;
  v_base_career_score numeric;
  v_championship_bonus numeric := 0;
  v_runner_up_bonus numeric := 0;
  v_playoff_bonus numeric := 0;
  v_competitive_playoff_bonus numeric := 0;
  v_total_playoff_bonus numeric;
  v_team_division_weight numeric;
  v_career_playoff_wins int := 0;
  v_career_playoff_losses int := 0;
  v_competitive_playoff_wins int := 0;
  v_playoff_win_rate numeric;
  v_total_playoff_matches int;
  v_season_rec record;
  v_current_rec record;
  v_champ_rec record;
  v_div_weight numeric;
  v_current_season_id uuid;
BEGIN
  -- Get team's current division weight
  SELECT d.division_weight INTO v_team_division_weight
  FROM public.teams t
  JOIN public.divisions d ON d.id = t.division_id
  WHERE t.id = p_team_id;

  IF v_team_division_weight IS NULL THEN
    v_team_division_weight := 0.25;
  END IF;

  -- Get the current active season ID
  SELECT id INTO v_current_season_id
  FROM public.seasons
  WHERE is_active = true
  LIMIT 1;

  -- Historical season power scores weighted by matches played
  -- EXCLUDE current season to avoid double-counting with v_team_details below
  FOR v_season_rec IN
    SELECT power_score, match_wins, match_losses
    FROM public.team_season_stats
    WHERE team_id = p_team_id
      AND power_score IS NOT NULL
      AND (v_current_season_id IS NULL OR season_id != v_current_season_id)
  LOOP
    DECLARE
      v_season_matches int;
    BEGIN
      v_season_matches := COALESCE(v_season_rec.match_wins, 0) + COALESCE(v_season_rec.match_losses, 0);
      IF v_season_matches > 0 THEN
        -- power_score is 0-1 scale, multiply by 100
        v_total_weighted_score := v_total_weighted_score + (v_season_rec.power_score * 100 * v_season_matches);
        v_total_matches := v_total_matches + v_season_matches;
      END IF;
    END;
  END LOOP;

  -- Current season data from v_team_details (power_score already 0-100)
  SELECT power_score, wins, losses INTO v_current_rec
  FROM public.v_team_details
  WHERE team_id = p_team_id;

  IF v_current_rec IS NOT NULL AND v_current_rec.power_score IS NOT NULL THEN
    DECLARE
      v_current_matches int;
    BEGIN
      v_current_matches := COALESCE(v_current_rec.wins, 0) + COALESCE(v_current_rec.losses, 0);
      IF v_current_matches > 0 THEN
        v_total_weighted_score := v_total_weighted_score + (v_current_rec.power_score * v_current_matches);
        v_total_matches := v_total_matches + v_current_matches;
      END IF;
    END;
  END IF;

  -- Base career score
  IF v_total_matches > 0 THEN
    v_base_career_score := v_total_weighted_score / v_total_matches;
  ELSE
    v_base_career_score := 50;
  END IF;

  -- Championship bonus scaled by division weight
  FOR v_champ_rec IN
    SELECT division_name FROM public.team_season_stats
    WHERE team_id = p_team_id AND champion = true
  LOOP
    v_div_weight := CASE
      WHEN lower(v_champ_rec.division_name) LIKE '%competitive%' THEN 1.0
      WHEN lower(v_champ_rec.division_name) LIKE '%intermediate high%'
        OR lower(v_champ_rec.division_name) LIKE '%intermediate 1%'
        OR lower(v_champ_rec.division_name) = 'cuspers' THEN 0.7
      WHEN lower(v_champ_rec.division_name) LIKE '%intermediate low%'
        OR lower(v_champ_rec.division_name) LIKE '%intermediate 2%'
        OR lower(v_champ_rec.division_name) = 'intermediate' THEN 0.45
      ELSE 0.25
    END;
    v_championship_bonus := v_championship_bonus + (7 * v_div_weight);
  END LOOP;

  -- Runner-up bonus scaled by division weight
  FOR v_champ_rec IN
    SELECT division_name FROM public.team_season_stats
    WHERE team_id = p_team_id AND runner_up = true
  LOOP
    v_div_weight := CASE
      WHEN lower(v_champ_rec.division_name) LIKE '%competitive%' THEN 1.0
      WHEN lower(v_champ_rec.division_name) LIKE '%intermediate high%'
        OR lower(v_champ_rec.division_name) LIKE '%intermediate 1%'
        OR lower(v_champ_rec.division_name) = 'cuspers' THEN 0.7
      WHEN lower(v_champ_rec.division_name) LIKE '%intermediate low%'
        OR lower(v_champ_rec.division_name) LIKE '%intermediate 2%'
        OR lower(v_champ_rec.division_name) = 'intermediate' THEN 0.45
      ELSE 0.25
    END;
    v_runner_up_bonus := v_runner_up_bonus + (4 * v_div_weight);
  END LOOP;

  -- Career playoff wins/losses
  SELECT
    COALESCE(SUM(CASE WHEN pm.winner_id = p_team_id THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN pm.loser_id = p_team_id THEN 1 ELSE 0 END), 0)
  INTO v_career_playoff_wins, v_career_playoff_losses
  FROM public.playoff_matches pm
  WHERE (pm.team1_id = p_team_id OR pm.team2_id = p_team_id)
    AND pm.winner_id IS NOT NULL;

  -- Competitive playoff wins
  SELECT COALESCE(COUNT(*), 0) INTO v_competitive_playoff_wins
  FROM public.playoff_matches pm
  JOIN public.brackets b ON b.id = pm.bracket_id
  JOIN public.divisions d ON d.id = b.division_id
  WHERE pm.winner_id = p_team_id
    AND d.division_weight >= 0.9;

  -- Playoff performance bonus
  v_total_playoff_matches := v_career_playoff_wins + v_career_playoff_losses;
  IF v_total_playoff_matches > 0 THEN
    v_playoff_win_rate := v_career_playoff_wins::numeric / v_total_playoff_matches;
    v_playoff_bonus := GREATEST(0, (v_playoff_win_rate - 0.5) * 4 * v_team_division_weight);
  END IF;

  -- Competitive playoff bonus
  v_competitive_playoff_bonus := v_competitive_playoff_wins * 0.5;

  -- Total playoff bonus capped at 15
  v_total_playoff_bonus := LEAST(15,
    v_championship_bonus + v_runner_up_bonus + v_playoff_bonus + v_competitive_playoff_bonus
  );

  RETURN LEAST(100, v_base_career_score + v_total_playoff_bonus);
END;
$function$;
