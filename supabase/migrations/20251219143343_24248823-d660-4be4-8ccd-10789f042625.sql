UPDATE hero_cards 
SET metadata = jsonb_set(
  metadata::jsonb,
  '{past_winners}',
  metadata::jsonb->'past_winners' || '[{"week": 3, "winners": [{"names": "Shan & Derek", "place": 1}, {"names": "Earl & Sam", "place": 2}, {"names": "Dave & Marty", "place": 3}]}]'::jsonb
),
updated_at = now()
WHERE id = '5fef784d-035d-4cd2-977f-96de2a5ba6d2';