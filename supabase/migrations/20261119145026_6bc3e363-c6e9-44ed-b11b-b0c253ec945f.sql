-- The public scoring view needs the lookup keys, not the internal notes.
-- Use the same definition of a rateable division as the scoring view.
DROP POLICY IF EXISTS "Anyone can view power score division override"
  ON public.power_score_division_override;

CREATE POLICY "Public can read rateable division overrides"
  ON public.power_score_division_override
  FOR SELECT TO anon, authenticated
  USING (division_id IN (SELECT id FROM public.v_division_rateable));

REVOKE SELECT ON public.power_score_division_override FROM PUBLIC, anon, authenticated;
REVOKE SELECT (reason, created_at) ON public.power_score_division_override FROM PUBLIC, anon, authenticated;
GRANT SELECT (team_id, season_id, division_id) ON public.power_score_division_override TO anon, authenticated;

COMMENT ON TABLE public.power_score_division_override IS
  'Season-specific team division overrides, read first by v_power_score_team_matches_rated. Public reads are limited to the scoring keys for rateable divisions. Reasons and entry times are internal. Writes remain limited to service_role and the owner.';