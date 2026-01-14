-- Add is_double_header column to team_timeslots table
ALTER TABLE public.team_timeslots
ADD COLUMN is_double_header BOOLEAN DEFAULT FALSE;