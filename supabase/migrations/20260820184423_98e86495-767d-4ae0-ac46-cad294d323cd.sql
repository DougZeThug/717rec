DO $mig$
DECLARE
  v_def text;
  v_new text;
  v_career_legacy CONSTANT text :=
'        CASE
            WHEN (((tsd.match_wins + tsd.match_losses) > 0) AND (sc.sos IS NOT NULL)) THEN (((0.40 * ((tsd.match_wins)::numeric / ((tsd.match_wins + tsd.match_losses))::numeric)) + (0.45 * sc.sos)) + (0.15 * CASE WHEN ((tsd.game_wins + tsd.game_losses) > 0) THEN ((tsd.game_wins)::numeric / ((tsd.game_wins + tsd.game_losses))::numeric) ELSE (0)::numeric END))
            ELSE NULL::numeric
        END AS career_power_score';
  v_career_unified CONSTANT text :=
'      CASE
        WHEN (c.wins + c.losses) > 0 AND c.sos IS NOT NULL
          THEN public.power_score_100_career(c.weighted_win_pct, c.sos, c.weighted_game_win_pct) / 100.0
        ELSE NULL::numeric
      END AS career_power_score';
BEGIN
  -- Revert path: legacy view must still expose career_power_score,
  -- because upsert_team_season_stats() selects that column.
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_revert_power_score_unification';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'admin_revert_power_score_unification() not found';
  END IF;

  IF position('career_power_score' in v_def) = 0 THEN
    v_new := replace(v_def, ') AS division_name', ') AS division_name,' || chr(10) || v_career_legacy);
    IF v_new = v_def THEN
      RAISE EXCEPTION 'could not patch admin_revert_power_score_unification(): division_name anchor not found';
    END IF;
    EXECUTE v_new;
  END IF;

  -- Reapply path: unified view must expose career_power_score too.
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'admin_reapply_power_score_unification';

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'admin_reapply_power_score_unification() not found';
  END IF;

  IF position('career_power_score' in v_def) = 0 THEN
    v_new := replace(v_def, 'AS division_name', 'AS division_name,' || chr(10) || v_career_unified);
    IF v_new = v_def THEN
      RAISE EXCEPTION 'could not patch admin_reapply_power_score_unification(): division_name anchor not found';
    END IF;
    EXECUTE v_new;
  END IF;
END;
$mig$;