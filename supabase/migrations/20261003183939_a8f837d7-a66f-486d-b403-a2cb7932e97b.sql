CREATE TABLE public.team_division_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  division_id uuid NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.team_division_history TO anon, authenticated;
GRANT ALL ON public.team_division_history TO service_role;
ALTER TABLE public.team_division_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view team division history" ON public.team_division_history FOR SELECT USING (true);
CREATE INDEX team_division_history_team_idx ON public.team_division_history(team_id, changed_at);

COMMENT ON TABLE public.team_division_history IS
  'division_id = the division a team was in UNTIL changed_at. Lets power score resolve an opponent''s division on a match date after the team is moved (e.g. to Hidden).';

CREATE OR REPLACE FUNCTION public.record_team_division_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.division_id IS NOT NULL AND NEW.division_id IS DISTINCT FROM OLD.division_id THEN
    INSERT INTO public.team_division_history(team_id, division_id) VALUES (OLD.id, OLD.division_id);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_record_team_division_change
AFTER UPDATE OF division_id ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.record_team_division_change();

CREATE OR REPLACE VIEW public.v_power_score_team_matches_rated
WITH (security_invoker = on) AS
WITH resolved AS (
  SELECT tm.match_id, tm.season_id, tm.source, tm.team_id, tm.opponent_id,
    tm.is_win, tm.is_loss, tm.game_wins, tm.game_losses, tm.match_date,
    COALESCE(snap.division_id, tda_id.id, brk.division_id, hist.division_id, dcur.division_id, lastk.division_id) AS opp_division_id,
    CASE
      WHEN snap.division_id IS NOT NULL AND snap.at_or_before THEN 'snapshot_at_date'
      WHEN snap.division_id IS NOT NULL THEN 'snapshot_earliest_in_season'
      WHEN tda_id.id IS NOT NULL THEN 'archive_division_id'
      WHEN brk.division_id IS NOT NULL THEN 'bracket_division_id'
      WHEN hist.division_id IS NOT NULL THEN 'division_history'
      WHEN dcur.division_id IS NOT NULL THEN 'current_division'
      WHEN lastk.division_id IS NOT NULL THEN 'last_known_division'
      ELSE 'unresolved'
    END AS resolved_by
  FROM public.v_power_score_team_matches tm
  LEFT JOIN LATERAL (
    SELECT dr.id AS division_id,
      (s.snapshot_date <= COALESCE(tm.match_date::date, 'infinity'::date)) AS at_or_before
    FROM public.power_score_snapshots s
    JOIN public.v_division_rateable dr ON dr.id = s.division_id
    WHERE s.team_id = tm.opponent_id AND s.season_id = tm.season_id
    ORDER BY (s.snapshot_date <= COALESCE(tm.match_date::date, 'infinity'::date)) DESC,
      CASE WHEN s.snapshot_date <= COALESCE(tm.match_date::date, 'infinity'::date) THEN s.snapshot_date END DESC NULLS LAST,
      s.snapshot_date
    LIMIT 1) snap ON true
  LEFT JOIN public.team_details_archive tda ON tda.team_id = tm.opponent_id AND tda.season_id = tm.season_id
    AND NOT EXISTS (SELECT 1 FROM public.division_archive_distrust dd WHERE dd.season_id = tda.season_id)
  LEFT JOIN public.v_division_rateable tda_id ON tda_id.id = tda.division_id
    AND (tda.divisionname IS NULL
      OR lower(btrim(tda_id.display_division)) = lower(btrim(tda.divisionname))
      OR lower(btrim(tda_id.name)) = lower(btrim(tda.divisionname)))
  LEFT JOIN LATERAL (
    SELECT dr.id AS division_id
    FROM public.participants p
    JOIN public.brackets b ON b.id = p.bracket_id
    JOIN public.v_division_rateable dr ON dr.id = b.division_id
    WHERE p.team_id = tm.opponent_id AND b.season_id = tm.season_id
    ORDER BY b.created_at, b.id LIMIT 1) brk ON true
  LEFT JOIN LATERAL (
    SELECT h.division_id
    FROM public.team_division_history h
    JOIN public.v_division_rateable dr ON dr.id = h.division_id
    WHERE h.team_id = tm.opponent_id AND h.changed_at > COALESCE(tm.match_date, now())
    ORDER BY h.changed_at LIMIT 1) hist ON true
  LEFT JOIN public.v_team_current_division dcur ON dcur.team_id = tm.opponent_id
  LEFT JOIN public.v_team_last_known_division lastk ON lastk.team_id = tm.opponent_id
)
SELECT r.match_id, r.season_id, r.source, r.team_id, r.opponent_id, r.is_win, r.is_loss,
  r.game_wins, r.game_losses, r.match_date, r.opp_division_id,
  COALESCE(wh.weight, dw.division_weight) AS opp_weight,
  (COALESCE(wh.weight, dw.division_weight) IS NOT NULL) AS rates,
  r.resolved_by
FROM resolved r
LEFT JOIN LATERAL (
  SELECT h.weight FROM public.division_weight_history h
  WHERE h.division_id = r.opp_division_id AND h.valid_from <= COALESCE(r.match_date, now())
  ORDER BY h.valid_from DESC LIMIT 1) wh ON true
LEFT JOIN public.v_division_rateable dw ON dw.id = r.opp_division_id;