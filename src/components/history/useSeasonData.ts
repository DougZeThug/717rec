import { useQuery } from '@tanstack/react-query';

import { SeasonService } from '@/services/SeasonService';
import { dbLog } from '@/utils/logger';

import { SeasonData } from './useSeasonAccordionViewModel';

export const useSeasonData = (seasonId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['season-data', seasonId],
    queryFn: async () => {
      dbLog(`Season ${seasonId}: Starting season data query...`);
      const transformedData = (await SeasonService.fetchSeasonStatsForAccordion(
        seasonId
      )) as SeasonData[];
      dbLog(`Season ${seasonId}: Transformed ${transformedData.length} team records`);
      return transformedData;
    },
    enabled,
    staleTime: 0,
    retry: 2,
    retryDelay: 1000,
  });
