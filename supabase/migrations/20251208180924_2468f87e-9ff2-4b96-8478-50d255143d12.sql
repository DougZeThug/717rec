-- Create power_score_snapshots table for weekly tracking
CREATE TABLE public.power_score_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  snapshot_date DATE NOT NULL,
  power_score NUMERIC,
  sos NUMERIC,
  match_wins INTEGER DEFAULT 0,
  match_losses INTEGER DEFAULT 0,
  game_wins INTEGER DEFAULT 0,
  game_losses INTEGER DEFAULT 0,
  division_id UUID REFERENCES divisions(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(team_id, season_id, week_number)
);

-- Indexes for fast lookups
CREATE INDEX idx_snapshots_season_week ON power_score_snapshots(season_id, week_number);
CREATE INDEX idx_snapshots_team_season ON power_score_snapshots(team_id, season_id);

-- Enable RLS
ALTER TABLE public.power_score_snapshots ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can view snapshots"
  ON public.power_score_snapshots FOR SELECT
  USING (true);

-- Admin write access
CREATE POLICY "Admins can manage snapshots"
  ON public.power_score_snapshots FOR ALL
  USING (current_user_is_admin())
  WITH CHECK (current_user_is_admin());

-- Helper function to calculate week number within a season
CREATE OR REPLACE FUNCTION public.get_season_week_number(p_season_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  season_start DATE;
BEGIN
  SELECT start_date INTO season_start FROM seasons WHERE id = p_season_id;
  IF season_start IS NULL THEN RETURN 0; END IF;
  RETURN FLOOR((p_date - season_start) / 7) + 1;
END;
$$;