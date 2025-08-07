-- Create a hidden division for teams that should not appear in the frontend
INSERT INTO divisions (name, display_division, division_weight, created_at)
SELECT 'Hidden', 'Hidden', -1.0, now()
WHERE NOT EXISTS (SELECT 1 FROM divisions WHERE name = 'Hidden');