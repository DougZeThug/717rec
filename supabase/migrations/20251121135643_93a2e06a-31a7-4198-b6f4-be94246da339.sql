-- Assign Fall 2025 season_id to all matches with NULL season_id
UPDATE matches 
SET season_id = '34cd19e2-abf5-43b8-a16f-6d73a0e998ac'
WHERE season_id IS NULL;