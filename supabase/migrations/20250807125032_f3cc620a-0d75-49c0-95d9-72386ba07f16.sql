-- Create a hidden division for teams that should not appear in the frontend
INSERT INTO divisions (name, display_division, division_weight, created_at)
VALUES ('Hidden', 'Hidden', -1.0, now())
ON CONFLICT (name) DO NOTHING;