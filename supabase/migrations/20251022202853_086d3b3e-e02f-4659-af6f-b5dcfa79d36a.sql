-- Add missing stage_id column to round table for brackets-manager integration
ALTER TABLE public.round 
ADD COLUMN stage_id INTEGER NOT NULL REFERENCES public.stage(id) ON DELETE CASCADE;

-- Add index for query performance
CREATE INDEX IF NOT EXISTS idx_round_stage_id ON public.round(stage_id);