\set ON_ERROR_STOP on

-- B-33 coverage, in two halves:
--   * the badge rotation at season close must touch only that season, and must
--     never touch the permanent placement badges;
--   * closing a season must award runner-up and third place, not champions only.

BEGIN;

DO $$
DECLARE
  v_admin_id      uuid := '00000000-0000-0000-0000-0000000ca001';
  v_prior_season  uuid := '00000000-0000-0000-0000-0000000cb001';
  v_old_season    uuid := '00000000-0000-0000-0000-0000000cb002';
  v_division_id   uuid := '00000000-0000-0000-0000-0000000cc001';
  v_team1_id      uuid := '00000000-0000-0000-0000-0000000cd001';
  v_team2_id      uuid := '00000000-0000-0000-0000-0000000cd002';
  v_team3_id      uuid := '00000000-0000-0000-0000-0000000cd003';
  v_team4_id      uuid := '00000000-0000-0000-0000-0000000cd004';
  v_bracket_id    uuid := '00000000-0000-0000-0000-0000000ce001';
  v_count         integer;
BEGIN
  DELETE FROM public.team_badge_events WHERE team_id::text LIKE '00000000-0000-0000-0000-0000000cd%';
  DELETE FROM public.playoff_matches WHERE bracket_id = v_bracket_id;
  DELETE FROM public.participants WHERE bracket_id = v_bracket_id;
  DELETE FROM public.brackets WHERE id = v_bracket_id;
  DELETE FROM public.team_details_archive WHERE season_id IN (v_prior_season, v_old_season);
  DELETE FROM public.team_season_stats WHERE season_id IN (v_prior_season, v_old_season);
  DELETE FROM public.teams WHERE id::text LIKE '00000000-0000-0000-0000-0000000cd%';
  DELETE FROM public.divisions WHERE id = v_division_id;
  DELETE FROM public.seasons WHERE id IN (v_prior_season, v_old_season);
  DELETE FROM public.profiles WHERE id = v_admin_id;
  UPDATE public.seasons SET is_active = false WHERE is_active = true;

  PERFORM set_config('session_replication_role', 'replica', true);
  INSERT INTO public.profiles (id, username, full_name, is_admin)
  VALUES (v_admin_id, 'placement-admin', 'Placement Admin', true)
  ON CONFLICT (id) DO UPDATE SET is_admin = true;
  PERFORM set_config('session_replication_role', 'origin', true);

  INSERT INTO public.seasons (id, name, start_date, is_active, is_archived, playoffs_active) VALUES
    (v_prior_season, 'Placement Prior Season', '2025-01-01', false, true,  false),
    (v_old_season,   'Placement Old Season',   '2026-01-01', false, false, true);
  INSERT INTO public.divisions (id, name, display_division)
  VALUES (v_division_id, 'Placement Competitive', 'Placement Competitive');
  INSERT INTO public.teams (id, name, division_id, wins, losses, game_wins, game_losses) VALUES
    (v_team1_id, 'Placement Team 1', v_division_id, 0, 0, 0, 0),
    (v_team2_id, 'Placement Team 2', v_division_id, 0, 0, 0, 0),
    (v_team3_id, 'Placement Team 3', v_division_id, 0, 0, 0, 0),
    (v_team4_id, 'Placement Team 4', v_division_id, 0, 0, 0, 0);

  PERFORM auth.set_test_claims(v_admin_id);

  -- ---------------------------------------------------------------------------
  -- Half one: the rotation must be scoped to the season being closed.
  -- ---------------------------------------------------------------------------

  -- A championship won in an earlier, already-archived season.
  INSERT INTO public.team_badge_events (team_id, badge_type, season_id, is_active)
  VALUES (v_team1_id, 'competitive_champion', v_prior_season, true);
  -- A revocable badge earned in the season about to be closed.
  INSERT INTO public.team_badge_events (team_id, badge_type, season_id, is_active)
  VALUES (v_team1_id, 'hot_streak', v_old_season, true);

  INSERT INTO public.team_season_stats (season_id, team_id, match_wins, match_losses,
                                        game_wins, game_losses, division_name, recorded_at)
  VALUES
    (v_old_season, v_team1_id, 4, 1, 9, 4, 'Placement Competitive', now()),
    (v_old_season, v_team2_id, 3, 2, 8, 5, 'Placement Competitive', now()),
    (v_old_season, v_team3_id, 2, 3, 6, 7, 'Placement Competitive', now()),
    (v_old_season, v_team4_id, 1, 4, 4, 9, 'Placement Competitive', now());

  -- A real double-elimination bracket, so finalize_playoffs derives the
  -- placements itself rather than being handed them: team 1 wins the final,
  -- team 2 loses it, team 3 loses the losers-bracket final.
  INSERT INTO public.brackets (id, title, season_id, division_id, wb_champion_id, format)
  VALUES (v_bracket_id, 'Placement Competitive Bracket', v_old_season, v_division_id,
          v_team1_id, 'double_elimination');
  INSERT INTO public.participants (bracket_id, team_id, name) VALUES
    (v_bracket_id, v_team1_id, 'Placement Team 1'),
    (v_bracket_id, v_team2_id, 'Placement Team 2'),
    (v_bracket_id, v_team3_id, 'Placement Team 3'),
    (v_bracket_id, v_team4_id, 'Placement Team 4');
  INSERT INTO public.playoff_matches (bracket_id, match_type, round, position, status,
                                      team1_id, team2_id, winner_id, loser_id) VALUES
    (v_bracket_id, 'winners', 1, 1, 'completed', v_team1_id, v_team4_id, v_team1_id, v_team4_id),
    (v_bracket_id, 'winners', 2, 1, 'completed', v_team1_id, v_team2_id, v_team1_id, v_team2_id),
    (v_bracket_id, 'losers',  1, 1, 'completed', v_team3_id, v_team4_id, v_team3_id, v_team4_id),
    (v_bracket_id, 'losers',  2, 1, 'completed', v_team2_id, v_team3_id, v_team2_id, v_team3_id),
    (v_bracket_id, 'finals',  1, 1, 'completed', v_team1_id, v_team2_id, v_team1_id, v_team2_id);

  PERFORM public.finalize_playoffs(v_old_season, v_team1_id, v_team2_id, NULL);

  -- All three placings, straight off the bracket. Before the fix only the
  -- champion was written; runner-up and third place had no writer at all.
  IF NOT EXISTS (SELECT 1 FROM public.team_badge_events
                 WHERE team_id = v_team1_id AND badge_type = 'competitive_champion'
                   AND season_id = v_old_season AND is_active) THEN
    RAISE EXCEPTION 'finalize_playoffs did not write the champion badge';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.team_badge_events
                 WHERE team_id = v_team2_id AND badge_type = 'competitive_runner_up'
                   AND season_id = v_old_season AND is_active) THEN
    RAISE EXCEPTION 'finalize_playoffs did not write the runner-up badge';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.team_badge_events
                 WHERE team_id = v_team3_id AND badge_type = 'competitive_third_place'
                   AND season_id = v_old_season AND is_active) THEN
    RAISE EXCEPTION 'finalize_playoffs did not write the third-place badge';
  END IF;

  -- The bug: this UPDATE had no season filter, so closing one season switched off
  -- every active badge in the league -- including championships won years before.
  IF NOT EXISTS (
    SELECT 1 FROM public.team_badge_events
    WHERE team_id = v_team1_id AND badge_type = 'competitive_champion'
      AND season_id = v_prior_season AND is_active = true
  ) THEN
    RAISE EXCEPTION 'closing a season deactivated an earlier season''s championship badge';
  END IF;

  -- The rotation itself must still work for the season actually being closed.
  IF EXISTS (
    SELECT 1 FROM public.team_badge_events
    WHERE team_id = v_team1_id AND badge_type = 'hot_streak'
      AND season_id = v_old_season AND is_active = true
  ) THEN
    RAISE EXCEPTION 'closing a season did not rotate its own revocable badges';
  END IF;

  -- ---------------------------------------------------------------------------
  -- Half two: all three placings are written, not champions only.
  --
  -- finalize_playoffs recomputes the placements from the bracket and this fixture
  -- has none, so set them directly and call the writer the routines now share.
  -- ---------------------------------------------------------------------------
  UPDATE public.team_season_stats SET champion = true,  playoff_rank = 1
   WHERE season_id = v_old_season AND team_id = v_team1_id;
  UPDATE public.team_season_stats SET runner_up = true, playoff_rank = 2
   WHERE season_id = v_old_season AND team_id = v_team2_id;
  UPDATE public.team_season_stats SET playoff_rank = 3
   WHERE season_id = v_old_season AND team_id = v_team3_id;
  -- Fourth place earns nothing.
  UPDATE public.team_season_stats SET playoff_rank = 4
   WHERE season_id = v_old_season AND team_id = v_team4_id;

  PERFORM public.award_season_placement_badges(v_old_season);

  IF NOT EXISTS (SELECT 1 FROM public.team_badge_events
                 WHERE team_id = v_team1_id AND badge_type = 'competitive_champion'
                   AND season_id = v_old_season AND is_active) THEN
    RAISE EXCEPTION 'champion badge was not written';
  END IF;
  -- Before the fix nothing anywhere wrote either of these two.
  IF NOT EXISTS (SELECT 1 FROM public.team_badge_events
                 WHERE team_id = v_team2_id AND badge_type = 'competitive_runner_up'
                   AND season_id = v_old_season AND is_active) THEN
    RAISE EXCEPTION 'runner-up badge was not written';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.team_badge_events
                 WHERE team_id = v_team3_id AND badge_type = 'competitive_third_place'
                   AND season_id = v_old_season AND is_active) THEN
    RAISE EXCEPTION 'third-place badge was not written';
  END IF;
  IF EXISTS (SELECT 1 FROM public.team_badge_events
             WHERE team_id = v_team4_id AND season_id = v_old_season) THEN
    RAISE EXCEPTION 'fourth place was given a placement badge';
  END IF;

  -- Idempotent: the old champion INSERT had no ON CONFLICT clause and raised
  -- 23505 on any re-run.
  PERFORM public.award_season_placement_badges(v_old_season);
  SELECT count(*) INTO v_count FROM public.team_badge_events
   WHERE season_id = v_old_season AND badge_type::text LIKE 'competitive_%';
  IF v_count <> 3 THEN
    RAISE EXCEPTION 're-running the placement writer duplicated badges (found %)', v_count;
  END IF;

  -- A single-elimination bracket ranks nobody third -- there is no losers-bracket
  -- final -- so no third-place badge is due. Pin that: rank 3 unset means no badge.
  UPDATE public.team_badge_events SET is_active = false
   WHERE season_id = v_old_season AND badge_type = 'competitive_third_place';
  UPDATE public.team_season_stats SET playoff_rank = 4
   WHERE season_id = v_old_season AND team_id = v_team3_id;
  PERFORM public.award_season_placement_badges(v_old_season);
  IF EXISTS (SELECT 1 FROM public.team_badge_events
             WHERE team_id = v_team3_id AND badge_type = 'competitive_third_place'
               AND season_id = v_old_season AND is_active) THEN
    RAISE EXCEPTION 'third place was awarded when the bracket ranked nobody third';
  END IF;

  RAISE NOTICE 'season placement badge smoke test passed';
END;
$$;

ROLLBACK;
