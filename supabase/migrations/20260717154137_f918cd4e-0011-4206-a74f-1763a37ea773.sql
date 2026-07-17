-- Counter-drift detector view + admin-only reconciliation RPC.
-- Derivation mirrors approve_match_result / reverse_team_stats semantics:
-- only matches with a winner contribute to counters. Ties (winner_id IS NULL)
-- must contribute nothing so completed ties do not read as drift.

CREATE OR REPLACE VIEW public.v_counter_drift
WITH (security_invoker = true) AS
WITH derived AS (
  SELECT t.id AS team_id,
         COUNT(*) FILTER (WHERE m.winner_id = t.id) AS wins,
         COUNT(*) FILTER (WHERE m.loser_id  = t.id) AS losses,
         COALESCE(SUM(CASE WHEN m.winner_id IS NULL THEN 0
                           WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                           WHEN m.team2_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                           ELSE 0 END), 0) AS game_wins,
         COALESCE(SUM(CASE WHEN m.winner_id IS NULL THEN 0
                           WHEN m.team1_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                           WHEN m.team2_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                           ELSE 0 END), 0) AS game_losses
  FROM public.teams t
  LEFT JOIN public.matches m
    ON (m.team1_id = t.id OR m.team2_id = t.id)
   AND m.winner_id IS NOT NULL
  GROUP BY t.id
)
SELECT t.id AS team_id, t.name,
       t.wins  AS counter_wins,  d.wins  AS derived_wins,
       t.losses AS counter_losses, d.losses AS derived_losses,
       t.game_wins AS counter_game_wins, d.game_wins AS derived_game_wins,
       t.game_losses AS counter_game_losses, d.game_losses AS derived_game_losses
FROM public.teams t
JOIN derived d ON d.team_id = t.id
WHERE t.wins IS DISTINCT FROM d.wins
   OR t.losses IS DISTINCT FROM d.losses
   OR t.game_wins IS DISTINCT FROM d.game_wins
   OR t.game_losses IS DISTINCT FROM d.game_losses;

REVOKE ALL ON public.v_counter_drift FROM PUBLIC;
REVOKE ALL ON public.v_counter_drift FROM anon;
GRANT SELECT ON public.v_counter_drift TO authenticated, service_role;

-- Admin-only reconciliation. Rewrites teams counters from the same derived
-- expression, then refreshes the per-season stats cache. Returns the number
-- of team rows repaired (0 when already in sync).
CREATE OR REPLACE FUNCTION public.reconcile_team_counters()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  v_repaired integer;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  WITH derived AS (
    SELECT t.id AS team_id,
           COUNT(*) FILTER (WHERE m.winner_id = t.id) AS wins,
           COUNT(*) FILTER (WHERE m.loser_id  = t.id) AS losses,
           COALESCE(SUM(CASE WHEN m.winner_id IS NULL THEN 0
                             WHEN m.team1_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                             WHEN m.team2_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                             ELSE 0 END), 0) AS game_wins,
           COALESCE(SUM(CASE WHEN m.winner_id IS NULL THEN 0
                             WHEN m.team1_id = t.id THEN COALESCE(m.team2_game_wins, 0)
                             WHEN m.team2_id = t.id THEN COALESCE(m.team1_game_wins, 0)
                             ELSE 0 END), 0) AS game_losses
    FROM public.teams t
    LEFT JOIN public.matches m
      ON (m.team1_id = t.id OR m.team2_id = t.id)
     AND m.winner_id IS NOT NULL
    GROUP BY t.id
  ),
  updated AS (
    UPDATE public.teams t
       SET wins = d.wins,
           losses = d.losses,
           game_wins = d.game_wins,
           game_losses = d.game_losses
      FROM derived d
     WHERE d.team_id = t.id
       AND (t.wins IS DISTINCT FROM d.wins
         OR t.losses IS DISTINCT FROM d.losses
         OR t.game_wins IS DISTINCT FROM d.game_wins
         OR t.game_losses IS DISTINCT FROM d.game_losses)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_repaired FROM updated;

  PERFORM public.upsert_team_season_stats();

  RETURN v_repaired;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reconcile_team_counters() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reconcile_team_counters() TO authenticated;

COMMENT ON VIEW public.v_counter_drift IS
  'Teams whose denormalized win/loss/game counters disagree with completed-match history. Ties contribute nothing (matching approve/reverse RPC semantics).';
COMMENT ON FUNCTION public.reconcile_team_counters() IS
  'Admin-only. Rewrites teams counters from decided matches and refreshes team_season_stats. Idempotent; returns repaired-row count.';
