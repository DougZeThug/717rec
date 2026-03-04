import { useState } from 'react';

import { toast } from '@/hooks/useToast';
import { SeasonService } from '@/services/SeasonService';
import { errorLog } from '@/utils/logger';

export interface SeasonStat {
  season_id: string;
  team_id: string;
  match_wins: number;
  match_losses: number;
  game_wins: number;
  game_losses: number;
  power_score: number;
  sos: number;
  recorded_at: string;
  team_name?: string;
}

export function useSeasonStats() {
  const [isLoading, setIsLoading] = useState(false);
  const [seasonStats, setSeasonStats] = useState<SeasonStat[]>([]);
  const [seasons, setSeasons] = useState<string[]>([]);

  const fetchSeasons = async () => {
    setIsLoading(true);
    try {
      const uniqueSeasons = await SeasonService.fetchSeasonStatIds();
      setSeasons(uniqueSeasons);
      return uniqueSeasons;
    } catch (error) {
      errorLog('Error fetching seasons:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch seasons.',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatsBySeason = async (seasonId: string) => {
    setIsLoading(true);
    try {
      const statsWithTeamNames = await SeasonService.fetchStatsBySeason(seasonId);
      setSeasonStats(statsWithTeamNames as SeasonStat[]);
      return statsWithTeamNames as SeasonStat[];
    } catch (error) {
      errorLog('Error fetching season stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch season stats.',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    seasonStats,
    seasons,
    fetchSeasons,
    fetchStatsBySeason,
  };
}
