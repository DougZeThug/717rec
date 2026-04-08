
-- ============================================================
-- PART 1: Fix v_team_season_agg view
-- Use team_details_archive.divisionname for archived seasons,
-- fall back to live teams→divisions join for active season only
-- ============================================================
CREATE OR REPLACE VIEW v_team_season_agg AS
WITH regular_season_matches AS (
    SELECT ('reg_'::text || (m.id)::text) AS match_key,
        m.season_id,
        m.team1_id AS team_id,
        CASE WHEN (m.winner_id = m.team1_id) THEN 1 ELSE 0 END AS match_wins,
        CASE WHEN (m.winner_id = m.team2_id) THEN 1 ELSE 0 END AS match_losses,
        COALESCE(m.team1_game_wins, 0) AS game_wins,
        COALESCE(m.team2_game_wins, 0) AS game_losses,
        m.team2_id AS opponent_id
    FROM matches m
    WHERE ((m.iscompleted = true) AND (m.season_id IS NOT NULL))
    UNION ALL
    SELECT ('reg_'::text || (m.id)::text) AS match_key,
        m.season_id,
        m.team2_id AS team_id,
        CASE WHEN (m.winner_id = m.team2_id) THEN 1 ELSE 0 END AS match_wins,
        CASE WHEN (m.winner_id = m.team1_id) THEN 1 ELSE 0 END AS match_losses,
        COALESCE(m.team2_game_wins, 0) AS game_wins,
        COALESCE(m.team1_game_wins, 0) AS game_losses,
        m.team1_id AS opponent_id
    FROM matches m
    WHERE ((m.iscompleted = true) AND (m.season_id IS NOT NULL))
), archived_season_matches AS (
    SELECT ('arch_'::text || (ma.id)::text) AS match_key,
        ma.season_id,
        ma.team1_id AS team_id,
        CASE WHEN (ma.winner_id = ma.team1_id) THEN 1 ELSE 0 END AS match_wins,
        CASE WHEN (ma.winner_id = ma.team2_id) THEN 1 ELSE 0 END AS match_losses,
        COALESCE(ma.team1_game_wins, 0) AS game_wins,
        COALESCE(ma.team2_game_wins, 0) AS game_losses,
        ma.team2_id AS opponent_id
    FROM matches_archive ma
    WHERE ((ma.iscompleted = true) AND (ma.season_id IS NOT NULL))
    UNION ALL
    SELECT ('arch_'::text || (ma.id)::text) AS match_key,
        ma.season_id,
        ma.team2_id AS team_id,
        CASE WHEN (ma.winner_id = ma.team2_id) THEN 1 ELSE 0 END AS match_wins,
        CASE WHEN (ma.winner_id = ma.team1_id) THEN 1 ELSE 0 END AS match_losses,
        COALESCE(ma.team2_game_wins, 0) AS game_wins,
        COALESCE(ma.team1_game_wins, 0) AS game_losses,
        ma.team1_id AS opponent_id
    FROM matches_archive ma
    WHERE ((ma.iscompleted = true) AND (ma.season_id IS NOT NULL))
), playoff_season_matches AS (
    SELECT ('playoff_'::text || (pm.id)::text) AS match_key,
        b.season_id,
        pm.team1_id AS team_id,
        CASE WHEN (pm.winner_id = pm.team1_id) THEN 1 ELSE 0 END AS match_wins,
        CASE WHEN (pm.winner_id = pm.team2_id) THEN 1 ELSE 0 END AS match_losses,
        COALESCE(pm.team1_score, 0) AS game_wins,
        COALESCE(pm.team2_score, 0) AS game_losses,
        pm.team2_id AS opponent_id
    FROM (playoff_matches pm
        JOIN brackets b ON ((pm.bracket_id = b.id)))
    WHERE ((pm.winner_id IS NOT NULL) AND (b.season_id IS NOT NULL))
    UNION ALL
    SELECT ('playoff_'::text || (pm.id)::text) AS match_key,
        b.season_id,
        pm.team2_id AS team_id,
        CASE WHEN (pm.winner_id = pm.team2_id) THEN 1 ELSE 0 END AS match_wins,
        CASE WHEN (pm.winner_id = pm.team1_id) THEN 1 ELSE 0 END AS match_losses,
        COALESCE(pm.team2_score, 0) AS game_wins,
        COALESCE(pm.team1_score, 0) AS game_losses,
        pm.team1_id AS opponent_id
    FROM (playoff_matches pm
        JOIN brackets b ON ((pm.bracket_id = b.id)))
    WHERE ((pm.winner_id IS NOT NULL) AND (b.season_id IS NOT NULL))
), all_matches AS (
    SELECT * FROM regular_season_matches
    UNION ALL
    SELECT * FROM archived_season_matches
    UNION ALL
    SELECT * FROM playoff_season_matches
), team_season_data AS (
    SELECT all_matches.season_id,
        all_matches.team_id,
        sum(all_matches.match_wins) AS match_wins,
        sum(all_matches.match_losses) AS match_losses,
        sum(all_matches.game_wins) AS game_wins,
        sum(all_matches.game_losses) AS game_losses
    FROM all_matches
    GROUP BY all_matches.season_id, all_matches.team_id
), sos_calc AS (
    SELECT am.season_id,
        am.team_id,
        CASE
            WHEN (count(DISTINCT am.opponent_id) > 0) THEN avg(COALESCE(d.division_weight, 0.85))
            ELSE NULL::numeric
        END AS sos
    FROM ((all_matches am
        LEFT JOIN teams t_opp ON ((am.opponent_id = t_opp.id)))
        LEFT JOIN divisions d ON ((t_opp.division_id = d.id)))
    GROUP BY am.season_id, am.team_id
)
SELECT tsd.season_id,
    tsd.team_id,
    tsd.match_wins,
    tsd.match_losses,
    tsd.game_wins,
    tsd.game_losses,
    CASE
        WHEN ((tsd.match_wins + tsd.match_losses) > 0) THEN ((tsd.match_wins)::numeric / ((tsd.match_wins + tsd.match_losses))::numeric)
        ELSE NULL::numeric
    END AS win_percentage,
    CASE
        WHEN ((tsd.game_wins + tsd.game_losses) > 0) THEN ((tsd.game_wins)::numeric / ((tsd.game_wins + tsd.game_losses))::numeric)
        ELSE NULL::numeric
    END AS game_win_percentage,
    sc.sos,
    CASE
        WHEN (((tsd.match_wins + tsd.match_losses) > 0) AND (sc.sos IS NOT NULL)) THEN (((0.40 * ((tsd.match_wins)::numeric / ((tsd.match_wins + tsd.match_losses))::numeric)) + (0.45 * sc.sos)) + (0.15 *
        CASE
            WHEN ((tsd.game_wins + tsd.game_losses) > 0) THEN ((tsd.game_wins)::numeric / ((tsd.game_wins + tsd.game_losses))::numeric)
            ELSE (0)::numeric
        END))
        ELSE NULL::numeric
    END AS power_score,
    -- For archived seasons, use the frozen snapshot from team_details_archive
    -- For active seasons, fall back to the live teams→divisions join
    COALESCE(
      tda.divisionname,
      d.display_division
    ) AS division_name
