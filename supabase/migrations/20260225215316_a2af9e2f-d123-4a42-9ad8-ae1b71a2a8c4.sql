
DO $$
DECLARE
  v_team record;
  v_match record;
BEGIN
  -- Step 1: DELETE (not just deactivate) all performance/streak/fun badges so re-inserts work
  DELETE FROM public.team_badge_events
  WHERE badge_type IN (
    'king_slayer', 'clutch_performer', 'consistent_performer',
    'hot_streak', 'cold_streak',
    'ice_cold', 'broom_crew', 'gatekeeper', 'chaos_agent', 'bully'
  );

  -- Step 2: Re-process badges for every team
  FOR v_team IN
    SELECT id FROM public.teams
  LOOP
    PERFORM public.award_streak_badges(v_team.id);
    PERFORM public.award_bully_badge(v_team.id);
    PERFORM public.award_consistent_performer_badge(v_team.id);
    PERFORM public.award_clutch_performer_badge(v_team.id);
    PERFORM public.award_ice_cold_badge(v_team.id);
    PERFORM public.award_broom_crew_badge(v_team.id);
    PERFORM public.award_gatekeeper_badge(v_team.id);
    PERFORM public.award_chaos_agent_badge(v_team.id);
  END LOOP;

  -- Step 3: Re-process kingslayer for every completed match
  FOR v_match IN
    SELECT winner_id, loser_id FROM public.matches
    WHERE iscompleted = true AND winner_id IS NOT NULL AND loser_id IS NOT NULL
    UNION ALL
    SELECT winner_id, loser_id FROM public.playoff_matches
    WHERE winner_id IS NOT NULL AND loser_id IS NOT NULL
  LOOP
    PERFORM public.award_kingslayer_badge(v_match.winner_id, v_match.loser_id);
  END LOOP;
END;
$$;
