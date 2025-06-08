
-- Simple migration to add hidden column if it doesn't exist
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false;
