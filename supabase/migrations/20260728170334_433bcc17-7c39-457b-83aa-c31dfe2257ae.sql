CREATE OR REPLACE FUNCTION public.award_bully_badge(p_team_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_active_season_id uuid;
  v_team_division_weight numeric;
  v_bully_match_wins int := 0;
  v_should_have_badge boolean := false;
  v_existing_badge_id uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_active_season_id FROM public.seasons WHERE is_active = true LIMIT 1;

  IF v_active_season_id IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'No active season');
  END IF;

  SELECT d.division_weight INTO v_team_division_weight
  FROM public.teams t
  JOIN public.divisions d ON d.id = t.division_id
  WHERE t.id = p_team_id;

  IF v_team_division_weight IS NULL THEN
    RETURN jsonb_build_object('awarded', false, 'reason', 'Team has no division');
  END IF;

  -- Count MATCH wins against teams with 0.20+ lower division weight (weights are on a 0-1 scale)
  SELECT COALESCE(COUNT(*), 0) INTO v_bully_match_wins
  FROM public.matches m
  JOIN public.teams opp_team ON opp_team.id =
    CASE WHEN m.team1_id = p_team_id THEN m.team2_id ELSE m.team1_id END
  JOIN public.divisions opp_div ON opp_div.id = opp_team.division_id
  WHERE (m.team1_id = p_team_id OR m.team2_id = p_team_id)
    AND m.winner_id = p_team_id
    AND m.iscompleted = true
    AND m.season_id = v_active_season_id
    AND (v_team_division_weight - opp_div.division_weight) > 0.20;

  v_should_have_badge := (v_bully_match_wins >= 4);

  SELECT id INTO v_existing_badge_id
  FROM public.team_badge_events
  WHERE team_id = p_team_id
    AND badge_type = 'bully'
    AND season_id = v_active_season_id
    AND is_active = true;

  IF v_should_have_badge AND v_existing_badge_id IS NULL THEN
    INSERT INTO public.team_badge_events (team_id, badge_type, season_id, metadata, is_active)
    VALUES (p_team_id, 'bully', v_active_season_id,
            jsonb_build_object('match_wins_vs_lower_division', v_bully_match_wins), true);
    v_result := jsonb_build_object('awarded', true, 'badge_type', 'bully');
  ELSIF NOT v_should_have_badge AND v_existing_badge_id IS NOT NULL THEN
    UPDATE public.team_badge_events SET is_active = false WHERE id = v_existing_badge_id;
    v_result := jsonb_build_object('removed', true, 'badge_type', 'bully');
  ELSE
    v_result := jsonb_build_object('no_change', true, 'match_wins_vs_lower', v_bully_match_wins);
  END IF;

  RETURN v_result;
END;
$function$;