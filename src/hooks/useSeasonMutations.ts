import { useMutation, useQueryClient } from '@tanstack/react-query';

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

  const archiveSeason = useMutation({
    mutationFn: ({ id }: ArchiveSeasonData) => SeasonService.archiveSeason(id),
    onSuccess: () => {
      // Broad invalidation since archival touches matches, stats, rankings, etc.
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
      queryClient.invalidateQueries({ queryKey: ['v_team_details'] });
      queryClient.invalidateQueries({ queryKey: ['teamStats'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      queryClient.invalidateQueries({ queryKey: ['careerRankings'] });
      queryClient.invalidateQueries({ queryKey: ['bracket-data'] });
      queryClient.invalidateQueries({ queryKey: ['playoff-matches'] });
    },
  });

  return {
    createSeason,
    updateSeason,
    activateSeason,
    archiveSeason,
  };
};
