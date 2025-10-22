-- Allow null names in participant table to support BYEs
ALTER TABLE participant 
ALTER COLUMN name DROP NOT NULL;

-- Add comment explaining the purpose
COMMENT ON COLUMN participant.name IS 'Team name. NULL represents a BYE (automatic advancement for opponent in brackets-manager).';