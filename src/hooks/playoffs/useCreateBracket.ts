import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createBracket } from '@/services/bracket-creator';
import { bracketLog, errorLog } from '@/utils/logger';

/**
 * Create a bracket from the playoff setup form.
 *
 * The refresh calls are not awaited on purpose: the mutation must not wait on
 * the cache refresh. The dialog does its own awaited refresh after the save.
 * The hook owns no toasts. The dialog shows them.
 */
export const useCreateBracket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createBracket,
    onSuccess: (bracket) => {
      bracketLog('Bracket created successfully:', bracket);
      // Keep cached bracket/playoff data in sync after the mutation.
      queryClient.invalidateQueries({ queryKey: ['brackets'] });
      queryClient.invalidateQueries({ queryKey: ['playoff-data'] });
      queryClient.invalidateQueries({ queryKey: ['playoff-matches'] });
    },
    onError: (error) => {
      errorLog('Failed to create bracket:', error);
    },
  });
};
