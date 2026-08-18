-- 1. Backups before any write
CREATE TABLE IF NOT EXISTS public.team_season_stats_pre_career_split AS
SELECT *, now() AS backed_up_at FROM public.team_season_stats;
REVOKE ALL ON public.team_season_stats_pre_career_split FROM PUBLIC, anon, authenticated;
ALTER TABLE public.team_season_stats_pre_career_split ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.team_season_stats_pre_career_split TO service_role;

CREATE TABLE IF NOT EXISTS public.team_details_pre_career_split AS
SELECT team_id, name, divisionname, wins, losses, game_wins, game_losses,
       win_percentage, game_win_percentage, weighted_win_percentage,
       weighted_game_win_percentage, sos, power_score, now() AS backed_up_at
FROM public.v_team_details;
REVOKE ALL ON public.team_details_pre_career_split FROM PUBLIC, anon, authenticated;
ALTER TABLE public.team_details_pre_career_split ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.team_details_pre_career_split TO service_role;

-- 2. Restore the additive (no-floor) standings formula
CREATE OR REPLACE FUNCTION public.power_score_100(p_weighted_win_pct numeric, p_sos numeric, p_weighted_game_win_pct numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT (COALESCE(p_weighted_win_pct, 0)      * 40.0)
       + (COALESCE(p_weighted_game_win_pct, 0) * 15.0)
       + (COALESCE(p_sos, 0.5)                 * 45.0)
$function$;

COMMENT ON FUNCTION public.power_score_100(numeric, numeric, numeric) IS
  'Standings / season power score: 40 x weighted match win rate + 15 x weighted game win rate + 45 x SOS. No performance floor — see power_score_100_career() for the career variant.';

-- 3. Career variant with the earned-schedule credit
CREATE OR REPLACE FUNCTION public.power_score_100_career(p_weighted_win_pct numeric, p_sos numeric, p_weighted_game_win_pct numeric)
 RETURNS numeric
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT (COALESCE(p_weighted_win_pct, 0)      * 40.0)
       + (COALESCE(p_weighted_game_win_pct, 0) * 15.0)
       + (COALESCE(p_sos, 0.5)                 * 45.0
          * LEAST(1.0, ((COALESCE(p_weighted_win_pct, 0) * 40.0
                       + COALESCE(p_weighted_game_win_pct, 0) * 15.0)
                       / 55.0)
                       / 0.30))
$function$;

COMMENT ON FUNCTION public.power_score_100_career(numeric, numeric, numeric) IS
  'Career power score: same 40/15/45 weights, but the 45 SOS points are multiplied by min(1, performance / 0.30) so a team that rarely wins cannot bank a hard schedule over many seasons.';

-- 4. Views expose both numbers
CREATE OR REPLACE VIEW public.v_team_details AS
 SELECT t.id AS team_id,
    t.name,
    t.logo_url,
    t.image_url,
    t.players,
    t.created_at,
    t.division_id,
    COALESCE(d.display_division, 'Recreational'::text) AS divisionname,
    COALESCE(stats.win_percentage, (0)::numeric) AS win_percentage,
    COALESCE(stats.game_win_percentage, (0)::numeric) AS game_win_percentage,
    COALESCE(stats.wins, (t.wins)::bigint) AS wins,
    COALESCE(stats.losses, (t.losses)::bigint) AS losses,
    COALESCE(stats.game_wins, (t.game_wins)::bigint) AS game_wins,
    COALESCE(stats.game_losses, (t.game_losses)::bigint) AS game_losses,
    COALESCE(stats.close_match_losses, (0)::bigint) AS close_match_losses,
    COALESCE(comp.weighted_win_pct, (0)::numeric) AS weighted_win_percentage,
    COALESCE(comp.weighted_game_win_pct, (0)::numeric) AS weighted_game_win_percentage,
    COALESCE(comp.sos, 0.5) AS sos,
        CASE
            WHEN ((comp.team_id IS NULL) OR (comp.matches_played = 0)) THEN NULL::numeric
            ELSE power_score_100(comp.weighted_win_pct, comp.sos, comp.weighted_game_win_pct)
        END AS power_score,
        CASE
            WHEN ((comp.team_id IS NULL) OR (comp.matches_played = 0)) THEN NULL::numeric
            ELSE power_score_100_career(comp.weighted_win_pct, comp.sos, comp.weighted_game_win_pct)
        END AS career_power_score
   FROM (((teams t
     LEFT JOIN divisions d ON ((t.division_id = d.id)))
     LEFT JOIN v_team_match_stats stats ON ((t.id = stats.team_id)))
     LEFT JOIN v_power_score_components_current comp ON ((t.id = comp.team_id)))
  ORDER BY t.name;

ALTER VIEW public.v_team_details SET (security_invoker = on);

CREATE OR REPLACE VIEW public.v_team_season_agg AS
 SELECT c.season_id,
    c.team_id,
    c.wins AS match_wins,
    c.losses AS match_losses,
    c.game_wins,
    c.game_losses,
        CASE
            WHEN ((c.wins + c.losses) > 0) THEN ((c.wins)::numeric / ((c.wins + c.losses))::numeric)
            ELSE NULL::numeric
        END AS win_percentage,
        CASE
            WHEN ((c.game_wins + c.game_losses) > 0) THEN ((c.game_wins)::numeric / ((c.game_wins + c.game_losses))::numeric)
            ELSE NULL::numeric
        END AS game_win_percentage,
    c.sos,
        CASE
            WHEN (((c.wins + c.losses) > 0) AND (c.sos IS NOT NULL)) THEN (power_score_100(c.weighted_win_pct, c.sos, c.weighted_game_win_pct) / 100.0)
            ELSE NULL::numeric
        END AS power_score,
    COALESCE(tda.divisionname, d.display_division) AS division_name,
        CASE
            WHEN (((c.wins + c.losses) > 0) AND (c.sos IS NOT NULL)) THEN (power_score_100_career(c.weighted_win_pct, c.sos, c.weighted_game_win_pct) / 100.0)
            ELSE NULL::numeric
        END AS career_power_score
   FROM (((v_power_score_components c
     LEFT JOIN teams t ON ((t.id = c.team_id)))
     LEFT JOIN divisions d ON ((d.id = t.division_id)))
     LEFT JOIN team_details_archive tda ON (((tda.team_id = c.team_id) AND (tda.season_id = c.season_id))));

ALTER VIEW public.v_team_season_agg SET (security_invoker = on);

-- 5. Season stats table carries both numbers
ALTER TABLE public.team_season_stats ADD COLUMN IF NOT EXISTS career_power_score numeric;

COMMENT ON COLUMN public.team_season_stats.career_power_score IS
  'Floored (earned-schedule) power score used by Career rankings only. power_score stays the plain standings value.';

-- 6. Upsert writes both, with the same archived-season freeze rules
CREATE OR REPLACE FUNCTION public.upsert_team_season_stats(
  p_include_archived boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_season_stats
    (season_id, team_id, match_wins, match_losses, game_wins, game_losses,
     sos, power_score, career_power_score, division_name, recorded_at)
  SELECT
    season_id, team_id, match_wins::integer, match_losses::integer,
    game_wins::integer, game_losses::integer, sos, power_score, career_power_score,
    division_name,
    now()
  FROM v_team_season_agg
  WHERE team_id IS NOT NULL
    AND season_id IS NOT NULL
  ON CONFLICT (season_id, team_id) DO UPDATE
  SET
    match_wins   = EXCLUDED.match_wins,
    match_losses = EXCLUDED.match_losses,
    game_wins    = EXCLUDED.game_wins,
    game_losses  = EXCLUDED.game_losses,
    sos = CASE
      WHEN NOT p_include_archived AND EXISTS (
        SELECT 1 FROM public.seasons s
        WHERE s.id = EXCLUDED.season_id AND s.is_archived = true
      ) THEN team_season_stats.sos
      ELSE EXCLUDED.sos
    END,
    power_score = CASE
      WHEN NOT p_include_archived AND EXISTS (
        SELECT 1 FROM public.seasons s
        WHERE s.id = EXCLUDED.season_id AND s.is_archived = true
      ) THEN team_season_stats.power_score
      ELSE EXCLUDED.power_score
    END,
    career_power_score = CASE
      WHEN NOT p_include_archived AND EXISTS (
        SELECT 1 FROM public.seasons s
        WHERE s.id = EXCLUDED.season_id AND s.is_archived = true
      ) THEN team_season_stats.career_power_score
      ELSE EXCLUDED.career_power_score
    END,
    division_name = CASE
      WHEN NOT p_include_archived AND EXISTS (
        SELECT 1 FROM public.seasons s
        WHERE s.id = EXCLUDED.season_id AND s.is_archived = true
      ) THEN team_season_stats.division_name
      ELSE EXCLUDED.division_name
    END,
    recorded_at  = now();
END;
$$;

-- 7. Backfill every season with both values
UPDATE public.team_season_stats tss
SET power_score        = agg.power_score,
    career_power_score = agg.career_power_score,
    sos                = agg.sos,
    recorded_at        = now()
FROM public.v_team_season_agg agg
WHERE agg.season_id = tss.season_id
  AND agg.team_id = tss.team_id;