-- Add position column to participant table for seed/bracket position
ALTER TABLE public.participant 
ADD COLUMN position INTEGER;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_participant_position 
ON public.participant(position);

-- Add comment for documentation
COMMENT ON COLUMN public.participant.position IS 'Seed/bracket position for the participant (1 for top seed, etc.)';