-- Add child_count column to match table for brackets-manager integration
ALTER TABLE public.match 
ADD COLUMN child_count INTEGER NOT NULL DEFAULT 0;

-- Add comment explaining the column's purpose
COMMENT ON COLUMN public.match.child_count IS 'Number of child matches that feed into this match (used for bracket structure tracking)';