import { supabase } from '@/integrations/supabase/client';
import { handleDatabaseError } from '@/utils/errorHandler';
import { errorLog, warnLog } from '@/utils/logger';
import { createEveningAwareDateRange } from '@/utils/timezone';

/**
 * Service layer for match read operations
 * Abstracts Supabase queries from presentation components
 */

export interface MatchFilters {
  date?: Date;
  bracketId?: string;
}

/**
 * Fetch matches with team details, optionally filtered by date and/or bracket
 * @throws {DatabaseError} When database operations fail
 */
export const fetchMatchesWithTeams = async (filters?: MatchFilters) => {
  let query = supabase
    .from('matches')
    .select(
      `
        *,
        team1:teams!matches_team1_id_fkey(id, name, logo_url, image_url),
        team2:teams!matches_team2_id_fkey(id, name, logo_url, image_url)
      `
    )
    .order('date', { ascending: true });

  // Apply date filter if provided
  if (filters?.date) {
    const dateStr = filters.date.toISOString().split('T')[0]; // Format as yyyy-MM-dd
    query = query.gte('date', `${dateStr}T00:00:00`).lt('date', `${dateStr}T23:59:59`);
  }

  // Apply bracket filter if provided
  if (filters?.bracketId) {
    query = query.eq('bracket_id', filters.bracketId);
  }

  const { data, error } = await query;

  if (error) {
    handleDatabaseError(error, 'Failed to fetch matches with teams');
  }

  return data ?? [];
};

/**
 * Fetch pending matches (completed but no winner = ties)
 * @throws raw Supabase error on failure
 */
export const fetchPendingMatches = async () => {
  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, team1_id, team2_id, team1_score, team2_score, date, location, iscompleted, winner_id, loser_id, round_number, position, bracket_id, match_type, next_match_id, next_loser_match_id, best_of, team1_game_wins, team2_game_wins, created_at'
    )
    .eq('iscompleted', true)
    .is('winner_id', null)
    .order('date');

  if (error) throw error;
  return data || [];
};

/**
 * Fetch uncompleted matches
 * @throws raw Supabase error on failure
 */
export const fetchUncompletedMatches = async () => {
  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, team1_id, team2_id, team1_score, team2_score, date, location, iscompleted, winner_id, loser_id, round_number, position, bracket_id, match_type, next_match_id, next_loser_match_id, best_of, team1_game_wins, team2_game_wins, created_at'
    )
    .eq('iscompleted', false)
    .order('date');

  if (error) throw error;
  return data || [];
};

/**
 * Fetch pending score matches from v_pending_matches view
 * @throws raw Supabase error on failure
 */
export const fetchPendingScoresMatches = async () => {
  const { data, error } = await supabase
    .from('v_pending_matches')
    .select(
      'id, team1_id, team2_id, team1_name, team2_name, team1_logo, team2_logo, date, location'
    )
    .limit(10);

  if (error) throw error;
  return data || [];
};

/**
 * Fetch match timeslots for a given formatted date (yyyy-MM-dd)
 * @throws Error with user-friendly message on failure
 */
export const fetchMatchTimeslots = async (formattedDate: string) => {
  const { data, error } = await supabase
    .from('team_timeslots')
    .select(
      `
      id,
      match_date,
      timeslot,
      team_id,
      created_at,
      is_back_to_back,
      is_double_header,
      pair_slot,
      match_sequence,
      teams:team_id (
        id,
        name,
        logo_url,
        image_url
      )
    `
    )
    .eq('match_date', formattedDate);

  if (error) {
    throw new Error('Failed to load timeslots');
  }

  return data ?? [];
};

/**
 * Fetch pending score submissions
 * @throws raw Supabase error on failure
 */
