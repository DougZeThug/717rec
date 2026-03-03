import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { errorLog } from '@/utils/logger';

export interface BlindDrawSettings {
  id: string;
  signup_confirmation_message: string;
  created_at: string;
  updated_at: string;
}

export const useBlindDrawSettings = () => {
  return useQuery({
    queryKey: ['blind-draw-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blind_draw_settings')
        .select('id, signup_confirmation_message, created_at, updated_at')
        .limit(1)
        .single();
      if (error) throw error;
      return data as BlindDrawSettings;
    },
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdateBlindDrawSettings = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, message }: { id: string; message: string }) => {
      const { error } = await supabase
        .from('blind_draw_settings')
        .update({ signup_confirmation_message: message })
        .eq('id', id);
      if (error) throw error;
    },
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
