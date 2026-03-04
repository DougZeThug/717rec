import { useQuery } from '@tanstack/react-query';

import { SeasonService } from '@/services/SeasonService';

export const useSeasons = () => {
  return useQuery({
    queryKey: ['seasons'],
    queryFn: SeasonService.fetchSeasons,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
};

export const useActiveSeason = () => {
  return useQuery({
    queryKey: ['seasons', 'active'],
    queryFn: SeasonService.fetchActiveSeason,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
};
