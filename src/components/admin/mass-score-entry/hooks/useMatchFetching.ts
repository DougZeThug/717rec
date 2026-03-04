import { useState } from 'react';

import { useToast } from '@/hooks/useToast';
import { debugLog, errorLog, matchLog } from '@/utils/logger';

import { buildMatchQuery } from '../services/matchQueryService';
import { FilterState, MatchWithTeams } from '../types';
import { transformDatabaseMatchToMatchWithTeams } from '../utils/matchTransformUtils';

export const useMatchFetching = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  const fetchMatches = async (filters: FilterState) => {
    setLoading(true);
    try {
      const data = await buildMatchQuery(filters);

      // Log raw data type information
      matchLog('Raw matches fetched', {
        count: data?.length || 0,
        bracketId: filters.bracketId,
        date: filters.date,
      });

      const formattedMatches: MatchWithTeams[] = (data || []).map((match, index) => {
        // Raw data inspection - use debugLog for verbose output
        debugLog(`Raw match data from database [${index}]`, {
          matchId: match.id,
          date: match.date,
          team1_game_wins: match.team1_game_wins,
          team2_game_wins: match.team2_game_wins,
        });

        const transformed = transformDatabaseMatchToMatchWithTeams(match);

        return transformed;
      });

      // Log the final formatted matches
      if (formattedMatches.length > 0) {
        matchLog('Sample transformed match', {
          matchId: formattedMatches[0].id,
          matchDate: formattedMatches[0].date,
        });
      }

      setLoading(false);
      return formattedMatches;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errorLog('Error fetching matches:', errorMessage);
      toast({
        title: 'Error',
        description: `Failed to fetch matches: ${errorMessage}`,
        variant: 'destructive',
      });
      setLoading(false);
      return [];
    }
  };

  return {
    loading,
    fetchMatches,
  };
};
