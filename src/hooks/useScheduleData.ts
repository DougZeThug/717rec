import { useQuery } from '@tanstack/react-query';

import { fetchScheduleMatches } from '@/services/matches/MatchReadService';
import { errorLog, scheduleLog } from '@/utils/logger';
import { transformDatabaseMatches } from '@/utils/matchTransformers';

export const useScheduleData = () => {
  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches', 'schedule'],
    queryFn: async () => {
      scheduleLog('Fetching matches data');

      const data = await fetchScheduleMatches();

      if (!data.length) {
        scheduleLog('No matches found for active season');
        return [];
      }

      scheduleLog(
        `Fetched ${data.length} matches (${data.filter((m: any) => m.iscompleted).length} completed)`
      );

      // Use centralized transformer with team details
      const transformedMatches = transformDatabaseMatches(data, { normalizeDate: false });

      // Filter out matches with missing team details (safety check for race conditions)
      const validMatches = transformedMatches.filter((match) => {
        const hasTeam1 = match.team1Details?.name;
        const hasTeam2 = match.team2Details?.name;

        if (!hasTeam1 || !hasTeam2) {
          errorLog('Match missing team details:', {
            matchId: match.id,
            team1Id: match.team1Id,
            team2Id: match.team2Id,
            hasTeam1Details: Boolean(hasTeam1),
            hasTeam2Details: Boolean(hasTeam2),
          });
          return false;
        }

        return true;
      });

      scheduleLog(
        `Returning ${validMatches.length} matches with complete team data (filtered out ${transformedMatches.length - validMatches.length})`
      );

      return validMatches;
    },
    refetchOnWindowFocus: false, // Don't refetch on tab focus
    refetchOnMount: false, // Trust the cache
    staleTime: 0, // Always fresh - instant updates
  });

  // Process and separate upcoming vs completed matches
  const upcomingMatches = matchesData?.filter((match) => !match.iscompleted) || [];
  const completedMatches = matchesData?.filter((match) => match.iscompleted) || [];

  // Sort upcoming matches by date (closest first)
  upcomingMatches.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : Infinity;
    const dateB = b.date ? new Date(b.date).getTime() : Infinity;
    return dateA - dateB;
  });

  // Sort completed matches by date (most recent first)
  completedMatches.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  return {
    matchesData,
    matchesLoading,
    upcomingMatches,
    completedMatches,
  };
};
