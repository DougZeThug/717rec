CREATE OR REPLACE FUNCTION public.admin_get_pre_unification_team_power()
 RETURNS TABLE(team_id uuid, power_score numeric, wins bigint, losses bigint, game_wins bigint, game_losses bigint, win_percentage numeric, game_win_percentage numeric, backed_up_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    b.team_id,
    b.power_score::numeric,
    b.wins::bigint,
    b.losses::bigint,
    b.game_wins::bigint,
    b.game_losses::bigint,
    b.win_percentage::numeric,
    b.game_win_percentage::numeric,
    b.backed_up_at
  FROM public.team_details_power_pre_unification b;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_get_pre_unification_season_stats()
 RETURNS TABLE(season_id uuid, team_id uuid, match_wins integer, match_losses integer, game_wins integer, game_losses integer, division_name text, playoff_rank integer, power_score numeric, sos numeric, champion boolean, runner_up boolean, recorded_at timestamp with time zone, backed_up_at timestamp with time zone, season_name text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    b.season_id,
    b.team_id,
    b.match_wins::integer,
    b.match_losses::integer,
    b.game_wins::integer,
    b.game_losses::integer,
    b.division_name,
    b.playoff_rank::integer,
    b.power_score::numeric,
    b.sos::numeric,
    b.champion,
    b.runner_up,
    b.recorded_at,
    b.backed_up_at,
    s.name AS season_name
  FROM public.team_season_stats_pre_unification b
  LEFT JOIN public.seasons s ON s.id = b.season_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_get_pre_unification_team_power() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_pre_unification_season_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_pre_unification_team_power() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_pre_unification_season_stats() TO authenticated;