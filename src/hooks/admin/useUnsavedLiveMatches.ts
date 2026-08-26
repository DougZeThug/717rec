import { useQuery } from '@tanstack/react-query';

import { UnsavedLiveMatchesService } from '@/services/admin/UnsavedLiveMatchesService';

const UNSAVED_LIVE_MATCHES_KEY = ['admin', 'unsaved-live-matches'] as const;

export const useUnsavedLiveMatches = () =>
  useQuery({
    queryKey: UNSAVED_LIVE_MATCHES_KEY,
    queryFn: () => UnsavedLiveMatchesService.fetchUnsavedLiveMatches(),
    staleTime: 60_000,
  });
