-- ============================================================
-- 1. Harden finalize_playoffs() to derive winners from
--    playoff_matches instead of brackets.wb_champion_id.
--    Also stamp historical division_name from bracket
--    participation so teams later moved to Hidden still
--    appear in the correct division on History.
-- ============================================================
CREATE OR REPLACE FUNCTION public.finalize_playoffs(
  p_season_id uuid,
  p_champion_team_id uuid DEFAULT NULL,
  p_runner_up_team_id uuid DEFAULT NULL,
  p_third_place_team_id uuid DEFAULT NULL
)
RETURNS public.seasons
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  v_result public.seasons;
  v_bracket record;
  v_grand_final_loser uuid;
  v_losers_final_loser uuid;
  v_wb_champion uuid;
  v_elim record;
  v_current_rank integer;
  v_division_name text;
  v_badge_type public.badge_type;
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

  -- Badge rotation
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
-- 2. Repair Winter 2 2026 (id 9cd55eb8-672c-4a43-a9df-3552a7759cca)
--    Cannot call finalize_playoffs (already archived) so apply
--    the same effects directly.
-- ============================================================
DO $$
DECLARE
  v_season_id uuid := '9cd55eb8-672c-4a43-a9df-3552a7759cca';
  v_bracket record;
  v_wb_champion uuid;
  v_grand_final_loser uuid;
  v_losers_final_loser uuid;
  v_display_div text;
BEGIN
  -- Reset rank/champion/runner-up
  UPDATE public.team_season_stats
  SET champion = false, runner_up = false, playoff_rank = NULL
  WHERE season_id = v_season_id;

  FOR v_bracket IN
    SELECT b.id, b.wb_champion_id, b.title,
           COALESCE(d.display_division, d.name) as display_div
    FROM public.brackets b
    LEFT JOIN public.divisions d ON d.id = b.division_id
    WHERE b.season_id = v_season_id
  LOOP
    v_display_div := v_bracket.display_div;

    -- Stamp historical division from bracket participation
    UPDATE public.team_season_stats tss
    SET division_name = v_display_div
    FROM public.participants p
    WHERE p.bracket_id = v_bracket.id
      AND p.team_id = tss.team_id
      AND tss.season_id = v_season_id;

    UPDATE public.team_details_archive tda
    SET divisionname = v_display_div
    FROM public.participants p
    WHERE p.bracket_id = v_bracket.id
      AND p.team_id = tda.team_id
      AND tda.season_id = v_season_id;

    -- Champion from latest finals
    SELECT pm.winner_id, pm.loser_id
    INTO v_wb_champion, v_grand_final_loser
    FROM public.playoff_matches pm
    WHERE pm.bracket_id = v_bracket.id
      AND pm.match_type = 'finals'
      AND pm.winner_id IS NOT NULL AND pm.loser_id IS NOT NULL
    ORDER BY pm.round DESC, pm.updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_wb_champion IS NULL THEN
      SELECT pm.winner_id, pm.loser_id
      INTO v_wb_champion, v_grand_final_loser
      FROM public.playoff_matches pm
      WHERE pm.bracket_id = v_bracket.id
        AND pm.match_type = 'winners'
        AND pm.winner_id IS NOT NULL AND pm.loser_id IS NOT NULL
      ORDER BY pm.round DESC, pm.updated_at DESC NULLS LAST
      LIMIT 1;
    END IF;

    IF v_wb_champion IS NULL THEN CONTINUE; END IF;

    UPDATE public.brackets SET wb_champion_id = v_wb_champion WHERE id = v_bracket.id;

    UPDATE public.team_season_stats
    SET champion = true, playoff_rank = 1
    WHERE season_id = v_season_id AND team_id = v_wb_champion;

    IF v_grand_final_loser IS NOT NULL AND v_grand_final_loser <> v_wb_champion THEN
      UPDATE public.team_season_stats
      SET runner_up = true, playoff_rank = 2
      WHERE season_id = v_season_id AND team_id = v_grand_final_loser;
    END IF;

    SELECT pm.loser_id INTO v_losers_final_loser
    FROM public.playoff_matches pm
    WHERE pm.bracket_id = v_bracket.id
      AND pm.match_type = 'losers'
      AND pm.winner_id IS NOT NULL AND pm.loser_id IS NOT NULL
    ORDER BY pm.round DESC, pm.updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_losers_final_loser IS NOT NULL
       AND v_losers_final_loser <> v_wb_champion
       AND (v_grand_final_loser IS NULL OR v_losers_final_loser <> v_grand_final_loser) THEN
      UPDATE public.team_season_stats
      SET playoff_rank = 3
      WHERE season_id = v_season_id AND team_id = v_losers_final_loser;
    END IF;
  END LOOP;

  -- Sync season-level winners (Competitive bracket = top division)
  UPDATE public.seasons s
  SET
    champion_team_id = (
      SELECT tss.team_id FROM public.team_season_stats tss
      JOIN public.teams t ON t.id = tss.team_id
      JOIN public.divisions d ON d.id = t.division_id
      WHERE tss.season_id = v_season_id AND tss.champion = true
      ORDER BY d.division_weight DESC NULLS LAST
      LIMIT 1
    ),
    runner_up_team_id = (
      SELECT tss.team_id FROM public.team_season_stats tss
      JOIN public.teams t ON t.id = tss.team_id
      JOIN public.divisions d ON d.id = t.division_id
      WHERE tss.season_id = v_season_id AND tss.runner_up = true
      ORDER BY d.division_weight DESC NULLS LAST
      LIMIT 1
    ),
    third_place_team_id = (
      SELECT tss.team_id FROM public.team_season_stats tss
      JOIN public.teams t ON t.id = tss.team_id
      JOIN public.divisions d ON d.id = t.division_id
      WHERE tss.season_id = v_season_id AND tss.playoff_rank = 3
      ORDER BY d.division_weight DESC NULLS LAST
      LIMIT 1
    ),
    updated_at = now()
  WHERE s.id = v_season_id;

  -- Re-issue champion badges for Winter 2 (replace any duplicates)
  DELETE FROM public.team_badge_events
  WHERE season_id = v_season_id
    AND badge_type IN ('competitive_champion','intermediate_champion','recreational_champion');

  INSERT INTO public.team_badge_events (team_id, badge_type, season_id, metadata, is_active)
  SELECT
    b.wb_champion_id,
    CASE
      WHEN lower(COALESCE(d.display_division, d.name)) LIKE '%recreational%' THEN 'recreational_champion'::public.badge_type
      WHEN lower(COALESCE(d.display_division, d.name)) LIKE '%intermediate%' THEN 'intermediate_champion'::public.badge_type
      WHEN lower(COALESCE(d.display_division, d.name)) LIKE '%competitive%' THEN 'competitive_champion'::public.badge_type
    END,
    v_season_id,
    jsonb_build_object(
      'season_name', (SELECT name FROM public.seasons WHERE id = v_season_id),
      'division', COALESCE(d.display_division, d.name)
    ),
    true
  FROM public.brackets b
  LEFT JOIN public.divisions d ON d.id = b.division_id
  WHERE b.season_id = v_season_id
    AND b.wb_champion_id IS NOT NULL
    AND lower(COALESCE(d.display_division, d.name)) ~ '(recreational|intermediate|competitive)';
END $$;