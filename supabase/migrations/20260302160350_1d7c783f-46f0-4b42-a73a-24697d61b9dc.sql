-- One-time fix: reset stale team stats left over from Winter 2026 archival
UPDATE public.teams
SET wins = 0, losses = 0, game_wins = 0, game_losses = 0;