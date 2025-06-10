
-- Step 1: Add two new "High" tier divisions with the correct weights
INSERT INTO divisions (name, division_weight, display_division) VALUES
('Intermediate High', 0.85, 'Intermediate'),
('Recreational High', 0.50, 'Recreational');

-- Update existing divisions to set their display_division values
UPDATE divisions 
SET display_division = CASE 
  WHEN LOWER(name) LIKE '%competitive%' THEN 'Competitive'
  WHEN LOWER(name) LIKE '%intermediate%' THEN 'Intermediate' 
  WHEN LOWER(name) LIKE '%recreational%' THEN 'Recreational'
  ELSE 'Recreational' -- fallback for any unmatched divisions
END
WHERE display_division IS NULL;

-- Verify the division setup
SELECT id, name, division_weight, display_division 
FROM divisions 
ORDER BY division_weight DESC;
