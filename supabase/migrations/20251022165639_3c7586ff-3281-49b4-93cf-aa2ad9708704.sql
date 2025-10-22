-- Add unique constraint to prevent duplicate matches in the same bracket/type/round/position
-- This will prevent duplicate match insertions even if the code has bugs

-- First, clean up any existing duplicates (if they exist)
-- Keep only one record per unique combination based on created_at (earliest)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY bracket_id, match_type, round, position 
      ORDER BY created_at ASC
    ) as rn
  FROM playoff_matches
)
DELETE FROM playoff_matches
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Add the unique constraint
ALTER TABLE playoff_matches 
ADD CONSTRAINT unique_bracket_match_position 
UNIQUE (bracket_id, match_type, round, position);