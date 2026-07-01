import { useMutation, useQueryClient } from '@tanstack/react-query';

import { batchInvalidateQueries } from '@/hooks/matches/utils/queryCacheUtils';
import { SeasonService } from '@/services/SeasonService';

interface CreateSeasonData {
  name: string;
  start_date: string;
  end_date?: string | null;
}

interface UpdateSeasonData extends CreateSeasonData {
  id: string;
}

interface ArchiveSeasonData {
  id: string;
}

// Season-wide operations (archive / partial-archive / finalize) touch matches,
// team stats, rankings, standings, playoff brackets and career data, so every
// related cache is invalidated. Shared here so the four broad mutations stay in
// sync instead of repeating the same list.
const SEASON_WIDE_QUERY_KEYS = [
  'seasons',
  'matches',
  'teams',
  'rankings',
  'v_team_details',
  'teamStats',
  'standings',
  'careerRankings',
  'bracket-data',
  'playoff-matches',
];

export const useSeasonMutations = () => {
  const queryClient = useQueryClient();

  const createSeason = useMutation({
    mutationFn: SeasonService.createSeason,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    },
  });

  const updateSeason = useMutation({
    mutationFn: ({ id, ...data }: UpdateSeasonData) => SeasonService.updateSeason(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    },
  });

  const activateSeason = useMutation({
    mutationFn: SeasonService.activateSeason,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    },
  });

  // Same side-effect surface as archiveSeason — partial-archive archives
  // regular-season matches and resets team counters, so all match/stats caches
  // need invalidation too.
  const activateSeasonWithPartialArchive = useMutation({
    mutationFn: SeasonService.activateSeasonWithPartialArchive,
    onSuccess: () => {
      batchInvalidateQueries(queryClient, SEASON_WIDE_QUERY_KEYS);
    },
  });

  const finalizePlayoffs = useMutation({
    mutationFn: SeasonService.finalizePlayoffs,
    onSuccess: () => {
      batchInvalidateQueries(queryClient, SEASON_WIDE_QUERY_KEYS);
    },
  });

  const archiveSeason = useMutation({
    mutationFn: ({ id }: ArchiveSeasonData) => SeasonService.archiveSeason(id),
    onSuccess: () => {
      // Broad invalidation since archival touches matches, stats, rankings, etc.
      batchInvalidateQueries(queryClient, SEASON_WIDE_QUERY_KEYS);
    },
  });

  const partialArchiveSeason = useMutation({
    mutationFn: ({ id }: ArchiveSeasonData) => SeasonService.partialArchiveSeason(id),
    onSuccess: () => {
      batchInvalidateQueries(queryClient, SEASON_WIDE_QUERY_KEYS);
    },
  });

  return {
    createSeason,
    updateSeason,
    activateSeason,
    activateSeasonWithPartialArchive,
    finalizePlayoffs,
    archiveSeason,
    partialArchiveSeason,
  };
};