FROM team_season_data tsd
LEFT JOIN sos_calc sc ON ((tsd.season_id = sc.season_id) AND (tsd.team_id = sc.team_id))
LEFT JOIN teams t ON (tsd.team_id = t.id)
LEFT JOIN divisions d ON (t.division_id = d.id)
LEFT JOIN team_details_archive tda ON (tda.team_id = tsd.team_id AND tda.season_id = tsd.season_id);

-- ============================================================
-- PART 2: Fix upsert_team_season_stats()
-- Skip overwriting division_name for archived seasons
-- ============================================================
CREATE OR REPLACE FUNCTION public.upsert_team_season_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses, 
     sos, power_score, division_name, recorded_at)
  SELECT
    season_id, team_id, match_wins::integer, match_losses::integer,
    game_wins::integer, game_losses::integer, sos, power_score,
    division_name,
    now()
  FROM v_team_season_agg
  ON CONFLICT (season_id, team_id) DO UPDATE
  SET
    match_wins = EXCLUDED.match_wins,
    match_losses = EXCLUDED.match_losses,
    game_wins = EXCLUDED.game_wins,
    game_losses = EXCLUDED.game_losses,
    sos = EXCLUDED.sos,
    power_score = EXCLUDED.power_score,
    -- Only update division_name if the season is NOT archived
    division_name = CASE
      WHEN EXISTS (
        SELECT 1 FROM public.seasons s
        WHERE s.id = EXCLUDED.season_id AND s.is_archived = true
      ) THEN team_season_stats.division_name  -- keep existing value
      ELSE EXCLUDED.division_name             -- update from view
    END,
    recorded_at = now();
END;
$$;

