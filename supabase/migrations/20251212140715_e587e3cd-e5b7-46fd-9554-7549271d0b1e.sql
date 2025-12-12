-- Update blind draw card to December 18th event date
UPDATE public.hero_cards 
SET 
  subtitle = 'Thursday, December 18th',
  metadata = jsonb_set(
    jsonb_set(
      metadata::jsonb,
      '{check_in_time}',
      '"2025-12-18T23:30:00Z"'::jsonb
    ),
    '{start_time}',
    '"2025-12-19T00:00:00Z"'::jsonb
  )
WHERE slug = 'blind-draw';