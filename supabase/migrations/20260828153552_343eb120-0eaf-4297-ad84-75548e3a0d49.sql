-- B-33: two defects in the same forty lines of archive_season() and
-- finalize_playoffs(), which carry byte-identical copies of the block.
--
-- 1. Six of the twenty badge types could never be awarded. Runner-Up and Third
--    Place exist in all three divisions, are drawn correctly, and nothing wrote
--    them. Only champions were written -- even though both routines already work
--    out second and third place a few lines earlier and store them in
--    team_season_stats.
--
-- 2. The badge rotation had no season filter and no team filter, so archiving one
--    season switched off every active badge in the league. Every read path
--    (get_team_badges, get_all_team_badges, get_season_badges) filters
--    is_active = true, so that hid every previous season's championship badge.

-- Deactivate one season's revocable badges at the end of that season.
--
-- An allowlist, not a denylist:
--   * the nine placement badges are permanent and are never deactivated;
--   * cool_fun_team stays excluded, as it always was;
--   * `season_id = p_season_id` never matches a NULL season_id, so legacy and
--     hand-granted rows with no season survive untouched;
--   * a badge type added later is not silently deactivated by default.
-- The ten types listed are exactly the ones migration 20260225215316 already
-- treats as recomputable from match history.
CREATE OR REPLACE FUNCTION public.rotate_season_badges(p_season_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_rows integer;
BEGIN
  UPDATE public.team_badge_events
  SET is_active = false
  WHERE is_active = true
    AND season_id = p_season_id
    AND badge_type IN (
      'king_slayer', 'clutch_performer', 'consistent_performer',
      'hot_streak', 'cold_streak',
      'ice_cold', 'broom_crew', 'gatekeeper', 'chaos_agent', 'bully'
    );

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$function$;

-- Write all nine placement badges for a finished season, from the placements
-- archive_season() and finalize_playoffs() have already computed into
-- team_season_stats earlier in their own transaction.
--
-- team_season_stats.division_name is the bracket's own display name -- the rank
-- loop sets it from COALESCE(d.display_division, d.name), the same source the old
-- champion loop used -- so this maps divisions exactly as before.
--
-- Third place comes from playoff_rank = 3, which is the loser of the last
-- losers-bracket match. A single-elimination bracket has no losers bracket, so
-- nobody is ranked third there and no third-place badge is awarded. That is
-- intended: two teams lose in the semi-finals and the bracket does not separate
-- them.
--
-- Mirrors the historical backfill in migration 20250611145832.
CREATE OR REPLACE FUNCTION public.award_season_placement_badges(p_season_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_season_name text;
  v_rows integer;
BEGIN
  SELECT name INTO v_season_name FROM public.seasons WHERE id = p_season_id;

  WITH placed AS (
    SELECT
      tss.team_id,
      tss.division_name,
      tss.playoff_rank,
      CASE
        WHEN tss.champion  THEN 'champion'
        WHEN tss.runner_up THEN 'runner_up'
        WHEN tss.playoff_rank = 3 THEN 'third_place'
      END AS placing,
      CASE
        WHEN tss.division_name ILIKE '%recreational%' THEN 'recreational'
        WHEN tss.division_name ILIKE '%intermediate%' THEN 'intermediate'
        WHEN tss.division_name ILIKE '%competitive%'  THEN 'competitive'
      END AS div_key
    FROM public.team_season_stats tss
    WHERE tss.season_id = p_season_id
      AND (tss.champion = true OR tss.runner_up = true OR tss.playoff_rank = 3)
  )
  INSERT INTO public.team_badge_events (team_id, badge_type, season_id, metadata, is_active)
  SELECT
    p.team_id,
    -- The nine placement labels are exactly '<division>_<placing>'.
    (p.div_key || '_' || p.placing)::public.badge_type,
    p_season_id,
    jsonb_build_object(
      'season_name',  v_season_name,
      'division',     p.division_name,
      'playoff_rank', p.playoff_rank
    ),
    true
  FROM placed p
  WHERE p.div_key IS NOT NULL    -- a division name matching none of the three is
    AND p.placing IS NOT NULL    -- skipped, as the old loop's CONTINUE did
  ON CONFLICT (team_id, badge_type, season_id) DO UPDATE
    SET is_active  = true,
        awarded_at = now(),
        metadata   = EXCLUDED.metadata;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.rotate_season_badges(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rotate_season_badges(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.rotate_season_badges(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.award_season_placement_badges(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.award_season_placement_badges(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_season_placement_badges(uuid) FROM authenticated;


-- ---------------------------------------------------------------------------
-- archive_season -- full season archival
-- Restated verbatim from the live definition, with the badge block replaced.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.archive_season(p_season_id uuid, p_champion_team_id uuid DEFAULT NULL::uuid, p_runner_up_team_id uuid DEFAULT NULL::uuid, p_third_place_team_id uuid DEFAULT NULL::uuid)
 RETURNS seasons
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result public.seasons;
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

  SELECT name INTO v_season_name FROM public.seasons WHERE id = p_season_id;

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

  -- Reset teams table stats for clean next season (WHERE clause required by safety guard)
  UPDATE public.teams
  SET wins = 0, losses = 0, game_wins = 0, game_losses = 0
  WHERE id IS NOT NULL;

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

  -- B-33: was an unscoped UPDATE that switched off every active badge in the
  -- league, hiding previous seasons' championship badges.
  PERFORM public.rotate_season_badges(p_season_id);

  -- B-33: was a champion-only loop. The helper writes champion, runner-up and
  -- third place, from the placements computed into team_season_stats above.
  PERFORM public.award_season_placement_badges(p_season_id);

  RETURN v_result;
END;
$function$;


-- ---------------------------------------------------------------------------
-- finalize_playoffs -- the modern playoff-close path
-- Restated verbatim from the live definition, with the badge block replaced.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_playoffs(p_season_id uuid, p_champion_team_id uuid DEFAULT NULL::uuid, p_runner_up_team_id uuid DEFAULT NULL::uuid, p_third_place_team_id uuid DEFAULT NULL::uuid)
 RETURNS seasons
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_result public.seasons;
  v_bracket record;
  v_grand_final_loser uuid;
  v_losers_final_loser uuid;
  v_wb_champion uuid;
  v_elim record;
  v_current_rank integer;
  v_season_name text;
  v_display_div text;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.seasons
    WHERE id = p_season_id
      AND is_archived = false
      AND playoffs_active = true
  ) THEN
    RAISE EXCEPTION 'Season not in playoffs-active state';
  END IF;

  SELECT name INTO v_season_name FROM public.seasons WHERE id = p_season_id;

  PERFORM public.upsert_team_season_stats();

  -- Initial division-name sync (skip "Hidden" stomp)
  UPDATE public.team_season_stats tss
  SET division_name = COALESCE(d.display_division, d.name)
  FROM public.teams t
  JOIN public.divisions d ON d.id = t.division_id
  WHERE tss.team_id = t.id
    AND tss.season_id = p_season_id
    AND COALESCE(d.display_division, d.name) NOT ILIKE 'hidden%'
    AND (tss.division_name IS NULL OR tss.division_name ILIKE 'hidden%');

  -- Reset champion/runner-up/rank for this season
  UPDATE public.team_season_stats
  SET champion = false, runner_up = false, playoff_rank = NULL
  WHERE season_id = p_season_id;

  -- Loop over EVERY bracket for this season (no wb_champion filter)
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
    )
    SELECT * FROM bracket_siblings
  LOOP
    IF v_bracket.sibling_count = 1 THEN
      v_display_div := v_bracket.display_div;
    ELSE
      v_display_div := v_bracket.display_div || ' ' || v_bracket.bracket_num;
    END IF;

    -- Stamp division_name from bracket participation (covers Hidden/moved teams)
    UPDATE public.team_season_stats tss
    SET division_name = v_display_div
    FROM public.participants p
    WHERE p.bracket_id = v_bracket.id
      AND p.team_id = tss.team_id
      AND tss.season_id = p_season_id;

    -- Determine champion from playoff results
    -- Priority 1: latest decided GF (match_type='finals')
    SELECT pm.winner_id, pm.loser_id
    INTO v_wb_champion, v_grand_final_loser
    FROM public.playoff_matches pm
    WHERE pm.bracket_id = v_bracket.id
      AND pm.match_type = 'finals'
      AND pm.winner_id IS NOT NULL
      AND pm.loser_id IS NOT NULL
    ORDER BY pm.round DESC, pm.updated_at DESC NULLS LAST
    LIMIT 1;

    -- Priority 2: latest winners-bracket match (single elim or no GF played)
    IF v_wb_champion IS NULL THEN
      SELECT pm.winner_id, pm.loser_id
      INTO v_wb_champion, v_grand_final_loser
      FROM public.playoff_matches pm
      WHERE pm.bracket_id = v_bracket.id
        AND pm.match_type = 'winners'
        AND pm.winner_id IS NOT NULL
        AND pm.loser_id IS NOT NULL
      ORDER BY pm.round DESC, pm.updated_at DESC NULLS LAST
      LIMIT 1;
    END IF;

    -- Fallback to legacy brackets.wb_champion_id if still nothing
    IF v_wb_champion IS NULL THEN
      v_wb_champion := v_bracket.wb_champion_id;
    END IF;

    IF v_wb_champion IS NULL THEN
      CONTINUE;  -- bracket has no decided games at all
    END IF;

    -- Mark champion
    UPDATE public.team_season_stats
    SET champion = true, playoff_rank = 1
    WHERE season_id = p_season_id
      AND team_id = v_wb_champion;

    -- Persist on bracket so legacy code paths agree
    UPDATE public.brackets
    SET wb_champion_id = v_wb_champion
    WHERE id = v_bracket.id;

    -- Mark runner-up
    IF v_grand_final_loser IS NOT NULL AND v_grand_final_loser <> v_wb_champion THEN
      UPDATE public.team_season_stats
      SET runner_up = true, playoff_rank = 2
      WHERE season_id = p_season_id
        AND team_id = v_grand_final_loser;
    END IF;

    -- Third place: latest losers-bracket match loser
    SELECT pm.loser_id INTO v_losers_final_loser
    FROM public.playoff_matches pm
    WHERE pm.bracket_id = v_bracket.id
      AND pm.match_type = 'losers'
      AND pm.winner_id IS NOT NULL
      AND pm.loser_id IS NOT NULL
    ORDER BY pm.round DESC, pm.updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_losers_final_loser IS NOT NULL
       AND v_losers_final_loser <> v_wb_champion
       AND (v_grand_final_loser IS NULL OR v_losers_final_loser <> v_grand_final_loser) THEN
      UPDATE public.team_season_stats
      SET playoff_rank = 3
      WHERE season_id = p_season_id
        AND team_id = v_losers_final_loser;
    END IF;

    -- Remaining placements
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
          AND pm.match_type IN ('winners', 'losers')
          AND pm.loser_id <> v_wb_champion
          AND (v_grand_final_loser IS NULL OR pm.loser_id <> v_grand_final_loser)
          AND (v_losers_final_loser IS NULL OR pm.loser_id <> v_losers_final_loser)
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
        AND team_id = ANY(v_elim.team_ids)
        AND playoff_rank IS NULL;

      v_current_rank := v_current_rank + array_length(v_elim.team_ids, 1);
    END LOOP;
  END LOOP;

  -- Snapshot to team_details_archive (uses freshly-stamped division_name)
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

  -- Auto-pick season-level winners if caller didn't provide them
  IF p_champion_team_id IS NULL THEN
    SELECT tss.team_id INTO p_champion_team_id
    FROM public.team_season_stats tss
    JOIN public.teams t ON t.id = tss.team_id
    JOIN public.divisions d ON d.id = t.division_id
    WHERE tss.season_id = p_season_id
      AND tss.champion = true
    ORDER BY d.division_weight DESC NULLS LAST
    LIMIT 1;
  END IF;
  IF p_runner_up_team_id IS NULL THEN
    SELECT tss.team_id INTO p_runner_up_team_id
    FROM public.team_season_stats tss
    JOIN public.teams t ON t.id = tss.team_id
    JOIN public.divisions d ON d.id = t.division_id
    WHERE tss.season_id = p_season_id
      AND tss.runner_up = true
    ORDER BY d.division_weight DESC NULLS LAST
    LIMIT 1;
  END IF;
  IF p_third_place_team_id IS NULL THEN
    SELECT tss.team_id INTO p_third_place_team_id
    FROM public.team_season_stats tss
    JOIN public.teams t ON t.id = tss.team_id
    JOIN public.divisions d ON d.id = t.division_id
    WHERE tss.season_id = p_season_id
      AND tss.playoff_rank = 3
    ORDER BY d.division_weight DESC NULLS LAST
    LIMIT 1;
  END IF;

  UPDATE public.seasons
  SET
    is_active = false,
    is_archived = true,
    playoffs_active = false,
    end_date = COALESCE(end_date, CURRENT_DATE),
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