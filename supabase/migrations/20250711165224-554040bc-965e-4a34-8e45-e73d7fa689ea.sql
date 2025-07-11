-- Add spotify_url column to teams table
ALTER TABLE public.teams 
ADD COLUMN spotify_url TEXT;

-- Add comment to document the column purpose
COMMENT ON COLUMN public.teams.spotify_url IS 'Spotify URL for team walk-up song (track, album, playlist, or artist)';

-- Add check constraint to validate Spotify URL format
ALTER TABLE public.teams 
ADD CONSTRAINT check_spotify_url_format 
CHECK (
  spotify_url IS NULL OR 
  spotify_url ~* '^https://open\.spotify\.com/(track|album|playlist|artist)/.+$'
);

-- Add partial index on non-null spotify_url values for performance
CREATE INDEX idx_teams_spotify_url 
ON public.teams (spotify_url) 
WHERE spotify_url IS NOT NULL;