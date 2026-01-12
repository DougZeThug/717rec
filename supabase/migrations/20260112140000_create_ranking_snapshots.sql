-- Create ranking_snapshots table to store previous team rankings per season
-- This replaces localStorage for rank change tracking
CREATE TABLE public.ranking_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
  season_id uuid REFERENCES public.seasons(id) ON DELETE CASCADE NOT NULL,
  rank_position integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Ensure only one ranking per team per season
  CONSTRAINT unique_team_season_ranking UNIQUE (team_id, season_id)
);

-- Enable RLS
ALTER TABLE public.ranking_snapshots ENABLE ROW LEVEL SECURITY;

-- Public read policy (anyone can view rankings)
CREATE POLICY "Anyone can view ranking snapshots"
  ON public.ranking_snapshots FOR SELECT
  USING (true);

-- Only authenticated users can insert/update (will be done through service functions)
CREATE POLICY "Authenticated users can manage rankings"
  ON public.ranking_snapshots FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for common queries
CREATE INDEX idx_ranking_snapshots_team_id ON public.ranking_snapshots(team_id);
CREATE INDEX idx_ranking_snapshots_season_id ON public.ranking_snapshots(season_id);
CREATE INDEX idx_ranking_snapshots_team_season ON public.ranking_snapshots(team_id, season_id);

-- Create trigger for updated_at
CREATE TRIGGER update_ranking_snapshots_updated_at
  BEFORE UPDATE ON public.ranking_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add helpful comment
COMMENT ON TABLE public.ranking_snapshots IS 'Stores previous ranking positions for teams in each season to calculate rank changes. Replaces localStorage-based tracking.';
