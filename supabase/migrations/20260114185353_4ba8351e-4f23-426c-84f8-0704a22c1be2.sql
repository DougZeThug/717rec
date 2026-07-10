-- Add is_double_header column to team_timeslots table.
-- IF NOT EXISTS: 20260114120000_add_is_double_header.sql already adds this
-- column, so a plain ADD COLUMN can never replay on a fresh database.
ALTER TABLE public.team_timeslots
ADD COLUMN IF NOT EXISTS is_double_header BOOLEAN DEFAULT FALSE;