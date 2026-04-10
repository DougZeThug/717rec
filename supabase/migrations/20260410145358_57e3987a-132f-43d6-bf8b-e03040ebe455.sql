
-- Step 1: Add match_id column to playoff_matches
ALTER TABLE public.playoff_matches
  ADD COLUMN IF NOT EXISTS match_id integer UNIQUE;

-- Step 2: Backfill participant.team_id where NULL by matching name to teams.name
UPDATE public.participant p
SET team_id = t.id
FROM public.teams t
WHERE p.team_id IS NULL
  AND p.name IS NOT NULL
  AND lower(trim(p.name)) = lower(trim(t.name));

-- Step 3: Backfill match_id on existing playoff_matches rows
-- Join through match -> round -> group -> stage to get bracket_id and round/position info
UPDATE public.playoff_matches pm
SET match_id = m.id
FROM public.match m
JOIN public.round r ON r.id = m.round_id
JOIN public."group" g ON g.id = m.group_id
JOIN public.stage s ON s.id = m.stage_id
WHERE pm.match_id IS NULL
  AND pm.bracket_id = s.tournament_id
  AND pm.round = r.number
  AND pm.position = m.number
  AND (
    (g.number = 1 AND pm.match_type = 'winners')
    OR (g.number = 2 AND pm.match_type = 'losers')
    OR (g.number = 3 AND pm.match_type = 'finals')
  );

-- Step 4: Create INSERT trigger function
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
    v_team1_id, v_team2_id, NEW.id, 'pending'
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Step 5: Create UPDATE trigger function
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

  -- Map numeric status to text (4 = completed in brackets-manager)
  IF NEW.status = 4 THEN
    v_status := 'completed';
  ELSIF NEW.status = 2 THEN
    v_status := 'in_progress';
  ELSE
    v_status := 'pending';
  END IF;

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

-- Step 6: Attach triggers to match table
DROP TRIGGER IF EXISTS trg_sync_match_insert_to_playoff ON public.match;
CREATE TRIGGER trg_sync_match_insert_to_playoff
  AFTER INSERT ON public.match
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_match_insert_to_playoff_matches();

DROP TRIGGER IF EXISTS trg_sync_match_update_to_playoff ON public.match;
CREATE TRIGGER trg_sync_match_update_to_playoff
  AFTER UPDATE ON public.match
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_match_update_to_playoff_matches();

-- Step 7: Backfill scores for completed matches that have match_id linked but no winner in playoff_matches
UPDATE public.playoff_matches pm
SET
  team1_id = COALESCE(pm.team1_id, (SELECT p.team_id FROM participant p WHERE p.id = m.opponent1_id)),
  team2_id = COALESCE(pm.team2_id, (SELECT p.team_id FROM participant p WHERE p.id = m.opponent2_id)),
  team1_score = m.opponent1_score,
  team2_score = m.opponent2_score,
  winner_id = CASE
    WHEN m.opponent1_result = 'win' THEN (SELECT p.team_id FROM participant p WHERE p.id = m.opponent1_id)
    WHEN m.opponent2_result = 'win' THEN (SELECT p.team_id FROM participant p WHERE p.id = m.opponent2_id)
    ELSE NULL
  END,
  loser_id = CASE
    WHEN m.opponent1_result = 'win' THEN (SELECT p.team_id FROM participant p WHERE p.id = m.opponent2_id)
    WHEN m.opponent2_result = 'win' THEN (SELECT p.team_id FROM participant p WHERE p.id = m.opponent1_id)
    ELSE NULL
  END,
  status = CASE m.status WHEN 4 THEN 'completed' WHEN 2 THEN 'in_progress' ELSE 'pending' END,
  updated_at = NOW()
FROM public.match m
WHERE pm.match_id = m.id
  AND pm.winner_id IS NULL
  AND m.status = 4
  AND (m.opponent1_result = 'win' OR m.opponent2_result = 'win');
