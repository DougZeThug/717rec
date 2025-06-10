
-- Reset all team records to zero
UPDATE public.teams 
SET 
    wins = 0,
    losses = 0,
    game_wins = 0,
    game_losses = 0
WHERE true;
