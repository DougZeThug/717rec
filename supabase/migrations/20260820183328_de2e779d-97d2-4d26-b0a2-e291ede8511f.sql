-- Power Score Sandbox: admin-adjustable formula weights.
--
-- The 40/45/15 weights (match win / SOS / game win) have always been literals
-- inside power_score_100() and power_score_100_career(). This migration makes
-- them data:
--
--   power_score_weight_history            append-only weight history, seeded 40/45/15
--   power_score_weights_regenerate()      private helper: rebuilds both formula
--                                         functions for a given weight triple
--   get_power_score_weights()             public reader: current + previous weights
--   admin_set_power_score_weights()       admin: apply a new triple and recompute
--                                         every season (archived included)
--   admin_revert_power_score_weights()    admin: go back to the previous triple
--
-- Design notes:
--
--   * The formula functions are regenerated with CREATE OR REPLACE, never
--     DROPped. v_team_details and v_team_season_agg reference them by OID, so
--     a DROP would take the views down with it (or fail), while OR REPLACE
--     swaps the body in place and every dependent view immediately computes
--     with the new weights.
--   * The regenerated bodies come from EXECUTE format() with numeric-only
--     parameters — there is no path for arbitrary text into the SQL.
--   * Weight swap and data recompute (upsert_team_season_stats(true), the
--     archived-season-bypassing form from 20260812171710) run in one
--     transaction, so no reader ever sees a mixed-formula state.
--   * The history table is append-only: revert ADDS a row copying the
--     previous weights rather than deleting the latest, so the audit trail
--     keeps every change and revert-of-revert simply toggles A <-> B.
--   * The final DO block re-asserts the formula from the LATEST history row,
--     not from hardcoded defaults, so re-running this file can never silently
--     reset weights an admin has chosen since.
--
-- Applying to production: see docs/OPERATIONS.md §6b (plain-language runbook).
-- Frontend: src/components/admin/power-sandbox/ ("Power Score Sandbox" tab).

-- ---------------------------------------------------------------------------
-- 1. The weight history table. Append-only; the latest row is the live triple.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.power_score_weight_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  win_weight numeric NOT NULL CHECK (win_weight >= 0),
  sos_weight numeric NOT NULL CHECK (sos_weight >= 0),
  game_weight numeric NOT NULL CHECK (game_weight >= 0),
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by uuid,
  note text,
  -- The formula hands out exactly 100 points; anything else silently rescales
  -- every score on the site.
  CONSTRAINT power_score_weights_sum_100
    CHECK (win_weight + sos_weight + game_weight = 100),
  -- power_score_100_career() divides by (win_weight + game_weight); a 0/100/0
  -- triple would make it divide by zero.
  CONSTRAINT power_score_weights_performance_nonzero
    CHECK (win_weight + game_weight > 0)
);

COMMENT ON TABLE public.power_score_weight_history IS
  'Append-only history of the power score formula weights. The latest row is '
  'what power_score_100() / power_score_100_career() are generated from. '
  'Written only by admin_set_power_score_weights() / admin_revert_power_score_weights().';

ALTER TABLE public.power_score_weight_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view power score weight history"
  ON public.power_score_weight_history;
CREATE POLICY "Anyone can view power score weight history"
  ON public.power_score_weight_history
  FOR SELECT TO anon, authenticated USING (true);
-- No INSERT/UPDATE/DELETE policies on purpose: all writes go through the
-- SECURITY DEFINER admin functions below.

REVOKE ALL ON public.power_score_weight_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.power_score_weight_history TO anon, authenticated;
GRANT ALL ON public.power_score_weight_history TO service_role;

-- Seed the pre-sandbox baseline exactly once. WHERE NOT EXISTS (not ON
-- CONFLICT) so a re-run never adds a second row and never touches weights an
-- admin has changed since.
INSERT INTO public.power_score_weight_history (win_weight, sos_weight, game_weight, note)
SELECT 40, 45, 15, 'baseline: the weights hardcoded before the sandbox existed'
WHERE NOT EXISTS (SELECT 1 FROM public.power_score_weight_history);

