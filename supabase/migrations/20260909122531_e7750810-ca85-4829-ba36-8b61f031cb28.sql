-- Scope the league-wide team counter reset to the season actually being played.
--
-- `public.teams.wins / losses / game_wins / game_losses` are the LIVE standings
-- for the whole league. They carry no season id, so they only ever describe the
-- season in progress; `team_season_stats` holds the per-season history.
--
-- Both archive functions ended with an unconditional
--
--     UPDATE public.teams SET wins = 0, ... WHERE id IS NOT NULL;
--
-- which is correct when the season being archived is the current one — the
-- league is starting over — and destructive otherwise. It was safe only because
-- the UI offered Archive on the active season alone. The Seasons screen now
-- offers it on any season that is not yet archived (UX audit A-12 / Q30), so
-- archiving a 2024 season would have zeroed every team's current record.
--
-- Both functions now read `is_active` first and reset the counters only when the
-- season being archived is the active one. `archive_season` also stops stamping
-- CURRENT_DATE on a season that already has an end date, which would have shown
-- today's date against an old season on the History page.
--
-- Nothing else in either function changes. Both are CREATE OR REPLACE and safe
-- to run more than once.

CREATE OR REPLACE FUNCTION public.archive_season(p_season_id uuid, p_champion_team_id uuid DEFAULT NULL::uuid, p_runner_up_team_id uuid DEFAULT NULL::uuid, p_third_place_team_id uuid DEFAULT NULL::uuid)
 RETURNS seasons
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result public.seasons;
  v_was_active boolean;
  v_bracket record;
  v_grand_final_loser uuid;
  v_losers_final_loser uuid;
  v_elim record;
  v_current_rank integer;
  v_max_winners_round integer;
  v_season_name text;
  v_sibling_count integer;
  v_bracket_num integer;
  v_display_div text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.seasons WHERE id = p_season_id AND is_archived = false) THEN
    RAISE EXCEPTION 'Season not found or already archived';
  END IF;

  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT name, is_active INTO v_season_name, v_was_active
  FROM public.seasons WHERE id = p_season_id;

  PERFORM public.upsert_team_season_stats();

  UPDATE public.team_season_stats tss
  SET division_name = COALESCE(d.display_division, d.name)
  FROM public.teams t
  JOIN public.divisions d ON d.id = t.division_id
  WHERE tss.team_id = t.id
    AND tss.season_id = p_season_id
    AND COALESCE(d.display_division, d.name) NOT ILIKE 'hidden%'
    AND (tss.division_name IS NULL OR tss.division_name ILIKE 'hidden%');

  UPDATE public.team_season_stats
  SET champion = false, runner_up = false, playoff_rank = NULL
  WHERE season_id = p_season_id;

  FOR v_bracket IN
    WITH bracket_siblings AS (
      SELECT 
        b.id,
        b.wb_champion_id,
        b.division_id,
        b.title,
        COALESCE(d.display_division, d.name) as display_div,
        COUNT(*) OVER (PARTITION BY COALESCE(d.display_division, d.name)) as sibling_count,
        ROW_NUMBER() OVER (PARTITION BY COALESCE(d.display_division, d.name) ORDER BY b.title) as bracket_num
      FROM public.brackets b
      LEFT JOIN public.divisions d ON d.id = b.division_id
      WHERE b.season_id = p_season_id
        AND b.wb_champion_id IS NOT NULL
    )
    SELECT * FROM bracket_siblings
  LOOP
    IF v_bracket.sibling_count = 1 THEN
      v_display_div := v_bracket.display_div;
    ELSE
      v_display_div := v_bracket.display_div || ' ' || v_bracket.bracket_num;
    END IF;

    UPDATE public.team_season_stats tss
    SET division_name = v_display_div
    FROM public.participants p
    WHERE p.bracket_id = v_bracket.id
      AND p.team_id = tss.team_id
      AND tss.season_id = p_season_id;

    UPDATE public.team_season_stats
    SET champion = true, playoff_rank = 1
    WHERE season_id = p_season_id
      AND team_id = v_bracket.wb_champion_id;

    SELECT pm.loser_id INTO v_grand_final_loser
    FROM public.playoff_matches pm
    WHERE pm.bracket_id = v_bracket.id
      AND pm.match_type = 'finals'
      AND pm.winner_id IS NOT NULL
      AND pm.loser_id IS NOT NULL
    ORDER BY pm.round DESC
    LIMIT 1;

    IF v_grand_final_loser IS NULL THEN
      SELECT pm.loser_id INTO v_grand_final_loser
      FROM public.playoff_matches pm
      WHERE pm.bracket_id = v_bracket.id
        AND pm.match_type = 'winners'
        AND pm.winner_id = v_bracket.wb_champion_id
        AND pm.loser_id IS NOT NULL
      ORDER BY pm.round DESC
      LIMIT 1;
    END IF;

    IF v_grand_final_loser IS NOT NULL THEN
      UPDATE public.team_season_stats
      SET runner_up = true, playoff_rank = 2
      WHERE season_id = p_season_id
        AND team_id = v_grand_final_loser;
    END IF;

    SELECT pm.loser_id INTO v_losers_final_loser
    FROM public.playoff_matches pm
    WHERE pm.bracket_id = v_bracket.id
      AND pm.match_type = 'losers'
      AND pm.winner_id IS NOT NULL
      AND pm.loser_id IS NOT NULL
    ORDER BY pm.round DESC
    LIMIT 1;

    IF v_losers_final_loser IS NOT NULL THEN
      UPDATE public.team_season_stats
      SET playoff_rank = 3
      WHERE season_id = p_season_id
        AND team_id = v_losers_final_loser;
    END IF;

    v_current_rank := 4;

    FOR v_elim IN
      WITH team_eliminations AS (
        SELECT
          pm.loser_id,
          MAX(
            CASE 
              WHEN pm.match_type = 'losers' THEN pm.round * 2
              WHEN pm.match_type = 'winners' THEN pm.round * 2 + 1
              ELSE 0
            END
          ) as max_elim_score
        FROM public.playoff_matches pm
        WHERE pm.bracket_id = v_bracket.id
          AND pm.loser_id IS NOT NULL
          AND pm.status = 'completed'
          AND pm.match_type IN ('winners', 'losers')
          AND pm.loser_id != v_bracket.wb_champion_id
          AND (v_grand_final_loser IS NULL OR pm.loser_id != v_grand_final_loser)
          AND (v_losers_final_loser IS NULL OR pm.loser_id != v_losers_final_loser)
        GROUP BY pm.loser_id
      )
      SELECT max_elim_score, array_agg(loser_id) as team_ids
      FROM team_eliminations
      GROUP BY max_elim_score
      ORDER BY max_elim_score DESC
    LOOP
      UPDATE public.team_season_stats
      SET playoff_rank = v_current_rank
      WHERE season_id = p_season_id
        AND team_id = ANY(v_elim.team_ids);
      
      v_current_rank := v_current_rank + array_length(v_elim.team_ids, 1);
    END LOOP;

  END LOOP;

  INSERT INTO public.team_details_archive (
    season_id, team_id, name, logo_url, image_url, division_id, divisionname,
    players, created_at, wins, losses, game_wins, game_losses,
    win_percentage, game_win_percentage, sos, power_score, snapshot_at
  )
  SELECT
    tss.season_id,
    tss.team_id,
    t.name,
    t.logo_url,
    t.image_url,
    t.division_id,
    tss.division_name,
    t.players,
    t.created_at,
    tss.match_wins,
    tss.match_losses,
    tss.game_wins,
    tss.game_losses,
    CASE WHEN (tss.match_wins + tss.match_losses) > 0
         THEN ROUND(tss.match_wins::numeric / (tss.match_wins + tss.match_losses), 4)
         ELSE 0 END,
    CASE WHEN (tss.game_wins + tss.game_losses) > 0
         THEN ROUND(tss.game_wins::numeric / (tss.game_wins + tss.game_losses), 4)
         ELSE 0 END,
    tss.sos,
    tss.power_score,
    now()
  FROM public.team_season_stats tss
  JOIN public.teams t ON t.id = tss.team_id
  WHERE tss.season_id = p_season_id
  ON CONFLICT (season_id, team_id) DO UPDATE SET
    name = EXCLUDED.name,
    logo_url = EXCLUDED.logo_url,
    image_url = EXCLUDED.image_url,
    division_id = EXCLUDED.division_id,
    divisionname = EXCLUDED.divisionname,
    players = EXCLUDED.players,
    wins = EXCLUDED.wins,
    losses = EXCLUDED.losses,
    game_wins = EXCLUDED.game_wins,
    game_losses = EXCLUDED.game_losses,
    win_percentage = EXCLUDED.win_percentage,
    game_win_percentage = EXCLUDED.game_win_percentage,
    sos = EXCLUDED.sos,
    power_score = EXCLUDED.power_score,
    snapshot_at = EXCLUDED.snapshot_at;

  DELETE FROM public.match_comments
  WHERE match_id IN (
    SELECT id FROM public.matches WHERE season_id = p_season_id
  );

  INSERT INTO public.matches_archive (
    id, bracket_id, round_number, team1_id, team2_id, winner_id,
    best_of, created_at, match_type, position, next_match_id,
    next_loser_match_id, team1_score, team2_score, date, location,
    iscompleted, loser_id, team1_game_wins, team2_game_wins,
    metadata, season_id, archived_at
  )
  SELECT
    id, bracket_id, round_number, team1_id, team2_id, winner_id,
    best_of, created_at, match_type, position, next_match_id,
    next_loser_match_id, team1_score, team2_score, date, location,
    iscompleted, loser_id, team1_game_wins, team2_game_wins,
    metadata, season_id, now()
  FROM public.matches
  WHERE season_id = p_season_id
    AND iscompleted = true
  ON CONFLICT (id) DO NOTHING;

  DELETE FROM public.matches
  WHERE season_id = p_season_id
    AND iscompleted = true;

  -- Reset teams table stats for clean next season (WHERE clause required by safety guard).
  -- Only when the season being archived is the one currently being played: these
  -- columns are the live standings, shared by the whole league and not scoped to
  -- a season, so resetting them while archiving an older, inactive season would
  -- wipe the current season's records. See UX audit A-12 / Q30.
  IF v_was_active THEN
    UPDATE public.teams
    SET wins = 0, losses = 0, game_wins = 0, game_losses = 0
    WHERE id IS NOT NULL;
  END IF;

  UPDATE public.seasons
  SET
    is_active = false,
    is_archived = true,
    -- The active season ends the day it is archived. An older season already has
    -- its real end date, and stamping today on a 2024 season would show that date
    -- on the History page.
    end_date = CASE WHEN v_was_active THEN CURRENT_DATE ELSE COALESCE(end_date, CURRENT_DATE) END,
    champion_team_id = p_champion_team_id,
    runner_up_team_id = p_runner_up_team_id,
    third_place_team_id = p_third_place_team_id,
    updated_at = now()
  WHERE id = p_season_id
  RETURNING * INTO v_result;

  -- B-33: was an unscoped UPDATE that switched off every active badge in the
  -- league, hiding previous seasons' championship badges.
  PERFORM public.rotate_season_badges(p_season_id);

  -- B-33: was a champion-only loop. The helper writes champion, runner-up and
  -- third place, from the placements computed into team_season_stats above.
  PERFORM public.award_season_placement_badges(p_season_id);

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.partial_archive_season(p_season_id uuid)
 RETURNS seasons
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_result public.seasons;
  v_was_active boolean;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.seasons
    WHERE id = p_season_id AND is_archived = false
  ) THEN
    RAISE EXCEPTION 'Season not found or already archived';
  END IF;

  SELECT is_active INTO v_was_active FROM public.seasons WHERE id = p_season_id;

  PERFORM public.upsert_team_season_stats();

  DELETE FROM public.match_comments
  WHERE match_id IN (
    SELECT id FROM public.matches WHERE season_id = p_season_id
  );

  INSERT INTO public.matches_archive (
    id, bracket_id, round_number, team1_id, team2_id, winner_id,
    best_of, created_at, match_type, position, next_match_id,
    next_loser_match_id, team1_score, team2_score, date, location,
    iscompleted, loser_id, team1_game_wins, team2_game_wins,
    metadata, season_id, archived_at
  )
  SELECT
    id, bracket_id, round_number, team1_id, team2_id, winner_id,
    best_of, created_at, match_type, position, next_match_id,
    next_loser_match_id, team1_score, team2_score, date, location,
    iscompleted, loser_id, team1_game_wins, team2_game_wins,
    metadata, season_id, now()
  FROM public.matches
  WHERE season_id = p_season_id
    AND iscompleted = true
  ON CONFLICT (id) DO NOTHING;

  DELETE FROM public.matches
  WHERE season_id = p_season_id
    AND iscompleted = true;

  -- Same guard as archive_season: these columns are the live league-wide
  -- standings, so only the season currently being played may reset them.
  IF v_was_active THEN
    UPDATE public.teams
    SET wins = 0, losses = 0, game_wins = 0, game_losses = 0
    WHERE id IS NOT NULL;
  END IF;

  UPDATE public.seasons
  SET
    is_active = false,
    playoffs_active = true,
    updated_at = now()
  WHERE id = p_season_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$function$;