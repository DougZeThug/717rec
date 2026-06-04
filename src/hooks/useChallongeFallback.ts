import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/useToast';
import {
  ChallongeFallbackBracketInput,
  ChallongeFallbackService,
} from '@/services/ChallongeFallbackService';

const CONFIG_KEY = ['challonge-fallback', 'config'];
const BRACKETS_KEY = ['challonge-fallback', 'brackets'];

export const useChallongeFallbackConfig = () =>
  useQuery({
    queryKey: CONFIG_KEY,
    queryFn: ChallongeFallbackService.fetchConfig,
    staleTime: 1000 * 60 * 5,
  });

export const useChallongeFallbackBrackets = () =>
  useQuery({
    queryKey: BRACKETS_KEY,
    queryFn: ChallongeFallbackService.fetchBrackets,
    staleTime: 1000 * 60 * 5,
  });

export const useChallongeFallbackMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['challonge-fallback'] });
  };

  const onError = (action: string) => (error: Error) =>
    toast({
      title: 'Error',
      description: `Failed to ${action}: ${error.message}`,
      variant: 'destructive',
    });

  const updateConfig = useMutation({
    mutationFn: ChallongeFallbackService.updateConfig,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Saved', description: 'Challonge fallback settings updated' });
    },
    onError: onError('save settings'),
  });

  const createBracket = useMutation({
    mutationFn: (input: ChallongeFallbackBracketInput) =>
      ChallongeFallbackService.createBracket(input),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Added', description: 'Bracket added' });
    },
    onError: onError('add bracket'),
  });

  const updateBracket = useMutation({
    mutationFn: ChallongeFallbackService.updateBracket,
    onSuccess: () => {
      invalidate();
      toast({ title: 'Saved', description: 'Bracket updated' });
    },
    onError: onError('update bracket'),
  });

  const deleteBracket = useMutation({
    mutationFn: (id: string) => ChallongeFallbackService.deleteBracket(id),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Removed', description: 'Bracket removed' });
    },
    onError: onError('remove bracket'),
  });

  return {
    updateConfig: updateConfig.mutateAsync,
    createBracket: createBracket.mutateAsync,
    updateBracket: updateBracket.mutateAsync,
    deleteBracket: deleteBracket.mutateAsync,
    isMutating:
      updateConfig.isPending ||
      createBracket.isPending ||
      updateBracket.isPending ||
      deleteBracket.isPending,
  };
};