-- ---------------------------------------------------------------------------
-- 2. Private regeneration helper. Rebuilds both formula functions for one
--    weight triple. Not exposed over the API (EXECUTE revoked from everyone);
--    only the admin functions below and this migration's DO block call it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.power_score_weights_regenerate(
  p_win numeric,
  p_sos numeric,
  p_game numeric
)
RETURNS void
LANGUAGE plpgsql
SET search_path = 'pg_catalog', 'public'
AS $fn$
BEGIN
  -- Validation repeats the table constraints because the DO block at the end
  -- of this migration calls this directly, without going through the table.
  IF p_win IS NULL OR p_sos IS NULL OR p_game IS NULL
     OR p_win < 0 OR p_sos < 0 OR p_game < 0
     OR p_win + p_sos + p_game <> 100
     OR p_win + p_game <= 0 THEN
    RAISE EXCEPTION 'Invalid power score weights %/%/%', p_win, p_sos, p_game;
  END IF;

  -- Same shape as the 20260818194322 definition, with the literals swapped
  -- for the given triple. format() receives numerics rendered to text — no
  -- free-text parameter ever reaches the generated SQL.
  EXECUTE format($fmt$
    CREATE OR REPLACE FUNCTION public.power_score_100(p_weighted_win_pct numeric, p_sos numeric, p_weighted_game_win_pct numeric)
     RETURNS numeric
     LANGUAGE sql
     IMMUTABLE
     SET search_path TO 'pg_catalog', 'public'
    AS $body$
      SELECT (COALESCE(p_weighted_win_pct, 0)      * %1$s::numeric)
           + (COALESCE(p_weighted_game_win_pct, 0) * %3$s::numeric)
           + (COALESCE(p_sos, 0.5)                 * %2$s::numeric)
    $body$
  $fmt$, p_win::text, p_sos::text, p_game::text);

  -- Career variant: same triple, but the SOS points are multiplied by
  -- min(1, performance / 0.30). The performance denominator is DERIVED
  -- (win_weight + game_weight), so it follows the triple instead of staying
  -- a hardcoded 55.
  EXECUTE format($fmt$
    CREATE OR REPLACE FUNCTION public.power_score_100_career(p_weighted_win_pct numeric, p_sos numeric, p_weighted_game_win_pct numeric)
     RETURNS numeric
     LANGUAGE sql
     IMMUTABLE
     SET search_path TO 'pg_catalog', 'public'
    AS $body$
      SELECT (COALESCE(p_weighted_win_pct, 0)      * %1$s::numeric)
           + (COALESCE(p_weighted_game_win_pct, 0) * %3$s::numeric)
           + (COALESCE(p_sos, 0.5)                 * %2$s::numeric
              * LEAST(1.0, ((COALESCE(p_weighted_win_pct, 0) * %1$s::numeric
                           + COALESCE(p_weighted_game_win_pct, 0) * %3$s::numeric)
                           / %4$s::numeric)
                           / 0.30))
    $body$
  $fmt$, p_win::text, p_sos::text, p_game::text, (p_win + p_game)::text);

  EXECUTE format(
    'COMMENT ON FUNCTION public.power_score_100(numeric, numeric, numeric) IS %L',
    format(
      'Standings / season power score: %s x weighted match win rate + %s x weighted game win rate + %s x SOS. '
      'Weights are admin-configurable (power_score_weight_history via admin_set_power_score_weights()). '
      'No performance floor — see power_score_100_career() for the career variant.',
      p_win, p_game, p_sos));

  EXECUTE format(
    'COMMENT ON FUNCTION public.power_score_100_career(numeric, numeric, numeric) IS %L',
    format(
      'Career power score: same %s/%s/%s weights, but the %s SOS points are multiplied by '
      'min(1, performance / 0.30) so a team that rarely wins cannot bank a hard schedule over many seasons. '
      'Weights are admin-configurable (power_score_weight_history via admin_set_power_score_weights()).',
      p_win, p_sos, p_game, p_sos));
END;
$fn$;

