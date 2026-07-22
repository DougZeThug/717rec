-- PR-13: fix the match -> playoff_matches status mapping.
--
-- brackets-manager match statuses: 0 Locked, 1 Waiting, 2 Ready, 3 Running,
-- 4 Completed, 5 Archived. The sync triggers previously mapped only
-- 4 -> 'completed' and 2 -> 'in_progress', collapsing 3 (Running) and
-- 5 (Archived) into 'pending' — so a live match and an already-superseded
-- match both displayed as not-yet-started. (Status 3 is common in production:
-- the SQL storage adapter re-inflates empty scores as null, which
-- brackets-manager reads as "match started".)
--
-- One shared mapping function, used by both triggers and the backfill:
--   >= 5 -> 'archived'   (done and superseded by downstream rounds)
--   4    -> 'completed'
--   2, 3 -> 'in_progress' (populated/live; 2 kept as-is from prior behavior)
--   else -> 'pending'
-- Note on >= 5: brackets-model defines status 6 (GameCancelled) for match
-- GAMES only; it should never appear on match rows. If one ever does, a
-- cancelled thing is closest to "no longer playable" — archived — rather
-- than pending/live, so the helper clamps defensively instead of matching 5
-- exactly.
--
-- The INSERT trigger previously hardcoded 'pending', which was wrong for
-- matches the library creates already resolved (BYE auto-wins insert at
-- status 4 with a win result) — it now uses the same mapping.

-- Drop the stale 2026-01 insert trigger (sync_match_insert_to_playoff_matches
-- -> sync_match_to_playoff_matches). It was superseded by 20260410145358's
-- trg_sync_match_insert_to_playoff but never dropped; firing alphabetically
-- first, its hardcoded-'pending' insert row always won via the newer
-- trigger's ON CONFLICT DO NOTHING.
DROP TRIGGER IF EXISTS sync_match_insert_to_playoff_matches ON public.match;
DROP FUNCTION IF EXISTS public.sync_match_to_playoff_matches();

CREATE OR REPLACE FUNCTION public.map_bm_status_to_playoff_status(p_status integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_status >= 5 THEN 'archived'
    WHEN p_status = 4 THEN 'completed'
    WHEN p_status IN (2, 3) THEN 'in_progress'
    ELSE 'pending'
  END;
$$;

-- Recreate the INSERT sync function with the shared mapping (body otherwise
-- identical to 20260410145358).
CREATE OR REPLACE FUNCTION public.sync_match_insert_to_playoff_matches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_bracket_id UUID;
  v_round_number INT;
  v_match_number INT;
  v_group_number INT;
  v_team1_id UUID;
  v_team2_id UUID;
  v_match_type public.playoff_match_type;
BEGIN
  -- Get bracket_id from stage
  SELECT s.tournament_id INTO v_bracket_id
  FROM stage s WHERE s.id = NEW.stage_id;

  IF v_bracket_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get round number
  SELECT r.number INTO v_round_number
  FROM round r WHERE r.id = NEW.round_id;

  -- Get group number for match_type mapping
  SELECT g.number INTO v_group_number
  FROM "group" g WHERE g.id = NEW.group_id;

  v_match_number := NEW.number;

  -- Map group number to match_type
  IF v_group_number = 1 THEN v_match_type := 'winners';
  ELSIF v_group_number = 2 THEN v_match_type := 'losers';
  ELSIF v_group_number = 3 THEN v_match_type := 'finals';
  ELSE v_match_type := 'winners';
  END IF;

  -- Look up team UUIDs
  SELECT p.team_id INTO v_team1_id FROM participant p WHERE p.id = NEW.opponent1_id;
  SELECT p.team_id INTO v_team2_id FROM participant p WHERE p.id = NEW.opponent2_id;

  -- Insert shell row into playoff_matches
  INSERT INTO playoff_matches (
    bracket_id, round, position, match_type,
    team1_id, team2_id, match_id, status
  ) VALUES (
    v_bracket_id, v_round_number, v_match_number, v_match_type,
    v_team1_id, v_team2_id, NEW.id,
    public.map_bm_status_to_playoff_status(NEW.status)
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Recreate the UPDATE sync function with the shared mapping (body otherwise
-- identical to 20260410145358).
CREATE OR REPLACE FUNCTION public.sync_match_update_to_playoff_matches()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_team1_id UUID;
  v_team2_id UUID;
  v_winner_id UUID;
  v_loser_id UUID;
  v_status TEXT;
BEGIN
  -- Only sync when relevant fields change
  IF OLD.status = NEW.status
     AND OLD.opponent1_score IS NOT DISTINCT FROM NEW.opponent1_score
     AND OLD.opponent2_score IS NOT DISTINCT FROM NEW.opponent2_score
     AND OLD.opponent1_result IS NOT DISTINCT FROM NEW.opponent1_result
     AND OLD.opponent2_result IS NOT DISTINCT FROM NEW.opponent2_result
     AND OLD.opponent1_id IS NOT DISTINCT FROM NEW.opponent1_id
     AND OLD.opponent2_id IS NOT DISTINCT FROM NEW.opponent2_id
  THEN
    RETURN NEW;
  END IF;

  -- Look up team UUIDs from participant table
  SELECT p.team_id INTO v_team1_id FROM participant p WHERE p.id = NEW.opponent1_id;
  SELECT p.team_id INTO v_team2_id FROM participant p WHERE p.id = NEW.opponent2_id;

  -- Determine winner/loser from results
  v_winner_id := NULL;
  v_loser_id := NULL;
  IF NEW.opponent1_result = 'win' THEN
    v_winner_id := v_team1_id;
    v_loser_id := v_team2_id;
  ELSIF NEW.opponent2_result = 'win' THEN
    v_winner_id := v_team2_id;
    v_loser_id := v_team1_id;
  END IF;

  v_status := public.map_bm_status_to_playoff_status(NEW.status);

  -- Sync to playoff_matches
  UPDATE playoff_matches SET
    team1_id = v_team1_id,
    team2_id = v_team2_id,
    team1_score = NEW.opponent1_score,
    team2_score = NEW.opponent2_score,
    winner_id = v_winner_id,
    loser_id = v_loser_id,
    status = v_status,
    updated_at = NOW()
  WHERE match_id = NEW.id;

  RETURN NEW;
END;
$$;

-- Backfill: re-sync the status of every playoff_matches row that drifted
-- under the old mapping (statuses 3 and 5 were stored as 'pending').
-- Idempotent: only touches rows whose stored status disagrees.
UPDATE public.playoff_matches pm
SET status = public.map_bm_status_to_playoff_status(m.status),
    updated_at = NOW()
FROM public.match m
WHERE pm.match_id = m.id
  AND pm.status IS DISTINCT FROM public.map_bm_status_to_playoff_status(m.status);
