import { supabase } from '@/integrations/supabase/client';
import { Match, Ranking, Team } from '@/types';
import { handleDatabaseError } from '@/utils/errorHandler';
import { errorLog } from '@/utils/logger';
import { transformDatabaseMatches } from '@/utils/matchTransformers';
import { sortRankings, updateRankChanges } from '@/utils/rankingUtils';
import { createRankingObject } from '@/utils/rankingUtils/createRankingObject';
import { fetchDivisionWeights } from '@/utils/rankingUtils/divisionWeightsCache';

export const fetchRankingsData = async (): Promise<Match[]> => {
  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, team1_id, team2_id, team1_score, team2_score, date, location, iscompleted, winner_id, loser_id, round_number, position, bracket_id, match_type, next_match_id, next_loser_match_id, best_of, team1_game_wins, team2_game_wins, created_at'
    )
    .order('date', { ascending: false });

  if (error) handleDatabaseError(error, 'Failed to fetch rankings data');
  return transformDatabaseMatches(data ?? [], { normalizeDate: false });
};

export const calculateRankings = async (
  teams: Team[] | undefined,
  matches: Match[] | undefined,
  previousRankings: Record<string, number>
): Promise<Ranking[]> => {
  if (!teams || teams.length === 0) {
    return [];
  }

  try {
    // Fetch division weights ONCE before processing all teams
    const divisionWeights = await fetchDivisionWeights();

    // Create ranking objects for each team (now synchronous)
    const unsortedRankings = teams.map((team) =>
      createRankingObject(team, teams, matches, previousRankings, divisionWeights)
    );

    // Sort the rankings by power score
    const sortedRankings = sortRankings(unsortedRankings, 'powerScore', 'desc');

    // Update rank changes
    const finalRankings = updateRankChanges(sortedRankings);

    return finalRankings;
  } catch (error) {
    errorLog('Error calculating rankings:', error);
    throw error;
  }
};
