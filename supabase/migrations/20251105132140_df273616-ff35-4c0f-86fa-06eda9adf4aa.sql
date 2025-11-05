-- Create second hidden division with shared display name "Hidden"
INSERT INTO public.divisions (name, display_division, division_weight)
VALUES ('Hidden2', 'Hidden', 0.75)
ON CONFLICT DO NOTHING;