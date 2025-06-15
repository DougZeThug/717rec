
import { useQuery } from '@tanstack/react-query';
import { BadgeProcessingService } from '@/services/BadgeProcessingService';

export const useTeamStreak = (teamId: string) => {
  return useQuery({
    queryKey: ['team-streak', teamId],
    queryFn: () => BadgeProcessingService.calculateTeamStreak(teamId),
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000 // 10 minutes
  });
};

export const useAwardStreakBadges = () => {
  const awardBadges = async (teamId: string) => {
    return await BadgeProcessingService.awardStreakBadges(teamId);
  };

  return { awardBadges };
};
