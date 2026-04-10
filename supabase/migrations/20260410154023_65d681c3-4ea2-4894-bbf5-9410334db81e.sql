
-- =============================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_match_group_id ON public.match (group_id);
CREATE INDEX IF NOT EXISTS idx_matches_bracket_id ON public.matches (bracket_id);
CREATE INDEX IF NOT EXISTS idx_participants_team_id ON public.participants (team_id);
CREATE INDEX IF NOT EXISTS idx_playoff_games_winner_id ON public.playoff_games (winner_id);
CREATE INDEX IF NOT EXISTS idx_playoff_matches_team1_id ON public.playoff_matches (team1_id);
CREATE INDEX IF NOT EXISTS idx_playoff_matches_team2_id ON public.playoff_matches (team2_id);
CREATE INDEX IF NOT EXISTS idx_playoff_matches_loser_id ON public.playoff_matches (loser_id);
CREATE INDEX IF NOT EXISTS idx_playoff_matches_next_lose_match_id ON public.playoff_matches (next_lose_match_id);
CREATE INDEX IF NOT EXISTS idx_playoff_matches_next_win_match_id ON public.playoff_matches (next_win_match_id);
CREATE INDEX IF NOT EXISTS idx_playoff_matches_winner_id ON public.playoff_matches (winner_id);
CREATE INDEX IF NOT EXISTS idx_playoff_team_records_bracket_id ON public.playoff_team_records (bracket_id);
CREATE INDEX IF NOT EXISTS idx_power_score_snapshots_division_id ON public.power_score_snapshots (division_id);
CREATE INDEX IF NOT EXISTS idx_score_submissions_match_id ON public.score_submissions (match_id);
CREATE INDEX IF NOT EXISTS idx_score_submissions_reviewed_by ON public.score_submissions (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_season_team_participation_submitted_by ON public.season_team_participation (submitted_by);
CREATE INDEX IF NOT EXISTS idx_season_team_participation_team_id ON public.season_team_participation (team_id);
CREATE INDEX IF NOT EXISTS idx_seasons_champion_team_id ON public.seasons (champion_team_id);
CREATE INDEX IF NOT EXISTS idx_seasons_runner_up_team_id ON public.seasons (runner_up_team_id);
CREATE INDEX IF NOT EXISTS idx_seasons_third_place_team_id ON public.seasons (third_place_team_id);
CREATE INDEX IF NOT EXISTS idx_team_analysis_created_by ON public.team_analysis (created_by);
CREATE INDEX IF NOT EXISTS idx_team_analysis_updated_by ON public.team_analysis (updated_by);
CREATE INDEX IF NOT EXISTS idx_team_memberships_approved_by ON public.team_memberships (approved_by);
CREATE INDEX IF NOT EXISTS idx_team_requests_season_id ON public.team_requests (season_id);
CREATE INDEX IF NOT EXISTS idx_team_season_opt_out_season_id ON public.team_season_opt_out (season_id);
CREATE INDEX IF NOT EXISTS idx_team_season_stats_team_id ON public.team_season_stats (team_id);
CREATE INDEX IF NOT EXISTS idx_team_stats_team_id ON public.team_stats (team_id);

-- =============================================
-- 2. DROP UNUSED INDEXES
-- =============================================

DROP INDEX IF EXISTS public.idx_brackets_bracket_data;
DROP INDEX IF EXISTS public.idx_brackets_division_id;
DROP INDEX IF EXISTS public.idx_brackets_migrated;
DROP INDEX IF EXISTS public.idx_brackets_wb_champion_id;
DROP INDEX IF EXISTS public.idx_debug_match_updates_user_id;
DROP INDEX IF EXISTS public.idx_messages_team_created;
DROP INDEX IF EXISTS public.idx_messages_user_created;
DROP INDEX IF EXISTS public.idx_messages_user_id;
DROP INDEX IF EXISTS public.idx_participant_team_id;
DROP INDEX IF EXISTS public.idx_participant_position;
DROP INDEX IF EXISTS public.idx_participant_tournament;
DROP INDEX IF EXISTS public.idx_participants_tournament;
DROP INDEX IF EXISTS public.idx_seasons_is_archived;
DROP INDEX IF EXISTS public.idx_snapshots_team_season;
DROP INDEX IF EXISTS public.idx_team_memberships_is_approved;
DROP INDEX IF EXISTS public.idx_team_memberships_team;
DROP INDEX IF EXISTS public.match_reactions_match_id_idx;
DROP INDEX IF EXISTS public.matches_archive_iscompleted_idx;
DROP INDEX IF EXISTS public.idx_team_requests_team_id;
DROP INDEX IF EXISTS public.idx_team_requests_created_at;
