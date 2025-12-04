-- Step 1: Deactivate ALL existing badges
UPDATE team_badge_events SET is_active = false WHERE is_active = true;

-- Step 2: Insert Fall 2025 Championship Badges

-- Competitive Champion: Offdogs
INSERT INTO team_badge_events (team_id, badge_type, season_id, metadata, is_active)
VALUES ('77110b92-d2d8-495b-afed-cac65deb6253', 'competitive_champion', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac', '{}', true);

-- Intermediate 1 Champion: Wrong Hole (Intermediate High)
INSERT INTO team_badge_events (team_id, badge_type, season_id, metadata, is_active)
VALUES ('0c7261b9-db22-48d1-8487-ba9eeb90fbef', 'intermediate_champion', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac', '{"division_variant": "high"}', true);

-- Intermediate 2 Champion: Buttery Nips (Intermediate Low)
INSERT INTO team_badge_events (team_id, badge_type, season_id, metadata, is_active)
VALUES ('01ec006b-6ee3-47b3-ac8d-f93cc11d3460', 'intermediate_champion', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac', '{"division_variant": "low"}', true);

-- Recreational Champion: The Cornholy Trinity
INSERT INTO team_badge_events (team_id, badge_type, season_id, metadata, is_active)
VALUES ('34b1dacf-0c30-4a4c-8228-432701868f34', 'recreational_champion', '34cd19e2-abf5-43b8-a16f-6d73a0e998ac', '{}', true);