-- Ensure at most one participant row per (tournament_id, team_id).
-- Partial index so legacy rows with NULL team_id are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS participant_tournament_team_unique_idx
  ON public.participant (tournament_id, team_id)
  WHERE team_id IS NOT NULL;