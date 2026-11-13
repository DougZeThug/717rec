import { fetchSeasonBreakdown } from '@/services/TeamSeasonStatsService';
import { TeamAdvancedStats } from '@/types/teamAdvancedStats';

export const fetchTeamSeasonBreakdown = (teamId: string): Promise<TeamAdvancedStats | null> => {
  return fetchSeasonBreakdown(teamId);
};
