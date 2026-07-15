import { useQuery } from '@tanstack/react-query';

import { fetchAllTeamBadges, fetchTeamBadges } from '@/services/teams/TeamFetchService';
import { TeamBadgeEvent } from '@/types/badges';

export const useTeamBadges = (teamId: string) => {
  return useQuery({
    queryKey: ['team-badges', teamId],
    queryFn: (): Promise<TeamBadgeEvent[]> => fetchTeamBadges(teamId),
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

export const useAllTeamBadges = () => {
  return useQuery({
    queryKey: ['all-team-badges'],
    queryFn: (): Promise<TeamBadgeEvent[]> => fetchAllTeamBadges(),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
