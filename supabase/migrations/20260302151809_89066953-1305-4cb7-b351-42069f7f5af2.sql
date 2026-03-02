
CREATE OR REPLACE FUNCTION public.archive_season(
  p_season_id uuid,
  p_champion_team_id uuid DEFAULT NULL,
  p_runner_up_team_id uuid DEFAULT NULL,
  p_third_place_team_id uuid DEFAULT NULL
)
RETURNS public.seasons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_result public.seasons;
  v_bracket record;
  v_grand_final_loser uuid;
  v_losers_final_loser uuid;
  v_elim record;
  v_current_rank integer;
  v_max_winners_round integer;
BEGIN
  -- Verify season exists and is not already archived
  IF NOT EXISTS (SELECT 1 FROM public.seasons WHERE id = p_season_id AND is_archived = false) THEN
    RAISE EXCEPTION 'Season not found or already archived';
  END IF;

  -- SECURITY: Require admin access
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- ============================================================
  -- STEP 1: Refresh team_season_stats with latest match data
  -- ============================================================
  PERFORM public.upsert_team_season_stats();

  -- ============================================================
  -- STEP 2: Sync division names on team_season_stats
  -- ============================================================
  UPDATE public.team_season_stats tss
  SET division_name = COALESCE(d.display_division, d.name)
  FROM public.teams t
  JOIN public.divisions d ON d.id = t.division_id
  WHERE tss.team_id = t.id
    AND tss.season_id = p_season_id;

  -- ============================================================
  -- STEP 3: Auto-detect and record playoff finishing positions
  -- ============================================================
  -- Reset any existing playoff data for this season first
  UPDATE public.team_season_stats
  SET champion = false, runner_up = false, playoff_rank = NULL
  WHERE season_id = p_season_id;

  -- Process each bracket that has a champion
  FOR v_bracket IN
    SELECT id, wb_champion_id, division_id
    FROM public.brackets
    WHERE season_id = p_season_id
      AND wb_champion_id IS NOT NULL
  LOOP
    -- Set champion (playoff_rank = 1)
    UPDATE public.team_season_stats
    SET champion = true, playoff_rank = 1
    WHERE season_id = p_season_id
      AND team_id = v_bracket.wb_champion_id;

    -- Find runner-up: Try 'finals' match_type first (older brackets),
    -- then fall back to highest 'winners' round where champion won (newer brackets)
    SELECT pm.loser_id INTO v_grand_final_loser
    FROM public.playoff_matches pm
    WHERE pm.bracket_id = v_bracket.id
      AND pm.match_type = 'finals'
      AND pm.winner_id IS NOT NULL
      AND pm.loser_id IS NOT NULL
    ORDER BY pm.round DESC
    LIMIT 1;

    IF v_grand_final_loser IS NULL THEN
      -- Newer bracket format: Grand Final is the highest-round 'winners' match
      -- where the champion won
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

    -- Find 3rd place: loser of the Losers Final (losers match_type, highest round)
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

    -- ============================================================
    -- Assign ranks 4+ based on elimination round
    -- ============================================================
    -- Teams eliminated in later rounds get better (lower) ranks.
    -- Teams eliminated in the same round share the same rank.
    -- We process losers from BOTH winners and losers brackets.
    -- Skip teams already ranked (1, 2, 3).
    v_current_rank := 4;

    FOR v_elim IN
      -- Get distinct elimination rounds, ordered from latest to earliest
      -- Later rounds = better placement = lower rank number
      -- Combine match_type + round into a single ordering:
      --   losers bracket eliminations rank worse than winners bracket at same round
      --   Higher rounds rank better (eliminated later = did better)
      SELECT
        sub.loser_id,
        sub.elim_order
      FROM (
        SELECT
          pm.loser_id,
          -- Create a sort key: higher = eliminated later = better rank
          -- Winners bracket losses feed into losers bracket, so a losers-bracket 
          -- elimination at round N is worse than still being alive at round N.
          -- Use: match_type priority (losers < winners for same effective round)
          -- plus round number. We order DESC so later eliminations come first.
          CASE pm.match_type
            WHEN 'losers' THEN pm.round
            WHEN 'winners' THEN pm.round
            WHEN 'finals' THEN 9999  -- finals losers already handled as rank 2
          END as elim_order,
          pm.match_type
        FROM public.playoff_matches pm
        WHERE pm.bracket_id = v_bracket.id
          AND pm.loser_id IS NOT NULL
          AND pm.status = 'completed'
          -- Exclude already-ranked teams
          AND pm.loser_id != v_bracket.wb_champion_id
          AND (v_grand_final_loser IS NULL OR pm.loser_id != v_grand_final_loser)
          AND (v_losers_final_loser IS NULL OR pm.loser_id != v_losers_final_loser)
      ) sub
      WHERE sub.match_type != 'finals'  -- finals losers already rank 2
      -- For teams that lost multiple times (winners then losers), 
      -- take their LAST elimination (from losers bracket)
      GROUP BY sub.loser_id
      -- Use the max elim_order (latest elimination = best placement)
      ORDER BY MAX(sub.elim_order) DESC
    LOOP
      UPDATE public.team_season_stats
      SET playoff_rank = v_current_rank
      WHERE season_id = p_season_id
        AND team_id = v_elim.loser_id
        AND playoff_rank IS NULL;  -- Don't overwrite if already set
      
      v_current_rank := v_current_rank + 1;
    END LOOP;

    -- For teams that share the same elimination round, assign the same rank
    -- Re-process: group by max elimination round and assign shared ranks
    -- The above sequential approach doesn't handle ties. Let's fix it:
    -- Reset ranks 4+ and redo with proper tie handling
    UPDATE public.team_season_stats
    SET playoff_rank = NULL
    WHERE season_id = p_season_id
      AND playoff_rank >= 4;

    v_current_rank := 4;

    FOR v_elim IN
      WITH team_eliminations AS (
        SELECT
          pm.loser_id,
          MAX(
            CASE 
              WHEN pm.match_type = 'losers' THEN pm.round * 2  -- losers bracket rounds interleave
              WHEN pm.match_type = 'winners' THEN pm.round * 2 + 1  -- winners elimination feeds to losers
              ELSE 0
            END
          ) as max_elim_score
        FROM public.playoff_matches pm
        WHERE pm.bracket_id = v_bracket.id
          AND pm.loser_id IS NOT NULL
          AND pm.status = 'completed'
          AND pm.match_type IN ('winners', 'losers')
          -- Exclude already-ranked teams
          AND pm.loser_id != v_bracket.wb_champion_id
          AND (v_grand_final_loser IS NULL OR pm.loser_id != v_grand_final_loser)
          AND (v_losers_final_loser IS NULL OR pm.loser_id != v_losers_final_loser)
        GROUP BY pm.loser_id
      )
      SELECT max_elim_score, array_agg(loser_id) as team_ids
      FROM team_eliminations
      GROUP BY max_elim_score
      ORDER BY max_elim_score DESC  -- Later elimination = better rank
    LOOP
      -- All teams at this elimination score share the same rank
      UPDATE public.team_season_stats
      SET playoff_rank = v_current_rank
      WHERE season_id = p_season_id
        AND team_id = ANY(v_elim.team_ids);
      
      -- Next rank group skips by the count of teams at this rank
      v_current_rank := v_current_rank + array_length(v_elim.team_ids, 1);
    END LOOP;

  END LOOP;

  -- ============================================================
  -- STEP 4: Snapshot team details to team_details_archive
  -- ============================================================
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

  -- ============================================================
  -- STEP 5: Archive matches
  -- ============================================================
  -- Delete match comments for this season's matches
  DELETE FROM public.match_comments
  WHERE match_id IN (
    SELECT id FROM public.matches WHERE season_id = p_season_id
  );

  -- Copy completed matches to matches_archive
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

  -- Delete archived matches from the active table
  DELETE FROM public.matches
  WHERE season_id = p_season_id
    AND iscompleted = true;

  -- ============================================================
  -- STEP 6: Update the season record
  -- ============================================================
  UPDATE public.seasons
  SET
    is_active = false,
    is_archived = true,
    end_date = CURRENT_DATE,
    champion_team_id = p_champion_team_id,
    runner_up_team_id = p_runner_up_team_id,
    third_place_team_id = p_third_place_team_id,
    updated_at = now()
  WHERE id = p_season_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;
