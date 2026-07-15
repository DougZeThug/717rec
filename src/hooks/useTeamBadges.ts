import { useQuery } from '@tanstack/react-query';

import { fetchAllTeamBadges, fetchTeamBadges } from '@/services/teams/TeamFetchService';
import { TeamBadgeEvent } from '@/types/badges';

/** Query one team's badge events, cached five minutes; idle until a team id is given. */
export const useTeamBadges = (teamId: string) => {
  return useQuery({
    queryKey: ['team-badges', teamId],
    queryFn: (): Promise<TeamBadgeEvent[]> => fetchTeamBadges(teamId),
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

/** Query badge events for every team, cached for five minutes. */
export const useAllTeamBadges = () => {
  return useQuery({
    queryKey: ['all-team-badges'],
    queryFn: (): Promise<TeamBadgeEvent[]> => fetchAllTeamBadges(),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
