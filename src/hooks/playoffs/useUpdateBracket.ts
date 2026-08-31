import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/useToast';
import { type BracketUpdateInput, updateBracket } from '@/services/brackets/BracketWriteService';
import { errorLog } from '@/utils/logger';

/**
 * Rename a bracket, or move it to a different division or season.
 *
 * A bracket's structure is not touched here — see `updateBracket` in
 * `BracketWriteService` for why only these three fields can change.
 */
export const useUpdateBracket = (bracketId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (patch: BracketUpdateInput) => updateBracket(bracketId as string, patch),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['brackets'] }),
        // The overview list's key does not start with 'brackets'.
        queryClient.invalidateQueries({ queryKey: ['playoffs-brackets-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['playoff-data'] }),
      ]);
      if (bracketId) {
        await queryClient.invalidateQueries({ queryKey: ['bracket-info', bracketId] });
        await queryClient.invalidateQueries({ queryKey: ['bracket-data', bracketId] });
      }

      toast({
        title: 'Bracket updated',
        description: 'The bracket details have been saved.',
      });
    },
    onError: (error: Error) => {
      errorLog('useUpdateBracket - failed', error);
      toast({
        title: 'Could not update bracket',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
};
