
-- Add two new divisions: Competitive Low and Intermediate Low
INSERT INTO divisions (name, division_weight, display_division) VALUES
('Competitive Low', 0.925, 'Competitive'),
('Intermediate Low', 0.60, 'Intermediate');

-- Verify the complete division hierarchy
SELECT id, name, division_weight, display_division 
FROM divisions 
ORDER BY division_weight DESC;
