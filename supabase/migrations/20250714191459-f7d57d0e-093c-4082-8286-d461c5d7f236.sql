-- Phase 1: Add Common Ninja support columns and mark Challonge as deprecated
-- This migration adds Common Ninja integration fields while preserving existing Challonge data

-- Add cn_bracket_id to brackets table (nullable text for Common Ninja bracket IDs)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'brackets' 
    AND column_name = 'cn_bracket_id'
  ) THEN
    ALTER TABLE public.brackets ADD COLUMN cn_bracket_id text;
  END IF;
END $$;

-- Add cn_participant_id to participants table (nullable text for Common Ninja participant IDs)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'participants' 
    AND column_name = 'cn_participant_id'
  ) THEN
    ALTER TABLE public.participants ADD COLUMN cn_participant_id text;
  END IF;
END $$;

-- Add comments to mark Challonge fields as deprecated
COMMENT ON COLUMN public.brackets.challonge_tournament_id IS 'DEPRECATED: Use cn_bracket_id for new Common Ninja integration';
COMMENT ON COLUMN public.participants.tournament_id IS 'DEPRECATED: Legacy Challonge tournament reference';

-- Add comments for new Common Ninja fields
COMMENT ON COLUMN public.brackets.cn_bracket_id IS 'Common Ninja bracket identifier for new tournament system';
COMMENT ON COLUMN public.participants.cn_participant_id IS 'Common Ninja participant identifier for new tournament system';