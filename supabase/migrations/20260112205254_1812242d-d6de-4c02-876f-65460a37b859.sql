-- Create ranking_snapshots table for persisting team rankings per season
CREATE TABLE public.ranking_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  rank_position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, season_id)
);

-- Enable Row Level Security
ALTER TABLE public.ranking_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access (rankings are public data)
CREATE POLICY "Rankings are viewable by everyone" 
ON public.ranking_snapshots 
FOR SELECT 
USING (true);

-- Create policy for admin write access
CREATE POLICY "Admins can insert rankings" 
ON public.ranking_snapshots 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can update rankings" 
ON public.ranking_snapshots 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

CREATE POLICY "Admins can delete rankings" 
ON public.ranking_snapshots 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.is_admin = true
  )
);

-- Create index for faster lookups
CREATE INDEX idx_ranking_snapshots_season ON public.ranking_snapshots(season_id);
CREATE INDEX idx_ranking_snapshots_team ON public.ranking_snapshots(team_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_ranking_snapshots_updated_at
BEFORE UPDATE ON public.ranking_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();