-- ============================================================================
-- LIVE SCORING: round-by-round match scoring, player roster, stats views
-- ============================================================================
-- Adds ScoreMagic-style live scoring on top of the existing matches model:
--   * team_players     — minimal player entity, seeded from teams.players text[]
--   * games (extended) — the dormant per-game table gains status/winner columns
--   * match_rounds     — append-only round log (raw + generated net/winner)
--   * game_players     — per-game player selections (max 2 per team side)
--   * user_can_score_match() — RLS/RPC permission helper
--   * finalize_live_match() / reopen_live_match() — idempotent result RPCs
--     (same guards as approve_match_result / mark_match_as_tie)
--   * realtime publication for games + match_rounds + matches
--   * derived stats views (PPR et al. are computed on read, never stored)
--
-- The whole file is idempotent: safe to re-run.
-- ============================================================================

-- ============================================================
-- 1. team_players — player identity, seeded from teams.players
-- ============================================================
CREATE TABLE IF NOT EXISTS public.team_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (length(trim(display_name)) > 0),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, display_name)
);

CREATE INDEX IF NOT EXISTS idx_team_players_team_id ON public.team_players (team_id);

-- Seed from the legacy roster arrays (trimmed, de-duplicated, non-empty).
INSERT INTO public.team_players (team_id, display_name)
SELECT DISTINCT t.id, trim(p)
FROM public.teams t, unnest(COALESCE(t.players, '{}')) AS p
WHERE length(trim(p)) > 0
ON CONFLICT (team_id, display_name) DO NOTHING;

-- ============================================================
-- 2. games — extend the dormant per-game table
-- ============================================================
-- Clean out unusable legacy rows before adding uniqueness.
DELETE FROM public.games WHERE match_id IS NULL;
DELETE FROM public.games g
USING public.games g2
WHERE g.match_id = g2.match_id
  AND g.game_number = g2.game_number
  AND g.id > g2.id;

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS winner_team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS started_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'games_status_check' AND conrelid = 'public.games'::regclass
  ) THEN
    ALTER TABLE public.games
      ADD CONSTRAINT games_status_check CHECK (status IN ('in_progress', 'completed'));
  END IF;
END $$;

-- NOT VALID: don't fail on unknown legacy rows; new rows are validated.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'games_game_number_check' AND conrelid = 'public.games'::regclass
  ) THEN
    ALTER TABLE public.games
      ADD CONSTRAINT games_game_number_check CHECK (game_number BETWEEN 1 AND 3) NOT VALID;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS games_match_game_number_key
  ON public.games (match_id, game_number);
CREATE INDEX IF NOT EXISTS idx_games_match_id ON public.games (match_id);

-- Legacy rows attached to already-completed matches must not surface as
-- phantom in-progress games.
UPDATE public.games g
SET status = 'completed'
FROM public.matches m
WHERE g.match_id = m.id AND m.iscompleted = true AND g.status = 'in_progress';

