import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/useToast';
import { BlindDrawService } from '@/services/BlindDrawService';
import { errorLog } from '@/utils/logger';

export type { BlindDrawSettings } from '@/services/BlindDrawService';

export const useBlindDrawSettings = () => {
  return useQuery({
    queryKey: ['blind-draw-settings'],
    queryFn: BlindDrawService.fetchBlindDrawSettings,
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateBlindDrawSettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: BlindDrawService.updateBlindDrawSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blind-draw-settings'] });
      toast({ title: 'Saved', description: 'Confirmation message updated' });
    },
    onError: (error) => {
      errorLog('Settings update error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update settings',
        variant: 'destructive',
      });
    },
  });
};