COMMENT ON FUNCTION public.power_score_weights_regenerate(numeric, numeric, numeric) IS
  'Internal helper: regenerates power_score_100() and power_score_100_career() '
  'for one weight triple via CREATE OR REPLACE (OID-preserving, so dependent '
  'views follow automatically). Not callable over the API.';

-- ---------------------------------------------------------------------------
-- 3. Public reader: the current and previous weight rows. The previous row is
--    what admin_revert_power_score_weights() would go back to, so the admin
--    tab can label its Revert button (and hide it when there is nothing to
--    revert). anon gets it too: the public Help page shows the live weights.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_power_score_weights()
RETURNS TABLE(
  id bigint,
  win_weight numeric,
  sos_weight numeric,
  game_weight numeric,
  applied_at timestamptz,
  note text
)
LANGUAGE sql
STABLE
SET search_path = 'pg_catalog', 'public'
AS $fn$
  SELECT h.id, h.win_weight, h.sos_weight, h.game_weight, h.applied_at, h.note
  FROM public.power_score_weight_history h
  ORDER BY h.id DESC
  LIMIT 2
$fn$;

COMMENT ON FUNCTION public.get_power_score_weights() IS
  'The latest two power score weight rows, newest first: [0] is live, [1] is '
  'what admin_revert_power_score_weights() would restore.';

-- ---------------------------------------------------------------------------
-- 4. Apply a new weight triple. Validates with friendly messages, records the
--    change, regenerates the formula functions and re-derives every stored
--    season — archived included, exactly like the unification controls — all
--    in one transaction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_power_score_weights(
  p_win numeric,
  p_sos numeric,
  p_game numeric,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $fn$
DECLARE
  v_current public.power_score_weight_history%ROWTYPE;
  v_status text;
  v_rows bigint;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- One weight change at a time: a concurrent save waits here until the first
  -- one commits, then sees its history row and reasserts instead of racing.
  PERFORM pg_advisory_xact_lock(hashtext('power_score_weights'));

  IF p_win IS NULL OR p_sos IS NULL OR p_game IS NULL THEN
    RAISE EXCEPTION 'All three weights are required';
  END IF;
  IF p_win < 0 OR p_sos < 0 OR p_game < 0 THEN
    RAISE EXCEPTION 'Weights cannot be negative';
  END IF;
  IF p_win + p_sos + p_game <> 100 THEN
    RAISE EXCEPTION 'The three weights must add up to 100 (got %)',
      p_win + p_sos + p_game;
  END IF;
  IF p_win + p_game <= 0 THEN
    RAISE EXCEPTION 'The match and game weights cannot both be zero — the career formula scales schedule credit by their sum';
  END IF;

  SELECT * INTO v_current
  FROM public.power_score_weight_history
  ORDER BY id DESC
  LIMIT 1;

  IF FOUND
     AND v_current.win_weight = p_win
     AND v_current.sos_weight = p_sos
     AND v_current.game_weight = p_game THEN
    -- Same triple as the live row: no history noise, but still regenerate and
    -- recompute below so a drifted database gets pulled back in line.
    v_status := 'reasserted';
  ELSE
    v_status := 'applied';
    INSERT INTO public.power_score_weight_history
      (win_weight, sos_weight, game_weight, applied_by, note)
    VALUES (p_win, p_sos, p_game, auth.uid(), p_note);
  END IF;

  PERFORM public.power_score_weights_regenerate(p_win, p_sos, p_game);
  PERFORM public.upsert_team_season_stats(true);

  SELECT count(*) INTO v_rows FROM public.team_season_stats;

  RETURN jsonb_build_object(
    'status', v_status,
    'win_weight', p_win,
    'sos_weight', p_sos,
    'game_weight', p_game,
    'season_rows', v_rows
  );
END;
$fn$;

COMMENT ON FUNCTION public.admin_set_power_score_weights(numeric, numeric, numeric, text) IS
  'Admin-only. Applies a new power score weight triple (win/SOS/game, must sum '
  'to 100) and re-derives every stored season, archived included, in one '
  'transaction. Returns {status: applied|reasserted, ...}.';

-- ---------------------------------------------------------------------------
-- 5. Revert to the previous triple. Appends a COPY of the second-latest row
--    (append-only audit trail; revert twice toggles A <-> B), regenerates and
--    recomputes the same way as apply. With fewer than two rows there is
--    nothing to go back to — reported as a status, not an exception.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_revert_power_score_weights()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $fn$
DECLARE
  v_previous public.power_score_weight_history%ROWTYPE;
  v_rows bigint;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('power_score_weights'));

  SELECT * INTO v_previous
  FROM public.power_score_weight_history
  ORDER BY id DESC
  OFFSET 1 LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'nothing_to_revert');
  END IF;

  INSERT INTO public.power_score_weight_history
    (win_weight, sos_weight, game_weight, applied_by, note)
  VALUES (
    v_previous.win_weight, v_previous.sos_weight, v_previous.game_weight,
    auth.uid(),
    format('revert to the weights applied %s', v_previous.applied_at::date)
  );

  PERFORM public.power_score_weights_regenerate(
    v_previous.win_weight, v_previous.sos_weight, v_previous.game_weight);
  PERFORM public.upsert_team_season_stats(true);

  SELECT count(*) INTO v_rows FROM public.team_season_stats;

  RETURN jsonb_build_object(
    'status', 'reverted',
    'win_weight', v_previous.win_weight,
    'sos_weight', v_previous.sos_weight,
    'game_weight', v_previous.game_weight,
    'season_rows', v_rows
  );