-- Reuse the existing shared updated_at trigger function.
DROP TRIGGER IF EXISTS set_games_updated_at ON public.games;
CREATE TRIGGER set_games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. match_rounds — append-only round log
-- ============================================================
-- Raw per-team round scores are the source of truth; cancellation results
-- (net_points, winner_team) are GENERATED so they can never drift. Game
-- totals are always folded from these rows client-side, never cached.
CREATE TABLE IF NOT EXISTS public.match_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  round_number integer NOT NULL CHECK (round_number >= 1),
  -- 0-12 excluding 11: max 4 bags x 3 points, and 11 is unreachable.
  team1_score integer NOT NULL CHECK (team1_score BETWEEN 0 AND 12 AND team1_score <> 11),
  team2_score integer NOT NULL CHECK (team2_score BETWEEN 0 AND 12 AND team2_score <> 11),
  net_points integer GENERATED ALWAYS AS (abs(team1_score - team2_score)) STORED,
  winner_team integer GENERATED ALWAYS AS (
    CASE WHEN team1_score > team2_score THEN 1
         WHEN team2_score > team1_score THEN 2 END
  ) STORED, -- NULL = wash (tied round)
  team1_thrower_id uuid REFERENCES public.team_players(id) ON DELETE SET NULL,
  team2_thrower_id uuid REFERENCES public.team_players(id) ON DELETE SET NULL,
  -- ScoreMagic bag breakdown (in-hole / on-board / off-board), inferred from
  -- the round score with a disambiguation answer for scores 3/4/6.
  team1_bags_in smallint,
  team1_bags_on smallint,
  team1_bags_off smallint,
  team2_bags_in smallint,
  team2_bags_on smallint,
  team2_bags_off smallint,
  entered_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Duplicate-write guard: two scorers racing on the same round collide here.
  UNIQUE (game_id, round_number),
  -- Bag columns are all-null or a consistent breakdown of the round score.
  CONSTRAINT match_rounds_team1_bags_check CHECK (
    (team1_bags_in IS NULL AND team1_bags_on IS NULL AND team1_bags_off IS NULL)
    OR (team1_bags_in BETWEEN 0 AND 4 AND team1_bags_on BETWEEN 0 AND 4
        AND team1_bags_off BETWEEN 0 AND 4
        AND team1_bags_in + team1_bags_on + team1_bags_off = 4
        AND team1_bags_in * 3 + team1_bags_on = team1_score)
  ),
  CONSTRAINT match_rounds_team2_bags_check CHECK (
    (team2_bags_in IS NULL AND team2_bags_on IS NULL AND team2_bags_off IS NULL)
    OR (team2_bags_in BETWEEN 0 AND 4 AND team2_bags_on BETWEEN 0 AND 4
        AND team2_bags_off BETWEEN 0 AND 4
        AND team2_bags_in + team2_bags_on + team2_bags_off = 4
        AND team2_bags_in * 3 + team2_bags_on = team2_score)
  )
);

CREATE INDEX IF NOT EXISTS idx_match_rounds_match_id ON public.match_rounds (match_id);
CREATE INDEX IF NOT EXISTS idx_match_rounds_game_id ON public.match_rounds (game_id);
CREATE INDEX IF NOT EXISTS idx_match_rounds_thrower1 ON public.match_rounds (team1_thrower_id);
CREATE INDEX IF NOT EXISTS idx_match_rounds_thrower2 ON public.match_rounds (team2_thrower_id);

