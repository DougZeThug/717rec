import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/integrations/supabase/client';
import { Match } from '@/types';
import { errorLog, scheduleLog } from '@/utils/logger';
import { transformDatabaseMatches } from '@/utils/matchTransformers';

export const useScheduleData = () => {
  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: async () => {
      scheduleLog('Fetching matches data');

      // Join with v_team_details to get team information using LEFT JOIN instead of INNER JOIN
      // Also fix column name to use divisionname (lowercase) instead of divisionName
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
        .order('date');

      if (error) {
        errorLog('Error fetching matches:', error);
        throw error;
      }

      scheduleLog(
        `Fetched ${data.length} matches (${data.filter((m) => m.iscompleted).length} completed)`
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
    refetchOnWindowFocus: true,
    refetchOnMount: 'always', // Always refetch on mount to ensure fresh team data
    staleTime: 1000 * 60 * 2, // 2 minutes - schedule rarely changes
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
