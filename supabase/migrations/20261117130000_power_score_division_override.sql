-- Let an admin pin an opponent's division for one season, so a game is rated by
-- the division the opponent was in THAT season.
--
-- WHY
--
-- v_power_score_team_matches_rated (20261003183939) finds an opponent's division
-- from the weekly snapshot, the archive, a bracket, the division history, the
-- current division, and last of all the last division ever seen. For the three
-- oldest seasons (Spring 2025, Summer 1 2025, Summer 2 2025) none of the first
-- four steps has an answer, so 1,280 of 1,536 team-games are unrated (364) or
-- rated by a guess (the opponent's division TODAY: 916). Seven newer games
-- against dropped-out teams are unrated too. Doug decided (2026-11-17): rate
-- them by the division the opponent had in that season.
--
-- WHAT THIS DOES (and nothing else)
--
--   1. A new table, power_score_division_override: one row per (team, season)
--      saying which division that team was in that season, with a reason.
--   2. The rated view gets a NEW FIRST step: manual_override. If the opponent
--      has an override row for the match's season, that division is used. The
--      division must be rateable (v_division_rateable): an override that points
--      at a Hidden or weightless division is IGNORED and the old steps run.
--      The 8 existing steps keep their order and their text.
--
-- AN EMPTY TABLE CHANGES NOTHING. The view then returns exactly the rows it
-- returned before: same rows, same 14 columns in the same order, same values.
-- The join is on the table's primary key, so it cannot add or drop a row, and
-- W-L records cannot move.
--
-- This file writes no override rows and recomputes no stored score. Doug does
-- both by hand with supabase/scripts/division_truth_*.sql (see docs/OPERATIONS.md
-- section 6g). A merged migration does not reach production by itself.
--
-- REVERT. Run supabase/scripts/division_truth_05_undo.sql (path 2): it deletes
-- the rows, puts the view body from 20261003183939 back and recomputes. The
-- table can stay: nothing reads it once the old view is back.
--
-- The view body below is copied from 20261003183939 with only two additions:
-- the ovr_row / ovr joins and the two manual_override lines.

-- ---------------------------------------------------------------------------
-- 1. The override table. Public read, like team_division_history,
--    division_weight_history and division_archive_distrust: the view is
--    security_invoker and anon-readable, so anon needs SELECT here or the
--    public standings would fail. Nobody but service_role (and the owner role
--    in the SQL editor) can write.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.power_score_division_override (
  team_id     uuid NOT NULL REFERENCES public.teams(id)     ON DELETE CASCADE,
  season_id   uuid NOT NULL REFERENCES public.seasons(id)   ON DELETE CASCADE,
  division_id uuid NOT NULL REFERENCES public.divisions(id) ON DELETE RESTRICT,
  reason      text NOT NULL
    CONSTRAINT power_score_division_override_reason_not_blank CHECK (btrim(reason) <> ''),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, season_id)
);

COMMENT ON TABLE public.power_score_division_override IS
  'The division a team had in one season, for rating its opponents'' games. '
  'Read FIRST by v_power_score_team_matches_rated (resolved_by = manual_override). '
  'An override to a Hidden or weightless division is ignored. reason says what '
  'was decided and why, and cannot be blank. The table is publicly readable, so '
  'keep the name of a person out of reason. Written by hand (SQL editor / '
  'service_role) only.';

ALTER TABLE public.power_score_division_override ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'power_score_division_override'
      AND policyname = 'Anyone can view power score division override'
  ) THEN
    CREATE POLICY "Anyone can view power score division override"
      ON public.power_score_division_override FOR SELECT USING (true);
  END IF;
END $$;

REVOKE ALL ON public.power_score_division_override FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.power_score_division_override TO anon, authenticated;
GRANT ALL ON public.power_score_division_override TO service_role;

-- ---------------------------------------------------------------------------
-- 2. The rated match view, with the new first step. Same 14 columns, same
--    order, same types as 20261003183939. security_invoker is repeated on
--    purpose; do not rely on it surviving.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_power_score_team_matches_rated
WITH (security_invoker = on) AS
WITH resolved AS (
  SELECT tm.match_id, tm.season_id, tm.source, tm.team_id, tm.opponent_id,
    tm.is_win, tm.is_loss, tm.game_wins, tm.game_losses, tm.match_date,
    COALESCE(ovr.id, snap.division_id, tda_id.id, brk.division_id, hist.division_id, dcur.division_id, lastk.division_id) AS opp_division_id,
    CASE
      WHEN ovr.id IS NOT NULL THEN 'manual_override'
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
  LEFT JOIN public.power_score_division_override ovr_row
    ON ovr_row.team_id = tm.opponent_id AND ovr_row.season_id = tm.season_id
  LEFT JOIN public.v_division_rateable ovr ON ovr.id = ovr_row.division_id
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

COMMENT ON VIEW public.v_power_score_team_matches_rated IS
  'v_power_score_team_matches plus the opponent''s division AS OF the match '
  'date, and that division''s weight as of the same date. resolved_by names '
  'which source answered, for coverage reporting: manual_override (a row in '
  'power_score_division_override) comes first. Adds columns only -- it never '
  'filters rows, so W-L records are unaffected.';
