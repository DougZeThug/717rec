-- Refresh team_season_stats from the v_team_season_agg view
-- This will fix Winter 2026 (and any other seasons with stale data)
SELECT upsert_team_season_stats();