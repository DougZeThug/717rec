UPDATE hero_cards 
SET metadata = jsonb_set(
  metadata, 
  '{past_winners,0,winners,1,names}', 
  '"Kaitlin & Scotty"'
)
WHERE slug = 'blind-draw';