-- ============================================================
-- PART 3: Fix archive_season() STEP 2
-- Don't stamp "Hidden" over an existing valid division_name
-- ============================================================
CREATE OR REPLACE FUNCTION public.archive_season(
  p_season_id uuid,
  p_champion_team_id uuid DEFAULT NULL,
  p_runner_up_team_id uuid DEFAULT NULL,
  p_third_place_team_id uuid DEFAULT NULL
)
RETURNS public.seasons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.seasons;
  v_bracket record;
  v_grand_final_loser uuid;
  v_losers_final_loser uuid;
  v_elim record;
  v_current_rank integer;
  v_max_winners_round integer;
  v_division_name text;
  v_badge_type public.badge_type;
  v_season_name text;
  v_sibling_count integer;
  v_bracket_num integer;
  v_display_div text;
BEGIN
  -- Verify season exists and is not already archived
  IF NOT EXISTS (SELECT 1 FROM public.seasons WHERE id = p_season_id AND is_archived = false) THEN
    RAISE EXCEPTION 'Season not found or already archived';
  END IF;

  -- SECURITY: Require admin access
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Get season name for badge metadata
  SELECT name INTO v_season_name FROM public.seasons WHERE id = p_season_id;

  -- ============================================================
  -- STEP 1: Refresh team_season_stats with latest match data
  -- ============================================================
  PERFORM public.upsert_team_season_stats();

  -- ============================================================
  -- STEP 2: Initial division name sync
  -- Only update rows that don't already have a valid division_name,
  -- and never stamp "Hidden" over an existing value
  -- ============================================================
  UPDATE public.team_season_stats tss
  SET division_name = COALESCE(d.display_division, d.name)
  FROM public.teams t
  JOIN public.divisions d ON d.id = t.division_id
  WHERE tss.team_id = t.id
    AND tss.season_id = p_season_id
    AND COALESCE(d.display_division, d.name) NOT ILIKE 'hidden%'
    AND (tss.division_name IS NULL OR tss.division_name ILIKE 'hidden%');

  -- ============================================================
  -- STEP 3: Auto-detect and record playoff finishing positions
  --         AND set bracket-aware division names
  -- ============================================================
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

  -- ============================================================
  -- STEP 5b: Reset teams table stats for clean next season
  -- ============================================================
  UPDATE public.teams
  SET wins = 0, losses = 0, game_wins = 0, game_losses = 0;

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

  -- ============================================================
  -- STEP 7: Badge rotation - deactivate non-permanent, award champions
  -- ============================================================
  
  UPDATE public.team_badge_events
  SET is_active = false
  WHERE is_active = true
    AND badge_type NOT IN ('cool_fun_team');

  FOR v_bracket IN
    SELECT b.id, b.wb_champion_id, b.division_id,
           COALESCE(d.display_division, d.name) as div_name
    FROM public.brackets b
    LEFT JOIN public.divisions d ON d.id = b.division_id
    WHERE b.season_id = p_season_id
      AND b.wb_champion_id IS NOT NULL
  LOOP
    v_division_name := lower(COALESCE(v_bracket.div_name, ''));
    
    IF v_division_name LIKE '%recreational%' THEN
      v_badge_type := 'recreational_champion';
    ELSIF v_division_name LIKE '%intermediate%' THEN
      v_badge_type := 'intermediate_champion';
    ELSIF v_division_name LIKE '%competitive%' THEN
      v_badge_type := 'competitive_champion';
    ELSE
      CONTINUE;
    END IF;

    INSERT INTO public.team_badge_events (
      team_id, badge_type, season_id, metadata, is_active
    ) VALUES (
      v_bracket.wb_champion_id,
      v_badge_type,
      p_season_id,
      jsonb_build_object(
        'season_name', v_season_name,
        'division', COALESCE(v_bracket.div_name, 'Unknown')
      ),
      true
    );

  END LOOP;

  RETURN v_result;
END;
$$;

-- ============================================================
-- PART 4: Repair corrupted data
-- Restore division_name from team_details_archive for archived seasons
-- where division_name was stomped to NULL or "Hidden"
-- ============================================================
UPDATE public.team_season_stats tss
SET division_name = tda.divisionname
FROM public.team_details_archive tda
JOIN public.seasons s ON s.id = tda.season_id
WHERE tda.team_id = tss.team_id
  AND tda.season_id = tss.season_id
  AND s.is_archived = true
  AND (tss.division_name IS NULL OR tss.division_name ILIKE 'hidden%')
  AND tda.divisionname IS NOT NULL
  AND tda.divisionname NOT ILIKE 'hidden%';
