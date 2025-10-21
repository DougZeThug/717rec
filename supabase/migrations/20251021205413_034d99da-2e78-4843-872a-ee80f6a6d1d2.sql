-- Add uses_brackets_manager column to brackets table
ALTER TABLE public.brackets 
ADD COLUMN IF NOT EXISTS uses_brackets_manager BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.brackets.uses_brackets_manager IS 
  'Flag to indicate whether this bracket uses the brackets-manager library (true) or legacy Challonge system (false)';