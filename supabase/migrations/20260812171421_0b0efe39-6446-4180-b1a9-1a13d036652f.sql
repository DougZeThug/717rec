-- Rate opponents by the division they were actually in when the match was played.
--
-- THE BUG
--
-- v_power_score_components resolved an opponent's division weight by joining
-- teams.division_id -- a mutable, current pointer -- for every match ever
-- played. Two consequences:
--
--   1. There is no "withdrawn" flag on teams. Removing a team mid-season is done
--      by moving it to the Hidden division (weight -1.0) from the ordinary
--      division dropdown, which overwrites division_id in place with no history.
--      One team played a full slate in Recreational, dropped out, and was moved
--      to Hidden -- so every team that beat them retroactively earned a NEGATIVE
--      weighted win.
--   2. Any promotion or relegation silently re-rated every historical season the
--      team appeared in, because the join always used the current division.
--
-- 20260811210000 excluded Hidden opponents outright. That stopped the negative
-- weights but was still wrong: those were genuine Recreational matches and
-- should count at Recreational weight. Dropping a WIN lowers the winner's score
-- relative to counting it properly.
--
-- THE RULE
--
-- The actual division row's weight is what counts. Display divisions are for
-- rendering standings and must never feed a weight.
--
-- Every step of the chain below resolves a real divisions.id. No step converts a
-- division NAME into a weight, because names cannot be mapped back to a row:
-- team_season_stats.division_name has six writers with three different
-- semantics, and for a season where two brackets shared a display division it
-- holds synthetic strings like 'Intermediate 1' that match no row in divisions
-- at all -- whose ordinal comes from ROW_NUMBER() ORDER BY bracket title, i.e.
-- alphabetical order, not weight.
--
-- NO WEIGHT LITERAL APPEARS IN THIS FILE. divisions is edited through the admin
-- UI and holds rows no migration ever created, so the values seeded in the
-- migrations are not the live values. Weights are always read, never assumed.

-- ---------------------------------------------------------------------------
-- PART B. Version division weights.
--
-- divisions.division_weight is edited in place, so changing a weight silently
-- rewrote every past score. History starts now; earlier weight edits were never
-- recorded and are unrecoverable.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.division_weight_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id uuid NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
  weight      numeric NOT NULL,
  valid_from  timestamptz NOT NULL DEFAULT now(),
  valid_to    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_division_weight_history_lookup
  ON public.division_weight_history (division_id, valid_from DESC);

COMMENT ON TABLE public.division_weight_history IS
  'Weight of each division over time. The open row (valid_to IS NULL) is the '
  'current weight. Seeded from the earliest season start, so it covers all '
  'existing history; weight changes made before this table existed were never '
  'recorded.';

ALTER TABLE public.division_weight_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'division_weight_history'
      AND policyname = 'Anyone can view division weight history'
  ) THEN
    CREATE POLICY "Anyone can view division weight history"
      ON public.division_weight_history FOR SELECT USING (true);
  END IF;
END $$;

-- Seed one open row per division that has a weight, back-dated to the earliest
-- season so every existing match is covered.
INSERT INTO public.division_weight_history (division_id, weight, valid_from)
SELECT
  d.id,
  d.division_weight,
  COALESCE((SELECT min(s.start_date)::timestamptz FROM public.seasons s),
           '2000-01-01'::timestamptz)
FROM public.divisions d
WHERE d.division_weight IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.division_weight_history h WHERE h.division_id = d.id
  );

CREATE OR REPLACE FUNCTION public.record_division_weight_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.division_weight IS NOT NULL THEN
      INSERT INTO public.division_weight_history (division_id, weight)
      VALUES (NEW.id, NEW.division_weight);
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.division_weight IS DISTINCT FROM OLD.division_weight THEN
    UPDATE public.division_weight_history
       SET valid_to = now()
     WHERE division_id = NEW.id
       AND valid_to IS NULL;

    IF NEW.division_weight IS NOT NULL THEN
      INSERT INTO public.division_weight_history (division_id, weight)
      VALUES (NEW.id, NEW.division_weight);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_division_weight_change ON public.divisions;
