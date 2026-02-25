ALTER TABLE hero_cards DROP CONSTRAINT hero_cards_card_type_check;
ALTER TABLE hero_cards ADD CONSTRAINT hero_cards_card_type_check 
  CHECK (card_type = ANY (ARRAY[
    'standard', 'champions', 'event', 'announcement', 
    'participation', 'request', 'flyer'
  ]));