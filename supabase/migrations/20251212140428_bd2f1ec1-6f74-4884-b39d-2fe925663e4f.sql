-- Update blind draw card metadata to add Week 2 results
UPDATE public.hero_cards 
SET metadata = jsonb_set(
  COALESCE(metadata::jsonb, '{}'::jsonb),
  '{past_winners}',
  '[
    {"week": 1, "winners": [{"place": 1, "names": "Shan & Earl"}, {"place": 2, "names": "Kaitlyn & Scotty"}, {"place": 3, "names": "Katie & Steve"}]},
    {"week": 2, "winners": [{"place": 1, "names": "Tre & Lucas"}, {"place": 2, "names": "Steve & Snyder"}, {"place": 3, "names": "Doug & Shan"}]}
  ]'::jsonb
)
WHERE slug = 'blind-draw';