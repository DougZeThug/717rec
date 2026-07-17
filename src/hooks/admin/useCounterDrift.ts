import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { DriftService } from '@/services/admin/DriftService';

const DRIFT_KEY = ['admin', 'counter-drift'] as const;

export const useCounterDrift = () =>
  useQuery({
    queryKey: DRIFT_KEY,
    queryFn: () => DriftService.fetchDrift(),
    staleTime: 60_000,
  });

export const useReconcileCounters = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => DriftService.reconcile(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DRIFT_KEY });
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['team-season-stats'] });
    },
  });
};