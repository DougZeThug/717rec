import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { fetchAllPages } from '@/services/shared/pagination';
import { handleDatabaseError } from '@/utils/errorHandler';
import { createEveningAwareDateRange } from '@/utils/timezone';

/**
 * Service layer for schedule and admin match operations
 */

type MatchRow = Tables<'matches'>;

/** Team columns embedded by the admin match join-select. */
type AdminMatchTeam = Pick<Tables<'teams'>, 'id' | 'name' | 'logo_url' | 'image_url'>;

/** A match row plus its two joined team summaries (admin view). */
type AdminMatchWithTeams = MatchRow & {
  team1: AdminMatchTeam | null;
  team2: AdminMatchTeam | null;
};

/** v_team_details columns embedded by the schedule join-select. */
type ScheduleTeamDetail = Pick<
  Tables<'v_team_details'>,
  | 'team_id'
  | 'name'
  | 'image_url'
  | 'logo_url'
  | 'divisionname'
  | 'division_id'
  | 'power_score'
  | 'sos'
>;

/** A match row plus its two joined v_team_details rows (schedule view). */
type ScheduleMatchWithTeams = MatchRow & {
  team1: ScheduleTeamDetail | null;
  team2: ScheduleTeamDetail | null;
};

/**
 * Fetch matches for admin with evening-aware date range filtering.
 *
 * Results are paginated (via fetchAllPages) so the admin mass-score screen never
 * silently stops at PostgREST's 1,000-row response cap. Rows are ordered by date
 * then id — date alone is not a total order (many matches share a date), and
 * range pagination requires a stable, unique sort or it can skip or repeat rows
 * across pages.
 *
 * @throws {DatabaseError} When database operations fail
 */
export const fetchMatchesForAdmin = (filters: {
  date?: Date;
  bracketId?: string;
}): Promise<AdminMatchWithTeams[]> => {
  return fetchAllPages<AdminMatchWithTeams>((from, to) => {
    let query = supabase
      .from('matches')
      .select(
        `
        id, team1_id, team2_id, team1_score, team2_score, date, location, iscompleted, winner_id, loser_id, round_number, position, bracket_id, match_type, next_match_id, next_loser_match_id, best_of, team1_game_wins, team2_game_wins, season_id, metadata, created_at,
        team1:teams!matches_team1_id_fkey(id, name, logo_url, image_url),
        team2:teams!matches_team2_id_fkey(id, name, logo_url, image_url)
      `
      )
      .order('date', { ascending: true })
      .order('id', { ascending: true });

    if (filters.date) {
      const { startDate, endDate } = createEveningAwareDateRange(filters.date);
      query = query.gte('date', startDate.toISOString()).lte('date', endDate.toISOString());
    }

    if (filters.bracketId) {
      query = query.eq('bracket_id', filters.bracketId);
    }

    return query.range(from, to);
  }, 'Failed to fetch matches for admin');
};

/**
 * Fetch schedule matches for the active season with v_team_details join.
 * Used by useScheduleData hook.
 * @throws {DatabaseError} When database operations fail
 */
export const fetchScheduleMatches = async (): Promise<ScheduleMatchWithTeams[]> => {
  // First get the active season
  const { data: activeSeason } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .single();

  if (!activeSeason) return [];

  const { data, error } = await supabase
    .from('matches')
    .select(
      `
      id, team1_id, team2_id, team1_score, team2_score, date, location, iscompleted, winner_id, loser_id, round_number, position, bracket_id, match_type, next_match_id, next_loser_match_id, best_of, team1_game_wins, team2_game_wins, season_id, metadata, created_at,
      team1:v_team_details!team1_id(
        team_id,
        name,
        image_url,
        logo_url,
        divisionname,
        division_id,
        power_score,
        sos
      ),
      team2:v_team_details!team2_id(
        team_id,
        name,
        image_url,
        logo_url,
        divisionname,
        division_id,
        power_score,
        sos
      )
    `
    )
    .eq('season_id', activeSeason.id)
    .order('date');

  if (error) handleDatabaseError(error, 'Failed to fetch schedule matches');
  return data ?? [];
};