-- ============================================================
-- 4. game_players — per-game player selections
-- ============================================================
CREATE TABLE IF NOT EXISTS public.game_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.team_players(id) ON DELETE CASCADE,
  slot smallint NOT NULL CHECK (slot IN (1, 2)),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, team_id, slot),
  UNIQUE (game_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON public.game_players (game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_player_id ON public.game_players (player_id);

-- ============================================================
-- 5. Permission helper (shared by RLS policies and RPCs)
-- ============================================================
-- Admins can always score; approved members of either team can score while
-- the match is still open (iscompleted = false).
CREATE OR REPLACE FUNCTION public.user_can_score_match(p_match_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
  SELECT public.current_user_is_admin() OR EXISTS (
    SELECT 1
    FROM public.matches m
    JOIN public.team_memberships tm
      ON tm.team_id IN (m.team1_id, m.team2_id)
    WHERE m.id = p_match_id
      AND COALESCE(m.iscompleted, false) = false
      AND tm.user_id = (SELECT auth.uid())
      AND tm.is_approved = true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.user_can_score_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_score_match(uuid) TO authenticated;

-- ============================================================
-- 6. RLS
-- ============================================================
ALTER TABLE public.team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;

-- Public read everywhere: spectators get a live read-only view.
DROP POLICY IF EXISTS "Public read team_players" ON public.team_players;
CREATE POLICY "Public read team_players" ON public.team_players
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read match_rounds" ON public.match_rounds;
CREATE POLICY "Public read match_rounds" ON public.match_rounds
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read game_players" ON public.game_players;
CREATE POLICY "Public read game_players" ON public.game_players
  FOR SELECT USING (true);

-- games previously had no SELECT policy at all (only admin write policies).
DROP POLICY IF EXISTS "Public read games" ON public.games;
CREATE POLICY "Public read games" ON public.games
  FOR SELECT USING (true);

-- games writes: scorer-or-admin replaces the admin-only insert/update.
DROP POLICY IF EXISTS "Admin insert games" ON public.games;
DROP POLICY IF EXISTS "Admin update games" ON public.games;
DROP POLICY IF EXISTS "Scorers insert games" ON public.games;
CREATE POLICY "Scorers insert games" ON public.games
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_score_match(match_id));

DROP POLICY IF EXISTS "Scorers update games" ON public.games;
CREATE POLICY "Scorers update games" ON public.games
  FOR UPDATE TO authenticated
  USING (public.user_can_score_match(match_id))
  WITH CHECK (public.user_can_score_match(match_id));

DROP POLICY IF EXISTS "Admin delete games" ON public.games;
CREATE POLICY "Admin delete games" ON public.games
  FOR DELETE TO authenticated
  USING (public.current_user_is_admin());

-- match_rounds: scorers append rounds as themselves; undo removes only the
-- latest round of a game (admins may remove any round); edits are admin-only.
DROP POLICY IF EXISTS "Scorers insert rounds" ON public.match_rounds;
CREATE POLICY "Scorers insert rounds" ON public.match_rounds
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_can_score_match(match_id)
    AND entered_by_user_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Scorers delete last round" ON public.match_rounds;
CREATE POLICY "Scorers delete last round" ON public.match_rounds
  FOR DELETE TO authenticated
  USING (
    public.current_user_is_admin()
    OR (
      public.user_can_score_match(match_id)
      AND round_number = (
        SELECT max(r.round_number) FROM public.match_rounds r
        WHERE r.game_id = match_rounds.game_id
      )
    )
  );

DROP POLICY IF EXISTS "Admin update rounds" ON public.match_rounds;
CREATE POLICY "Admin update rounds" ON public.match_rounds
  FOR UPDATE TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

-- game_players: scorers manage selections for the parent match.
DROP POLICY IF EXISTS "Scorers insert game_players" ON public.game_players;
CREATE POLICY "Scorers insert game_players" ON public.game_players
  FOR INSERT TO authenticated
  WITH CHECK (public.user_can_score_match(
    (SELECT g.match_id FROM public.games g WHERE g.id = game_id)
  ));

DROP POLICY IF EXISTS "Scorers delete game_players" ON public.game_players;
CREATE POLICY "Scorers delete game_players" ON public.game_players
  FOR DELETE TO authenticated
  USING (public.user_can_score_match(
    (SELECT g.match_id FROM public.games g WHERE g.id = game_players.game_id)
  ));

-- team_players: approved members manage their own team's roster; admins any.
DROP POLICY IF EXISTS "Members insert team_players" ON public.team_players;
CREATE POLICY "Members insert team_players" ON public.team_players
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_is_admin() OR EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.team_id = team_players.team_id
        AND tm.user_id = (SELECT auth.uid())
        AND tm.is_approved = true
    )
  );

DROP POLICY IF EXISTS "Members update team_players" ON public.team_players;
CREATE POLICY "Members update team_players" ON public.team_players
  FOR UPDATE TO authenticated
  USING (
    public.current_user_is_admin() OR EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.team_id = team_players.team_id
        AND tm.user_id = (SELECT auth.uid())
        AND tm.is_approved = true
    )
  )
  WITH CHECK (
    public.current_user_is_admin() OR EXISTS (
      SELECT 1 FROM public.team_memberships tm
      WHERE tm.team_id = team_players.team_id
        AND tm.user_id = (SELECT auth.uid())
        AND tm.is_approved = true
    )
  );

DROP POLICY IF EXISTS "Admin delete team_players" ON public.team_players;
CREATE POLICY "Admin delete team_players" ON public.team_players
  FOR DELETE TO authenticated
  USING (public.current_user_is_admin());

