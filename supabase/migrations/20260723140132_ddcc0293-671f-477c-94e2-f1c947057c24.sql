-- Drop stale 2026-01 insert trigger superseded by 20260410145358
DROP TRIGGER IF EXISTS sync_match_insert_to_playoff_matches ON public.match;
DROP FUNCTION IF EXISTS public.sync_match_to_playoff_matches();

CREATE OR REPLACE FUNCTION public.map_bm_status_to_playoff_status(p_status integer)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = 'pg_catalog', 'public'
AS $$
  SELECT CASE
    WHEN p_status >= 5 THEN 'archived'
    WHEN p_status = 4 THEN 'completed'
    WHEN p_status IN (2, 3) THEN 'in_progress'
    ELSE 'pending'
  END;
$$;

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
  SELECT s.tournament_id INTO v_bracket_id
  FROM stage s WHERE s.id = NEW.stage_id;

  IF v_bracket_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT r.number INTO v_round_number
  FROM round r WHERE r.id = NEW.round_id;

  SELECT g.number INTO v_group_number
  FROM "group" g WHERE g.id = NEW.group_id;

  v_match_number := NEW.number;

  IF v_group_number = 1 THEN v_match_type := 'winners';
  ELSIF v_group_number = 2 THEN v_match_type := 'losers';
  ELSIF v_group_number = 3 THEN v_match_type := 'finals';
  ELSE v_match_type := 'winners';
  END IF;

  SELECT p.team_id INTO v_team1_id FROM participant p WHERE p.id = NEW.opponent1_id;
  SELECT p.team_id INTO v_team2_id FROM participant p WHERE p.id = NEW.opponent2_id;

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

  SELECT p.team_id INTO v_team1_id FROM participant p WHERE p.id = NEW.opponent1_id;
  SELECT p.team_id INTO v_team2_id FROM participant p WHERE p.id = NEW.opponent2_id;

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

-- Backfill drifted statuses
UPDATE public.playoff_matches pm
SET status = public.map_bm_status_to_playoff_status(m.status),
    updated_at = NOW()
FROM public.match m
WHERE pm.match_id = m.id
  AND pm.status IS DISTINCT FROM public.map_bm_status_to_playoff_status(m.status);

-- Persist brackets-manager opponent slot positions
ALTER TABLE public.match
  ADD COLUMN IF NOT EXISTS opponent1_position integer,
  ADD COLUMN IF NOT EXISTS opponent2_position integer;