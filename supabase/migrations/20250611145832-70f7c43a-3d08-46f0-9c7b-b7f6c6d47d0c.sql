
-- Create enum for badge types
CREATE TYPE badge_type AS ENUM (
  'recreational_champion',
  'intermediate_champion', 
  'competitive_champion',
  'recreational_runner_up',
  'intermediate_runner_up',
  'competitive_runner_up',
  'recreational_third_place',
  'intermediate_third_place',
  'competitive_third_place',
  'king_slayer',
  'clutch_performer',
  'consistent_performer',
  'hot_streak',
  'cold_streak'
);

-- Create team_badge_events table
CREATE TABLE public.team_badge_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  badge_type badge_type NOT NULL,
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  awarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique season badges per team per season
  UNIQUE(team_id, badge_type, season_id)
);

-- Add Row Level Security
ALTER TABLE team_badge_events ENABLE ROW LEVEL SECURITY;

-- Policy for viewing badges (public read)
CREATE POLICY "All users can view team badges"
  ON team_badge_events
  FOR SELECT
  USING (true);

-- Policy for admins to manage badges
CREATE POLICY "Admins can manage team badges"
  ON team_badge_events
  USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()))
  WITH CHECK ((SELECT is_admin FROM profiles WHERE id = auth.uid()));

-- Create index for efficient queries
CREATE INDEX idx_team_badge_events_team_id ON team_badge_events(team_id);
CREATE INDEX idx_team_badge_events_season_id ON team_badge_events(season_id);
CREATE INDEX idx_team_badge_events_badge_type ON team_badge_events(badge_type);

-- Backfill historical championship badges from team_season_stats
INSERT INTO team_badge_events (team_id, badge_type, season_id, awarded_at, metadata)
SELECT 
  tss.team_id,
  CASE 
    WHEN tss.champion = true AND tss.division_name ILIKE '%recreational%' THEN 'recreational_champion'::badge_type
    WHEN tss.champion = true AND tss.division_name ILIKE '%intermediate%' THEN 'intermediate_champion'::badge_type
    WHEN tss.champion = true AND tss.division_name ILIKE '%competitive%' THEN 'competitive_champion'::badge_type
    WHEN tss.runner_up = true AND tss.division_name ILIKE '%recreational%' THEN 'recreational_runner_up'::badge_type
    WHEN tss.runner_up = true AND tss.division_name ILIKE '%intermediate%' THEN 'intermediate_runner_up'::badge_type
    WHEN tss.runner_up = true AND tss.division_name ILIKE '%competitive%' THEN 'competitive_runner_up'::badge_type
  END as badge_type,
  tss.season_id,
  tss.recorded_at,
  jsonb_build_object(
    'division', tss.division_name,
    'power_score', tss.power_score,
    'playoff_rank', tss.playoff_rank
  )
FROM team_season_stats tss
WHERE (tss.champion = true OR tss.runner_up = true)
  AND tss.division_name IS NOT NULL
ON CONFLICT (team_id, badge_type, season_id) DO NOTHING;