CREATE TRIGGER trg_record_division_weight_change
AFTER INSERT OR UPDATE ON public.divisions
FOR EACH ROW EXECUTE FUNCTION public.record_division_weight_change();

-- ---------------------------------------------------------------------------
-- PART C. Resolution helpers.
-- ---------------------------------------------------------------------------

-- Hidden is identified by name prefix OR negative weight, never by a specific
-- value. Catches the seeded Hidden (negative weight) and Hidden2 (positive
-- weight, display name 'Hidden'), and any future admin-created variant.
CREATE OR REPLACE FUNCTION public.division_is_hidden(
  p_name text, p_display text, p_weight numeric
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(p_display, '') ILIKE 'hidden%'
      OR COALESCE(p_name, '')    ILIKE 'hidden%'
      OR (p_weight IS NOT NULL AND p_weight < 0);
$$;

COMMENT ON FUNCTION public.division_is_hidden(text, text, numeric) IS
  'True for administrative Hidden divisions. Prefix match plus a negative-weight '
  'backstop, so no weight literal is needed.';

-- Divisions that can carry a rating: not Hidden, and with a weight. The weight
-- test also excludes the weightless legacy rows (Competitive, Intermediate,
-- INT1 and the historical-divisions-* FK placeholders), so the chain falls
-- through them instead of resolving to a NULL weight.
--
-- Owner-rights on purpose (no security_invoker) -- see the RLS note below.
CREATE OR REPLACE VIEW public.v_division_rateable AS
SELECT d.id, d.name, d.display_division, d.division_weight
FROM public.divisions d
WHERE d.division_weight IS NOT NULL
  AND NOT public.division_is_hidden(d.name, d.display_division, d.division_weight);

COMMENT ON VIEW public.v_division_rateable IS
  'Divisions eligible to contribute a power-score weight. Every step of the '
  'opponent resolution joins through this, so "never Hidden, never weightless" '
  'is structural rather than a filter each caller has to remember.';

-- RLS NOTE, and the one deliberate departure in this migration.
--
-- public.teams carries a policy that hides opted-out teams from everyone. Under
-- security_invoker that would make a logged-out visitor compute a DIFFERENT
-- power score than an admin. These three views are therefore owner-rights, so
-- every reader resolves the same weights. They expose only
-- team -> division -> weight, which is already public on the standings and
-- History pages.
--
-- The repo has otherwise been moving toward security_invoker everywhere
-- (20260713120000_harden_security_definer_search_paths.sql). This is a narrow,
-- intentional exception, not an oversight.
CREATE OR REPLACE VIEW public.v_team_current_division AS
SELECT t.id AS team_id, dr.id AS division_id
FROM public.teams t
JOIN public.v_division_rateable dr ON dr.id = t.division_id;

COMMENT ON VIEW public.v_team_current_division IS
  'Each team''s current rateable division. Owner-rights so anon and admin '
  'resolve identical weights despite the opt-out policy on public.teams.';

-- Last non-Hidden division we ever observed for a team, from the weekly
-- snapshots. The fallback for a team that has since dropped out.
CREATE OR REPLACE VIEW public.v_team_last_known_division AS
SELECT DISTINCT ON (s.team_id)
  s.team_id,
  dr.id AS division_id
FROM public.power_score_snapshots s
JOIN public.v_division_rateable dr ON dr.id = s.division_id
ORDER BY s.team_id, s.snapshot_date DESC, s.week_number DESC;

COMMENT ON VIEW public.v_team_last_known_division IS
  'Most recent rateable division observed per team in power_score_snapshots, '
  'across all seasons. Last-resort identity for teams that have since been '
  'moved to Hidden.';

-- Seasons whose team_details_archive.division_id is known to be unreliable.
-- Summer 1 and Summer 2 2025 had theirs backfilled in January 2026 from
-- whatever divisions teams were in AT THAT TIME (20260115193534), so the ids
-- describe January 2026, not the season. Those seasons fall through to bracket
-- participation instead.
CREATE TABLE IF NOT EXISTS public.division_archive_distrust (
  season_id uuid PRIMARY KEY,
  reason    text NOT NULL
);

COMMENT ON TABLE public.division_archive_distrust IS
  'Seasons where team_details_archive.division_id must not be trusted as a '
  'point-in-time division. Add a row rather than hardcoding season ids in a view.';

ALTER TABLE public.division_archive_distrust ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'division_archive_distrust'
      AND policyname = 'Anyone can view division archive distrust'
  ) THEN
    CREATE POLICY "Anyone can view division archive distrust"
      ON public.division_archive_distrust FOR SELECT USING (true);
  END IF;
