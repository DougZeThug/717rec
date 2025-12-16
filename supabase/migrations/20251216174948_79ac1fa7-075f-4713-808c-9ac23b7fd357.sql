-- Update match with missing season_id to use active season
UPDATE matches 
SET season_id = '4b90a1d8-b90a-4e47-8e8c-b89a7b54e106' 
WHERE id = '386d516f-3200-4fe2-b757-001b1765f2fe' 
  AND season_id IS NULL;