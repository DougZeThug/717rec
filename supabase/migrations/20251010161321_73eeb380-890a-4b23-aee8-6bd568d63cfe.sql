-- Add new badge type to enum
ALTER TYPE badge_type ADD VALUE IF NOT EXISTS 'cool_fun_team';

-- Remove Jerm's incorrect Kingslayer badge
DELETE FROM team_badge_events 
WHERE id = 'de94795a-07bb-4bb4-9f41-3fa9d931eedf';