END $$;

-- Seeded via SELECT ... FROM seasons so this is a no-op on a database that does
-- not have these seasons (a fresh CI replay, for instance).
INSERT INTO public.division_archive_distrust (season_id, reason)
SELECT s.id,
       'division_id backfilled 2026-01 from then-current teams.division_id '
       || '(migration 20260115193534); it describes Jan 2026, not the season'
FROM public.seasons s
WHERE s.id IN (
  'e537c594-3ba9-4d79-ba63-f6ed90c89e30',  -- Summer 1 2025
  'd50bb12e-99be-4170-802a-695a402373ce'   -- Summer 2 2025
)
ON CONFLICT (season_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_snapshots_team_season_date
  ON public.power_score_snapshots (team_id, season_id, snapshot_date DESC);

-- ---------------------------------------------------------------------------
-- The rated match view. Adds columns to v_power_score_team_matches and never
-- filters rows, so W-L records cannot move.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_power_score_team_matches_rated
WITH (security_invoker = on) AS
WITH resolved AS (
  SELECT
    tm.match_id,
    tm.season_id,
    tm.source,
    tm.team_id,
    tm.opponent_id,
    tm.is_win,
    tm.is_loss,
    tm.game_wins,
    tm.game_losses,
    tm.match_date,
    COALESCE(
      snap.division_id,     -- 1/2: weekly snapshot, point-in-time
      tda_id.id,            -- 3:   archived season snapshot, cross-checked
      brk.division_id,      -- 4:   playoff bracket participation
      dcur.division_id,     -- 5:   current division
      lastk.division_id     -- 6:   last division ever observed
    ) AS opp_division_id,
    CASE
      WHEN snap.division_id IS NOT NULL AND snap.at_or_before THEN 'snapshot_at_date'
      WHEN snap.division_id IS NOT NULL                       THEN 'snapshot_earliest_in_season'
      WHEN tda_id.id        IS NOT NULL THEN 'archive_division_id'
      WHEN brk.division_id  IS NOT NULL THEN 'bracket_division_id'
      WHEN dcur.division_id IS NOT NULL THEN 'current_division'
      WHEN lastk.division_id IS NOT NULL THEN 'last_known_division'
      ELSE 'unresolved'
    END AS resolved_by
  FROM public.v_power_score_team_matches tm

  -- 1/2. Prefer the newest snapshot at or before the match; otherwise the
  -- earliest snapshot in that season, for matches predating snapshot coverage.
  LEFT JOIN LATERAL (
    SELECT
      dr.id AS division_id,
      (s.snapshot_date <= COALESCE(tm.match_date::date, 'infinity'::date)) AS at_or_before
    FROM public.power_score_snapshots s
    JOIN public.v_division_rateable dr ON dr.id = s.division_id
    WHERE s.team_id = tm.opponent_id
      AND s.season_id = tm.season_id
    ORDER BY
      (s.snapshot_date <= COALESCE(tm.match_date::date, 'infinity'::date)) DESC,
      CASE WHEN s.snapshot_date <= COALESCE(tm.match_date::date, 'infinity'::date)
           THEN s.snapshot_date END DESC NULLS LAST,
      s.snapshot_date ASC
    LIMIT 1
  ) snap ON true

  -- 3. The archived per-season snapshot. division_id is stamped from live teams
  -- at archive time while divisionname is frozen and bracket-aware, so when the
  -- two disagree the id is the stale one -- accept it only when they agree.
  LEFT JOIN public.team_details_archive tda
         ON tda.team_id = tm.opponent_id
        AND tda.season_id = tm.season_id
        AND NOT EXISTS (
          SELECT 1 FROM public.division_archive_distrust dd
          WHERE dd.season_id = tda.season_id
        )
  LEFT JOIN public.v_division_rateable tda_id
         ON tda_id.id = tda.division_id
        AND (
          tda.divisionname IS NULL
          OR lower(btrim(tda_id.display_division)) = lower(btrim(tda.divisionname))
          OR lower(btrim(tda_id.name))             = lower(btrim(tda.divisionname))
        )

  -- 4. Playoff bracket participation. Deterministic ordering, never a bare
  -- LIMIT 1: a team can legitimately appear in more than one bracket, and
  -- cross-division playoff seeding is deliberate, so this is a weak signal --
  -- which is why it sits below the archive.
  LEFT JOIN LATERAL (
    SELECT dr.id AS division_id
    FROM public.participants p
    JOIN public.brackets b ON b.id = p.bracket_id
    JOIN public.v_division_rateable dr ON dr.id = b.division_id
    WHERE p.team_id = tm.opponent_id
      AND b.season_id = tm.season_id
    ORDER BY b.created_at NULLS LAST, b.id
    LIMIT 1
  ) brk ON true

  LEFT JOIN public.v_team_current_division    dcur  ON dcur.team_id  = tm.opponent_id
  LEFT JOIN public.v_team_last_known_division lastk ON lastk.team_id = tm.opponent_id
)
SELECT
  r.match_id,
  r.season_id,
  r.source,
  r.team_id,
  r.opponent_id,
  r.is_win,
  r.is_loss,
  r.game_wins,
  r.game_losses,
  r.match_date,
  r.opp_division_id,
  COALESCE(wh.weight, dw.division_weight) AS opp_weight,
  (COALESCE(wh.weight, dw.division_weight) IS NOT NULL) AS rates,
  r.resolved_by
FROM resolved r
-- The weight that division carried on the match date. Falls back to the current
-- weight for dates predating the weight history.
LEFT JOIN LATERAL (
  SELECT h.weight
  FROM public.division_weight_history h
  WHERE h.division_id = r.opp_division_id
    AND h.valid_from <= COALESCE(r.match_date, now())
  ORDER BY h.valid_from DESC
  LIMIT 1
) wh ON true
LEFT JOIN public.v_division_rateable dw ON dw.id = r.opp_division_id;

COMMENT ON VIEW public.v_power_score_team_matches_rated IS
  'v_power_score_team_matches plus the opponent''s division AS OF the match '
  'date, and that division''s weight as of the same date. resolved_by names '
  'which source answered, for coverage reporting. Adds columns only -- it never '
  'filters rows, so W-L records are unaffected.';

GRANT SELECT ON public.v_division_rateable            TO anon, authenticated;
GRANT SELECT ON public.v_team_current_division        TO anon, authenticated;
GRANT SELECT ON public.v_team_last_known_division     TO anon, authenticated;
GRANT SELECT ON public.v_power_score_team_matches_rated TO anon, authenticated;
GRANT SELECT ON public.division_weight_history        TO anon, authenticated;
GRANT SELECT ON public.division_archive_distrust      TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Both component views now read the rated view. The three weighted expressions
-- and all five record columns are byte-identical to 20260811210000; only the
-- source of opp_weight and rates has changed.
--
-- The hardcoded 0.85 default from that migration is gone: it was a hardcoded
-- weight, and steps 5 and 6 cover the cases it existed for.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_power_score_components
WITH (security_invoker = on) AS
SELECT
  rm.season_id,
  rm.team_id,
  COUNT(rm.match_id)::bigint AS matches_played,
  COALESCE(SUM(CASE WHEN rm.is_win THEN 1 ELSE 0 END), 0)::bigint AS wins,
  COALESCE(SUM(CASE WHEN rm.is_loss THEN 1 ELSE 0 END), 0)::bigint AS losses,
  COALESCE(SUM(rm.game_wins), 0)::bigint AS game_wins,
  COALESCE(SUM(rm.game_losses), 0)::bigint AS game_losses,
  CASE
    WHEN COALESCE(SUM(rm.opp_weight) FILTER (WHERE rm.rates), 0) = 0 THEN 0
    ELSE COALESCE(SUM(rm.opp_weight) FILTER (WHERE rm.rates AND rm.is_win), 0)
         / NULLIF(SUM(rm.opp_weight) FILTER (WHERE rm.rates), 0)
  END AS weighted_win_pct,
  CASE
    WHEN COUNT(DISTINCT rm.opponent_id) FILTER (WHERE rm.rates) = 0 THEN 0.5
    ELSE GREATEST(0.1, LEAST(1.0, AVG(rm.opp_weight) FILTER (WHERE rm.rates)))
  END AS sos,
  CASE
    WHEN COALESCE(SUM((rm.game_wins + rm.game_losses) * rm.opp_weight)
                  FILTER (WHERE rm.rates), 0) = 0 THEN 0
    ELSE COALESCE(SUM(rm.game_wins * rm.opp_weight) FILTER (WHERE rm.rates), 0)
         / NULLIF(SUM((rm.game_wins + rm.game_losses) * rm.opp_weight)
                  FILTER (WHERE rm.rates), 0)
  END AS weighted_game_win_pct
FROM public.v_power_score_team_matches_rated rm
GROUP BY rm.season_id, rm.team_id;

COMMENT ON VIEW public.v_power_score_components IS
  'Per-season power score inputs for every team. Feed to power_score_100(). '
  'Opponent weight is resolved as of the match date; see '
  'v_power_score_team_matches_rated. weighted_win_pct and weighted_game_win_pct '
  'are true weighted averages on a 0-1 scale, with opponent strength carried by '
  'the sos term. Matches whose opponent division cannot be determined are '
  'excluded from the three weighted terms but still count in matches_played, '
  'wins, losses, game_wins and game_losses.';

CREATE OR REPLACE VIEW public.v_power_score_components_current
WITH (security_invoker = on) AS
SELECT
  rm.team_id,
  COUNT(rm.match_id)::bigint AS matches_played,
  COALESCE(SUM(CASE WHEN rm.is_win THEN 1 ELSE 0 END), 0)::bigint AS wins,
  COALESCE(SUM(CASE WHEN rm.is_loss THEN 1 ELSE 0 END), 0)::bigint AS losses,
  COALESCE(SUM(rm.game_wins), 0)::bigint AS game_wins,
  COALESCE(SUM(rm.game_losses), 0)::bigint AS game_losses,
  CASE
    WHEN COALESCE(SUM(rm.opp_weight) FILTER (WHERE rm.rates), 0) = 0 THEN 0
    ELSE COALESCE(SUM(rm.opp_weight) FILTER (WHERE rm.rates AND rm.is_win), 0)
         / NULLIF(SUM(rm.opp_weight) FILTER (WHERE rm.rates), 0)
  END AS weighted_win_pct,
  CASE
    WHEN COUNT(DISTINCT rm.opponent_id) FILTER (WHERE rm.rates) = 0 THEN 0.5
    ELSE GREATEST(0.1, LEAST(1.0, AVG(rm.opp_weight) FILTER (WHERE rm.rates)))
  END AS sos,
  CASE
    WHEN COALESCE(SUM((rm.game_wins + rm.game_losses) * rm.opp_weight)
                  FILTER (WHERE rm.rates), 0) = 0 THEN 0
    ELSE COALESCE(SUM(rm.game_wins * rm.opp_weight) FILTER (WHERE rm.rates), 0)
         / NULLIF(SUM((rm.game_wins + rm.game_losses) * rm.opp_weight)
                  FILTER (WHERE rm.rates), 0)
  END AS weighted_game_win_pct
FROM public.v_power_score_team_matches_rated rm
WHERE rm.source = 'regular'
   OR (
     rm.source = 'playoff'
     AND rm.season_id = public.current_standings_season_id()
   )
GROUP BY rm.team_id;

COMMENT ON VIEW public.v_power_score_components_current IS
  'v_power_score_components over the live season only, ungrouped by season, for v_team_details.';

-- ---------------------------------------------------------------------------
-- PART D. Backfill once, then freeze history.
--
-- ORDER MATTERS. The backfill has to run while upsert_team_season_stats() still
-- recomputes archived seasons. The freeze is installed immediately afterwards.
-- ---------------------------------------------------------------------------

-- 1. Backup. The existing team_season_stats_pre_unification table is from the
-- 20260809 change and will NOT restore this one.
CREATE TABLE IF NOT EXISTS public.team_season_stats_pre_division_history AS
SELECT t.*, now() AS backed_up_at
FROM public.team_season_stats t;

COMMENT ON TABLE public.team_season_stats_pre_division_history IS
  'team_season_stats as it stood immediately before opponent divisions became '
  'point-in-time. Restore source if this change needs undoing.';

-- 2. Backfill, with the pre-freeze function definition still in place.
SELECT public.upsert_team_season_stats();

-- 3. Freeze. Archived seasons stop recomputing, extending the guard that
-- already protects division_name to power_score and sos. From here nothing an
-- admin edits -- division, weight, or team -- can move a finished season.
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
  WHERE team_id IS NOT NULL
    AND season_id IS NOT NULL
  ON CONFLICT (season_id, team_id) DO UPDATE
  SET
    match_wins   = EXCLUDED.match_wins,
    match_losses = EXCLUDED.match_losses,
    game_wins    = EXCLUDED.game_wins,
    game_losses  = EXCLUDED.game_losses,
    -- Archived seasons are immutable. Their ratings were computed from the best
    -- point-in-time division data available at backfill; recomputing them later
    -- would let a present-day division or weight edit rewrite finished history,
    -- which is the defect this migration exists to close. Use
    -- admin_recompute_season_power() for a deliberate repair.
    sos = CASE
      WHEN EXISTS (
        SELECT 1 FROM public.seasons s
        WHERE s.id = EXCLUDED.season_id AND s.is_archived = true
      ) THEN team_season_stats.sos
      ELSE EXCLUDED.sos
    END,
    power_score = CASE
      WHEN EXISTS (
        SELECT 1 FROM public.seasons s
        WHERE s.id = EXCLUDED.season_id AND s.is_archived = true
      ) THEN team_season_stats.power_score
      ELSE EXCLUDED.power_score
    END,
    division_name = CASE
      WHEN EXISTS (
        SELECT 1 FROM public.seasons s
        WHERE s.id = EXCLUDED.season_id AND s.is_archived = true
      ) THEN team_season_stats.division_name
      ELSE EXCLUDED.division_name
    END,
    recorded_at  = now();
END;
$$;

COMMENT ON FUNCTION public.upsert_team_season_stats() IS
  'Propagates v_team_season_agg into team_season_stats. Archived seasons are '
  'frozen for division_name, power_score and sos.';

-- 4. The deliberate escape hatch, so freezing does not mean locked out.
CREATE OR REPLACE FUNCTION public.admin_recompute_season_power(p_season_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.team_season_stats tss
  SET power_score = agg.power_score,
      sos         = agg.sos,
      recorded_at = now()
  FROM public.v_team_season_agg agg
  WHERE agg.season_id = tss.season_id
    AND agg.team_id   = tss.team_id
    AND tss.season_id = p_season_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.admin_recompute_season_power(uuid) IS
  'Deliberately recompute one season''s power_score and sos, bypassing the '
  'archived-season freeze in upsert_team_season_stats(). Admin only.';

REVOKE ALL ON FUNCTION public.admin_recompute_season_power(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_recompute_season_power(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Not done here, on purpose:
--
--   * power_score_snapshots.power_score is left alone. Those rows record what
--     was true that week; rewriting them would erase the trend history. Trend
--     arrows will show a one-time jump the week this ships.
--   * team_details_archive.power_score / .sos are not refreshed. Nothing reads
--     them for scores (v_team_season_agg reads only tda.divisionname), so they
--     stay stale rather than being given a false freshness.
--   * If someone runs admin_revert_power_score_unification(), it restores
--     pre-unification definitions that do not reference v_power_score_components
--     at all -- this fix then silently stops applying, and
--     admin_power_unification_status() will not say so.
-- ---------------------------------------------------------------------------