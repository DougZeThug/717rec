import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import { fetchUncompletedMatches } from '@/services/matches/MatchReadService';
import { Match } from '@/types';
import { errorLog } from '@/utils/logger';
import { transformDatabaseMatches } from '@/utils/matchTransformers';

import { useMatchScoresState } from './matches/useMatchScoresState';
import { useMatchSubmission } from './matches/useMatchSubmission';
import { useTeamsMap } from './teams';

export function useUncompletedMatches() {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { handleSubmitScore } = useMatchSubmission();
  const { teams, refetch: fetchTeams } = useTeamsMap();

  const {
    data: matches = [],
    isLoading,
    _refetch,
  } = useQuery<Match[]>({
    queryKey: ['matches', 'uncompleted'],
    queryFn: async () => {
      let data;
      try {
        data = await fetchUncompletedMatches();
      } catch (error) {
        errorLog('Error fetching uncompleted matches:', error);
        toast({
          title: 'Error',
          description: 'Failed to load matches. Please try again.',
          variant: 'destructive',
        });
        throw error;
      }

      return transformDatabaseMatches(data);
    },
    staleTime: 0, // Always fresh - instant updates
  });

  // Score state management - initialized from matches
  const { scores, initializeScores, handleScoreChange } = useMatchScoresState(matches);

  // Reinitialize scores when matches change
  useEffect(() => {
    if (matches.length > 0) {
      initializeScores(matches);
    }
  }, [matches, initializeScores]);

  // Fetch teams on mount
  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return {
    matches,
    teams,
    isLoading,
    openItems,
    scores,
    toggleItem,
    handleScoreChange,
    handleSubmitScore,
  };
}
