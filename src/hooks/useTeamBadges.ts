import { useQuery } from '@tanstack/react-query';

import {
  fetchTeamBadges,
  fetchAllTeamBadges,
  fetchSeasonBadges,
} from '@/services/teams/TeamFetchService';
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

export const useSeasonBadges = (seasonId: string) => {
  return useQuery({
    queryKey: ['season-badges', seasonId],
    queryFn: (): Promise<TeamBadgeEvent[]> => fetchSeasonBadges(seasonId),
    enabled: !!seasonId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