END;
$fn$;

COMMENT ON FUNCTION public.admin_revert_power_score_weights() IS
  'Admin-only. Restores the previous power score weight triple by appending a '
  'copy of it to the history, then re-derives every stored season. Returns '
  '{status: reverted|nothing_to_revert, ...}.';

-- ---------------------------------------------------------------------------
-- 6. Known-gap fix: admin_recompute_season_power() predates the career split
--    (20260818194322 added team_season_stats.career_power_score) and only
--    refreshed power_score + sos, so a deliberate archived-season repair left
--    the career number stale. Same definition as 20260812171421 with the
--    career column added.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_recompute_season_power(p_season_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_rows integer;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  UPDATE public.team_season_stats tss
  SET power_score        = agg.power_score,
      career_power_score = agg.career_power_score,
      sos                = agg.sos,
      recorded_at        = now()
  FROM public.v_team_season_agg agg
  WHERE agg.season_id = tss.season_id
    AND agg.team_id   = tss.team_id
    AND tss.season_id = p_season_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$fn$;

COMMENT ON FUNCTION public.admin_recompute_season_power(uuid) IS
  'Deliberately recompute one season''s power_score, career_power_score and '
  'sos, bypassing the archived-season freeze in upsert_team_season_stats(). '
  'Admin only.';

-- ---------------------------------------------------------------------------
-- 7. Privileges. Admins authenticate as `authenticated`; the in-function
--    current_user_is_admin() check does the real gating. The regenerate
--    helper is private outright — nothing grants it, so only the definer
--    functions above (and migrations) can reach it.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.power_score_weights_regenerate(numeric, numeric, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_power_score_weights() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_power_score_weights(numeric, numeric, numeric, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_revert_power_score_weights() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_recompute_season_power(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_power_score_weights() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_power_score_weights(numeric, numeric, numeric, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_revert_power_score_weights() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_recompute_season_power(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8. Audit coverage. Weight changes are admin mutations like any other:
--    attach the shared audit trigger and extend the drift guard so the smoke
--    test enforces the coverage from now on. Mirrors 20260701180231 /
--    20260722130000 with power_score_weight_history appended.
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS audit_admin_mutation ON public.power_score_weight_history;
CREATE TRIGGER audit_admin_mutation
  AFTER INSERT OR UPDATE OR DELETE ON public.power_score_weight_history
  FOR EACH ROW EXECUTE FUNCTION public.audit_admin_mutation();

CREATE OR REPLACE FUNCTION public.admin_audit_coverage_drift()
RETURNS TABLE(issue text)
LANGUAGE plpgsql
STABLE
SET search_path TO 'pg_catalog', 'public'
AS $fn$
DECLARE
  t text;
  audited_tables text[] := ARRAY[
    'seasons',
    'divisions',
    'teams',
    'team_timeslots',
    'brackets',
    'admin_notifications',
    'hero_cards',
    'theme_settings',
    'contact_requests',
    'season_team_participation',
    'blind_draw_settings',
    'challonge_fallback_config',
    'challonge_fallback_brackets',
    'support_tickets',
    'power_score_weight_history'
  ];
BEGIN
  IF to_regproc('public.audit_admin_mutation') IS NULL THEN
    issue := 'missing function public.audit_admin_mutation()';
    RETURN NEXT;
  END IF;

  FOREACH t IN ARRAY audited_tables LOOP
    CONTINUE WHEN to_regclass('public.' || t) IS NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger tg
      JOIN pg_class c ON c.oid = tg.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = t
        AND tg.tgname = 'audit_admin_mutation'
        AND NOT tg.tgisinternal
        AND tg.tgfoid = 'public.audit_admin_mutation'::regproc
        AND (tg.tgtype::integer & 1) = 1
        AND (tg.tgtype::integer & 2) = 0
        AND (tg.tgtype::integer & 28) = 28
    ) THEN
      issue := format('missing or misconfigured audit trigger on public.%s', t);
      RETURN NEXT;
    END IF;
  END LOOP;

  RETURN;
END;
$fn$;

-- ---------------------------------------------------------------------------
-- 9. Re-assert the formula from the latest history row and prove it took.
--    Reading the row (instead of hardcoding 40/45/15 here) is what makes this
--    file safe to re-run after an admin has changed weights.
-- ---------------------------------------------------------------------------
DO $do$
DECLARE
  v_weights public.power_score_weight_history%ROWTYPE;
  v_check numeric;
  v_rows bigint;
BEGIN
  SELECT * INTO v_weights
  FROM public.power_score_weight_history
  ORDER BY id DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'power_score_weight_history has no rows — the seed above did not run';
  END IF;

  PERFORM public.power_score_weights_regenerate(
    v_weights.win_weight, v_weights.sos_weight, v_weights.game_weight);

  -- A perfect team scores exactly the sum of the weights, i.e. 100, whatever
  -- the triple. Both variants must agree (performance = 1 clears the floor).
  v_check := public.power_score_100(1, 1, 1);
  IF v_check IS DISTINCT FROM 100::numeric THEN
    RAISE EXCEPTION 'power_score_100(1,1,1) should be 100 after regeneration, got %', v_check;
  END IF;
  v_check := public.power_score_100_career(1, 1, 1);
  IF v_check IS DISTINCT FROM 100::numeric THEN
    RAISE EXCEPTION 'power_score_100_career(1,1,1) should be 100 after regeneration, got %', v_check;
  END IF;

  SELECT count(*) INTO v_rows FROM public.team_season_stats;

  RAISE NOTICE 'power score weight sandbox installed: weights %/%/%, % season rows',
    v_weights.win_weight, v_weights.sos_weight, v_weights.game_weight, v_rows;
END $do$;

-- ---------------------------------------------------------------------------
-- Not done here, on purpose:
--
--   * power_score_snapshots is never rewritten. Those rows record what was
--     true that week, so the homepage Movers section shows a one-time jump
--     after a save or revert and self-corrects at the next weekly snapshot.
--     The sandbox UI and the OPERATIONS.md §6b runbook both say so.
--   * The legacy unification controls (admin_revert_power_score_unification /
--     admin_reapply_power_score_unification, 20260810120000) ignore this
--     table by design: revert restores pre-unification view definitions with
--     their own inline literals, so while reverted, the sandbox weights have
--     no effect — exactly as before this migration.
--   * Pre-existing and NOT fixed here: admin_reapply_power_score_unification
--     recreates v_team_season_agg from its stored 20260809125000 definition,
--     which predates the career_power_score column added by 20260818194322.
--     Running revert-then-reapply would fail at upsert_team_season_stats()
--     (career_power_score missing from the view). That mismatch exists on
--     main today; fixing it means re-embedding the current view definitions
--     in those functions and belongs in its own follow-up PR.
-- ---------------------------------------------------------------------------