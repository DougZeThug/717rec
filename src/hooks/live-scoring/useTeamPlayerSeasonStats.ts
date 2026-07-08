import { useQuery } from '@tanstack/react-query';

import { useActiveSeason } from '@/hooks/useSeasons';
import { PlayerStatsService } from '@/services/liveScoring/PlayerStatsService';
import { LiveScoringNotEnabledError } from '@/types/errors';

import { liveScoringKeys } from './liveScoringKeys';

/**
 * Per-player live-scoring stats (PPR etc.) for a team in the active season,
 * derived from the v_player_season_stats view. Returns an empty list until
 * the team has live-scored matches (or the migration isn't applied yet).
 */
export function useTeamPlayerSeasonStats(teamId: string | undefined) {
  const { data: activeSeason } = useActiveSeason();
  const seasonId = activeSeason?.id;

  const query = useQuery({
    queryKey: liveScoringKeys.teamPlayerSeasonStats(teamId ?? '', seasonId ?? ''),
    queryFn: () => {
      if (!teamId || !seasonId) throw new Error('Team and season ids are required');
      return PlayerStatsService.fetchTeamPlayerSeasonStats(teamId, seasonId);
    },
    enabled: Boolean(teamId) && Boolean(seasonId),
    staleTime: 60_000,
    retry: (failureCount, error) =>
      !(error instanceof LiveScoringNotEnabledError) && failureCount < 1,
  });

  return {
    stats: query.data ?? [],
    isLoading: query.isLoading,
    isNotEnabled: query.error instanceof LiveScoringNotEnabledError,
    error: query.error,
  };
}