export const fetchScoreSubmissions = async () => {
  const { data, error } = await supabase
    .from('score_submissions')
    .select(
      'id, match_id, submitter_name, submitter_team, message, status, created_at, reviewed_by, reviewed_at'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Fetch team matches for a specific team in the active season.
 * Returns null if no active season is found.
 * @throws raw Supabase error on match query failure
 */
export const fetchTeamMatchesData = async (teamId: string) => {
  // Get active season first to filter matches
  const { data: activeSeason } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .single();

  if (!activeSeason) {
    return null;
  }

  const { data, error } = await supabase
    .from('matches')
    .select(
      `
      *,
      team1:v_team_details!team1_id(
        team_id,
        name,
        image_url,
        logo_url,
        divisionname
      ),
      team2:v_team_details!team2_id(
        team_id,
        name,
        image_url,
        logo_url,
        divisionname
      )
    `
    )
    .eq('season_id', activeSeason.id)
    .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
    .order('date');

  if (error) throw error;
  return data || [];
};

/**
 * Fetch match details needed for tie cancellation
 * @throws raw Supabase error on failure
 * @throws Error if match not found
 */
export const fetchMatchForTie = async (matchId: string) => {
  const { data: currentMatch, error: fetchError } = await supabase
    .from('matches')
    .select('winner_id, loser_id, team1_id, team2_id, team1_game_wins, team2_game_wins')
    .eq('id', matchId)
    .single();

  if (fetchError) throw fetchError;
  if (!currentMatch) throw new Error('Match not found');
  return currentMatch;
};

/**
 * Fetch team IDs for a specific match
 * @throws Error if match not found or query fails
 */
export const fetchMatchTeamIds = async (matchId: string) => {
  const { data: matchData, error: matchError } = await supabase
    .from('matches')
    .select('team1_id, team2_id')
    .eq('id', matchId)
    .single();

  if (matchError || !matchData) {
    throw new Error(`Failed to fetch match data: ${matchError?.message}`);
  }

  return matchData;
};

/**
 * Fetch teams by their IDs from v_team_details view
 * Returns empty array if no IDs provided
 * @throws raw Supabase error on failure
 */
export const fetchTeamsByIds = async (teamIds: string[]) => {
  if (!teamIds.length) return [];

  const { data, error } = await supabase
    .from('v_team_details')
    .select(
      'team_id, name, image_url, logo_url, players, wins, losses, game_wins, game_losses, created_at, division_id, divisionname, sos, power_score, win_percentage, game_win_percentage'
    )
    .in('team_id', teamIds);

  if (error) throw error;
  return data || [];
};

/**
 * Fetch all teams from v_team_details view (for team lookup maps)
 * @throws raw Supabase error on failure
 */
export const fetchTeamsMap = async () => {
  const { data, error } = await supabase
    .from('v_team_details')
    .select(
      'team_id, name, image_url, logo_url, players, wins, losses, game_wins, game_losses, created_at, division_id, divisionname, sos, power_score, win_percentage, game_win_percentage'
    );

  if (error) throw error;
  return data || [];
};

// ---------------------------------------------------------------------------
// Functions added for Batch 11 refactor — moved from utils/autoSchedule
// ---------------------------------------------------------------------------

/**
 * Fetch active season ID using .single() — used by matchHistoryService util.
 * Throws on database error or when no active season found (PGRST116).
 * Callers should catch and handle as appropriate.
 */
export const fetchActiveSeasonIdStrict = async (): Promise<string> => {
  const { data, error } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .single();

  if (error) throw error;
  return data.id;
};

/**
 * Count completed matches between two teams in a specific season
 * Exact query copied from matchHistoryService.ts
 * @throws raw Supabase error on failure
 */
export const countTeamMatchesInSeason = async (
  team1Id: string,
  team2Id: string,
  seasonId: string
): Promise<number> => {
  const { count, error } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .or(
      `and(team1_id.eq.${team1Id},team2_id.eq.${team2Id}),and(team1_id.eq.${team2Id},team2_id.eq.${team1Id})`
    )
    .eq('iscompleted', true)
    .eq('season_id', seasonId);

  if (error) throw error;
  return count ?? 0;
};

/**
 * Fetch completed match team-ID pairs within a season for a given set of team IDs
 * Exact query copied from matchHistoryService.ts
 * @throws raw Supabase error on failure
 */
export const fetchMatchPairsInSeason = async (
  teamIds: string[],
  seasonId: string
): Promise<Array<{ team1_id: string | null; team2_id: string | null }>> => {
  const { data, error } = await supabase
    .from('matches')
    .select('team1_id, team2_id')
    .eq('iscompleted', true)
    .eq('season_id', seasonId)
    .in('team1_id', teamIds)
    .in('team2_id', teamIds);

  if (error) throw error;
  return data || [];
};

/**
 * Check if two teams have ever played each other (any season)
 * Exact query copied from compatibilityUtils.ts checkTeamsPlayedHistory
 * @throws raw Supabase error on failure
 */
export const checkTeamsEverPlayed = async (team1Id: string, team2Id: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('matches')
    .select('id')
    .or(
      `and(team1_id.eq.${team1Id},team2_id.eq.${team2Id}),and(team1_id.eq.${team2Id},team2_id.eq.${team1Id})`
    )
    .limit(1);

  if (error) throw error;
  return data !== null && data.length > 0;
};

// ---------------------------------------------------------------------------
// Types for season opponent history — used by useSeasonOpponentHistory hook
// ---------------------------------------------------------------------------

interface OpponentRecord {
  opponentId: string;
  opponentName: string;
  opponentDivision: string | null;
  matchCount: number;
  wins: number;
  losses: number;
}

interface TeamOpponentHistory {
  teamId: string;
  teamName: string;
  divisionId: string | null;
  divisionName: string | null;
  opponents: OpponentRecord[];
  uniqueOpponentCount: number;
  totalMatches: number;
}

export interface SeasonOpponentData {
  seasonId: string;
  seasonName: string;
  teams: TeamOpponentHistory[];
}

/**
 * Fetch season opponent history for the active season.
 * Returns null if no active season found.
 * @throws raw Supabase error on matches/teams query failure
 */
export const fetchSeasonOpponentHistory = async (): Promise<SeasonOpponentData | null> => {
  // 1. Get active season
  const { data: activeSeason, error: seasonError } = await supabase
    .from('seasons')
    .select('id, name')
    .eq('is_active', true)
    .single();

  if (seasonError || !activeSeason) {
    warnLog('No active season found:', seasonError);
    return null;
  }

  // 2. Get all regular season matches for active season (exclude playoff matches)
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select(
      `
      id,
      team1_id,
      team2_id,
      winner_id,
      iscompleted
    `
    )
    .eq('season_id', activeSeason.id)
    .eq('iscompleted', true)
    .is('bracket_id', null); // Regular season only - no bracket/playoff matches

  if (matchesError) {
    errorLog('Error fetching matches:', matchesError);
    throw matchesError;
  }

  // 3. Get all teams with divisions
  const { data: teams, error: teamsError } = await supabase.from('teams').select(`
      id,
      name,
      division_id,
      divisions (
        id,
        name
      )
    `);

  if (teamsError) {
    errorLog('Error fetching teams:', teamsError);
    throw teamsError;
  }

  // Build team lookup map
  const teamMap = new Map<
    string,
    { name: string; divisionId: string | null; divisionName: string | null }
  >();
  teams?.forEach((team) => {
    teamMap.set(team.id, {
      name: team.name,
      divisionId: team.division_id,
      divisionName: team.divisions?.name || null,
    });
  });

  // 4. Process matches to build opponent history per team
  const teamOpponents = new Map<string, Map<string, { wins: number; losses: number }>>();

  matches?.forEach((match) => {
    const { team1_id, team2_id, winner_id } = match;
    if (!team1_id || !team2_id) return;

    // Initialize team maps if not exists
    if (!teamOpponents.has(team1_id)) {
      teamOpponents.set(team1_id, new Map());
    }
    if (!teamOpponents.has(team2_id)) {
      teamOpponents.set(team2_id, new Map());
    }

    const team1Opponents = teamOpponents.get(team1_id)!;
    const team2Opponents = teamOpponents.get(team2_id)!;

    // Get or initialize opponent records
    const team1Record = team1Opponents.get(team2_id) || { wins: 0, losses: 0 };
    const team2Record = team2Opponents.get(team1_id) || { wins: 0, losses: 0 };

    // Update win/loss based on winner
    if (winner_id === team1_id) {
      team1Record.wins++;
      team2Record.losses++;
    } else if (winner_id === team2_id) {
      team1Record.losses++;
      team2Record.wins++;
    }

    team1Opponents.set(team2_id, team1Record);
    team2Opponents.set(team1_id, team2Record);
  });

  // 5. Build final data structure
  const teamsWithOpponents: TeamOpponentHistory[] = [];

  teamOpponents.forEach((opponents, teamId) => {
    const teamInfo = teamMap.get(teamId);
    if (!teamInfo) return;

    const opponentRecords: OpponentRecord[] = [];
    let totalMatches = 0;

    opponents.forEach((record, opponentId) => {
      const opponentInfo = teamMap.get(opponentId);
      const matchCount = record.wins + record.losses;
      totalMatches += matchCount;

      opponentRecords.push({
        opponentId,
        opponentName: opponentInfo?.name || 'Unknown',
        opponentDivision: opponentInfo?.divisionName || null,
        matchCount,
        wins: record.wins,
        losses: record.losses,
      });
    });

    // Sort opponents by match count desc, then name
    opponentRecords.sort((a, b) => {
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      return a.opponentName.localeCompare(b.opponentName);
    });

    teamsWithOpponents.push({
      teamId,
      teamName: teamInfo.name,
      divisionId: teamInfo.divisionId,
      divisionName: teamInfo.divisionName,
      opponents: opponentRecords,
      uniqueOpponentCount: opponentRecords.length,
      totalMatches: totalMatches / 2, // Each match counted twice (once per team)
    });
  });

  // Sort teams by division, then name
  teamsWithOpponents.sort((a, b) => {
    if (a.divisionName !== b.divisionName) {
      return (a.divisionName || '').localeCompare(b.divisionName || '');
    }
    return a.teamName.localeCompare(b.teamName);
  });

  return {
    seasonId: activeSeason.id,
    seasonName: activeSeason.name,
    teams: teamsWithOpponents,
  };
};

/**
 * Fetch matches for admin with evening-aware date range filtering
 * @throws raw Supabase error on failure
 */
export const fetchMatchesForAdmin = async (filters: { date?: Date; bracketId?: string }) => {
  let query = supabase
    .from('matches')
    .select(
      `
      *,
      team1:teams!matches_team1_id_fkey(id, name, logo_url, image_url),
      team2:teams!matches_team2_id_fkey(id, name, logo_url, image_url)
    `
    )
    .order('date', { ascending: true });

  if (filters.date) {
    const { startDate, endDate } = createEveningAwareDateRange(filters.date);
    query = query.gte('date', startDate.toISOString()).lte('date', endDate.toISOString());
  }

  if (filters.bracketId) {
    query = query.eq('bracket_id', filters.bracketId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};