-- ============================================================
-- 7. Result RPCs (idempotent, mirror approve_match_result / mark_match_as_tie)
-- ============================================================
CREATE OR REPLACE FUNCTION public.finalize_live_match(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  v_match record;
  v_t1_wins integer;
  v_t2_wins integer;
  v_winner uuid;
  v_loser uuid;
  v_winner_gw integer;
  v_loser_gw integer;
  v_rows integer;
BEGIN
  -- Admin OR approved member of either team. (Deliberately not the
  -- iscompleted-gated helper: finalizing IS the completion transition.)
  IF NOT (
    public.current_user_is_admin() OR EXISTS (
      SELECT 1
      FROM public.matches m
      JOIN public.team_memberships tm
        ON tm.team_id IN (m.team1_id, m.team2_id)
      WHERE m.id = p_match_id
        AND tm.user_id = (SELECT auth.uid())
        AND tm.is_approved = true
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to finalize this match';
  END IF;

  -- Serialize against every other completion path (manual admin entry,
  -- concurrent finalize calls).
  SELECT id, team1_id, team2_id, winner_id, iscompleted
  INTO v_match
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  IF v_match.id IS NULL THEN
    RAISE EXCEPTION 'Match not found: %', p_match_id;
  END IF;

  IF v_match.team1_id IS NULL OR v_match.team2_id IS NULL THEN
    RAISE EXCEPTION 'Match is missing team assignments';
  END IF;

  -- Idempotency guard: a resulted match is never re-applied.
  IF v_match.winner_id IS NOT NULL OR COALESCE(v_match.iscompleted, false) THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'already_completed');
  END IF;

  -- The live games rows are the source of truth for the series score.
  SELECT
    count(*) FILTER (WHERE winner_team_id = v_match.team1_id),
    count(*) FILTER (WHERE winner_team_id = v_match.team2_id)
  INTO v_t1_wins, v_t2_wins
  FROM public.games
  WHERE match_id = p_match_id AND status = 'completed';

  IF GREATEST(v_t1_wins, v_t2_wins) < 2 THEN
    RAISE EXCEPTION 'Match is not decided yet (game wins: % - %)', v_t1_wins, v_t2_wins;
  END IF;

  IF v_t1_wins > v_t2_wins THEN
    v_winner := v_match.team1_id; v_loser := v_match.team2_id;
    v_winner_gw := v_t1_wins;     v_loser_gw := v_t2_wins;
  ELSE
    v_winner := v_match.team2_id; v_loser := v_match.team1_id;
    v_winner_gw := v_t2_wins;     v_loser_gw := v_t1_wins;
  END IF;

  -- Official record. Regular-season convention: team scores are BINARY
  -- win/loss flags; the series tally lives in *_game_wins.
  UPDATE public.matches
  SET team1_score = CASE WHEN v_winner = team1_id THEN 1 ELSE 0 END,
      team2_score = CASE WHEN v_winner = team2_id THEN 1 ELSE 0 END,
      team1_game_wins = v_t1_wins,
      team2_game_wins = v_t2_wins,
      winner_id = v_winner,
      loser_id = v_loser,
      iscompleted = true
  WHERE id = p_match_id AND winner_id IS NULL;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'already_completed');
  END IF;

  -- Team record increments (inline, same logic as approve_match_result).
  UPDATE public.teams
  SET wins = COALESCE(wins, 0) + 1,
      game_wins = COALESCE(game_wins, 0) + v_winner_gw,
      game_losses = COALESCE(game_losses, 0) + v_loser_gw
  WHERE id = v_winner;

  UPDATE public.teams
  SET losses = COALESCE(losses, 0) + 1,
      game_wins = COALESCE(game_wins, 0) + v_loser_gw,
      game_losses = COALESCE(game_losses, 0) + v_winner_gw
  WHERE id = v_loser;

  PERFORM public.upsert_team_season_stats();

  RETURN jsonb_build_object(
    'applied', true,
    'winner_id', v_winner,
    'team1_game_wins', v_t1_wins,
    'team2_game_wins', v_t2_wins
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reopen_live_match(p_match_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'pg_catalog', 'public'
AS $$
DECLARE
  v_winner_id uuid;
  v_loser_id uuid;
  v_team1_id uuid;
  v_t1_gw integer;
  v_t2_gw integer;
  v_winner_gw integer;
  v_loser_gw integer;
BEGIN
  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT winner_id, loser_id, team1_id,
         COALESCE(team1_game_wins, 0), COALESCE(team2_game_wins, 0)
  INTO v_winner_id, v_loser_id, v_team1_id, v_t1_gw, v_t2_gw
  FROM public.matches
  WHERE id = p_match_id
  FOR UPDATE;

  -- Idempotent: never resulted (or already reopened) -> nothing to reverse.
  IF v_winner_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_winner_id = v_team1_id THEN
    v_winner_gw := v_t1_gw; v_loser_gw := v_t2_gw;
  ELSE
    v_winner_gw := v_t2_gw; v_loser_gw := v_t1_gw;
  END IF;

  -- Reverse team records (inline, same logic as mark_match_as_tie).
  UPDATE public.teams
  SET wins = GREATEST(0, COALESCE(wins, 0) - 1),
      game_wins = GREATEST(0, COALESCE(game_wins, 0) - v_winner_gw),
      game_losses = GREATEST(0, COALESCE(game_losses, 0) - v_loser_gw)
  WHERE id = v_winner_id;

  UPDATE public.teams
  SET losses = GREATEST(0, COALESCE(losses, 0) - 1),
      game_wins = GREATEST(0, COALESCE(game_wins, 0) - v_loser_gw),
      game_losses = GREATEST(0, COALESCE(game_losses, 0) - v_winner_gw)
  WHERE id = v_loser_id;

  -- Back to open: games/rounds rows are kept so the admin can correct
  -- rounds and re-finalize. v_team_season_agg only counts completed matches,
  -- so standings drop this match immediately.
  UPDATE public.matches
  SET winner_id = NULL,
      loser_id = NULL,
      iscompleted = false,
      team1_score = 0,
      team2_score = 0
  WHERE id = p_match_id;

  PERFORM public.upsert_team_season_stats();

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.finalize_live_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_live_match(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.reopen_live_match(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reopen_live_match(uuid) TO authenticated;

-- ============================================================
-- 8. Realtime publication (idempotent)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'games'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.games;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'match_rounds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_rounds;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  END IF;
END $$;

-- ============================================================
-- 9. Derived stats views (ratios like PPR computed on read, never stored)
-- ============================================================
CREATE OR REPLACE VIEW public.v_player_match_stats
WITH (security_invoker = on) AS
WITH sides AS (
  SELECT mr.match_id,
         mr.team1_thrower_id AS player_id,
         mr.team1_score AS points_for,
         mr.team2_score AS points_against,
         CASE WHEN mr.winner_team = 1 THEN mr.net_points ELSE 0 END AS net_won,
         CASE WHEN mr.winner_team = 1 THEN 1 ELSE 0 END AS rounds_won,
         mr.team1_bags_in AS bags_in,
         mr.team1_bags_on AS bags_on,
         mr.team1_bags_off AS bags_off,
         CASE WHEN mr.team1_bags_in = 4 THEN 1 ELSE 0 END AS four_baggers
  FROM public.match_rounds mr
  WHERE mr.team1_thrower_id IS NOT NULL
  UNION ALL
  SELECT mr.match_id,
         mr.team2_thrower_id,
         mr.team2_score,
         mr.team1_score,
         CASE WHEN mr.winner_team = 2 THEN mr.net_points ELSE 0 END,
         CASE WHEN mr.winner_team = 2 THEN 1 ELSE 0 END,
         mr.team2_bags_in,
         mr.team2_bags_on,
         mr.team2_bags_off,
         CASE WHEN mr.team2_bags_in = 4 THEN 1 ELSE 0 END
  FROM public.match_rounds mr
  WHERE mr.team2_thrower_id IS NOT NULL
)
SELECT s.match_id,
       s.player_id,
       tp.team_id,
       tp.display_name,
       m.season_id,
       count(*)::integer AS rounds_thrown,
       sum(s.rounds_won)::integer AS rounds_won,
       sum(s.points_for)::integer AS points_for,
       sum(s.points_against)::integer AS points_against,
       sum(s.net_won)::integer AS net_points_won,
       sum(s.bags_in)::integer AS bags_in,
       sum(s.bags_on)::integer AS bags_on,
       sum(s.bags_off)::integer AS bags_off,
       sum(s.four_baggers)::integer AS four_baggers
FROM sides s
JOIN public.team_players tp ON tp.id = s.player_id
JOIN public.matches m ON m.id = s.match_id
GROUP BY s.match_id, s.player_id, tp.team_id, tp.display_name, m.season_id;

CREATE OR REPLACE VIEW public.v_player_season_stats
WITH (security_invoker = on) AS
WITH round_stats AS (
  SELECT season_id,
         player_id,
         team_id,
         display_name,
         count(DISTINCT match_id)::integer AS matches_with_rounds,
         sum(rounds_thrown)::integer AS rounds_thrown,
         sum(rounds_won)::integer AS rounds_won,
         sum(points_for)::integer AS points_for,
         sum(points_against)::integer AS points_against,
         sum(net_points_won)::integer AS net_points_won,
         sum(bags_in)::integer AS bags_in,
         sum(bags_on)::integer AS bags_on,
         sum(bags_off)::integer AS bags_off,
         sum(four_baggers)::integer AS four_baggers
  FROM public.v_player_match_stats
  GROUP BY season_id, player_id, team_id, display_name
),
game_results AS (
  SELECT m.season_id,
         gp.player_id,
         count(*) FILTER (WHERE g.winner_team_id = gp.team_id)::integer AS game_wins,
         count(*) FILTER (
           WHERE g.winner_team_id IS NOT NULL AND g.winner_team_id <> gp.team_id
         )::integer AS game_losses
  FROM public.game_players gp
  JOIN public.games g ON g.id = gp.game_id AND g.status = 'completed'
  JOIN public.matches m ON m.id = g.match_id
  GROUP BY m.season_id, gp.player_id
),
match_results AS (
  SELECT m.season_id,
         gp.player_id,
         count(DISTINCT m.id) FILTER (WHERE m.winner_id = gp.team_id)::integer AS match_wins,
         count(DISTINCT m.id) FILTER (
           WHERE m.winner_id IS NOT NULL AND m.winner_id <> gp.team_id
         )::integer AS match_losses
  FROM public.game_players gp
  JOIN public.games g ON g.id = gp.game_id
  JOIN public.matches m ON m.id = g.match_id AND m.iscompleted = true
  GROUP BY m.season_id, gp.player_id
)
SELECT rs.season_id,
       rs.player_id,
       rs.team_id,
       rs.display_name,
       rs.matches_with_rounds,
       rs.rounds_thrown,
       rs.rounds_won,
       rs.points_for,
       rs.points_against,
       rs.net_points_won,
       rs.bags_in,
       rs.bags_on,
       rs.bags_off,
       rs.four_baggers,
       COALESCE(gr.game_wins, 0) AS game_wins,
       COALESCE(gr.game_losses, 0) AS game_losses,
       COALESCE(mres.match_wins, 0) AS match_wins,
       COALESCE(mres.match_losses, 0) AS match_losses
FROM round_stats rs
LEFT JOIN game_results gr
  ON gr.player_id = rs.player_id
 AND (gr.season_id = rs.season_id OR (gr.season_id IS NULL AND rs.season_id IS NULL))
LEFT JOIN match_results mres
  ON mres.player_id = rs.player_id
 AND (mres.season_id = rs.season_id OR (mres.season_id IS NULL AND rs.season_id IS NULL));

CREATE OR REPLACE VIEW public.v_team_round_stats
WITH (security_invoker = on) AS
WITH sides AS (
  SELECT m.season_id,
         m.team1_id AS team_id,
         mr.team1_score AS points_for,
         mr.team2_score AS points_against,
         CASE WHEN mr.winner_team = 1 THEN mr.net_points ELSE 0 END AS net_won
  FROM public.match_rounds mr
  JOIN public.matches m ON m.id = mr.match_id
  UNION ALL
  SELECT m.season_id,
         m.team2_id,
         mr.team2_score,
         mr.team1_score,
         CASE WHEN mr.winner_team = 2 THEN mr.net_points ELSE 0 END
  FROM public.match_rounds mr
  JOIN public.matches m ON m.id = mr.match_id
)
SELECT season_id,
       team_id,
       count(*)::integer AS rounds_played,
       sum(points_for)::integer AS points_for,
       sum(points_against)::integer AS points_against,
       sum(net_won)::integer AS net_points_won
FROM sides
WHERE team_id IS NOT NULL
GROUP BY season_id, team_id;
