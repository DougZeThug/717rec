import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { errorLog } from '@/utils/logger';

export interface BlindDrawSignup {
  id: string;
  event_date: string;
  first_name: string;
  last_initial: string;
  created_at: string;
}

// Fetch signup count for public display (no auth required)
export const useBlindDrawSignupCount = () => {
  return useQuery({
    queryKey: ['blind-draw-signup-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('blind_draw_signups')
        .select('id', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 1000 * 60 * 2,
  });
};

// Fetch signups for admin view (requires admin role)
export const useBlindDrawSignups = (eventDate?: string) => {
  return useQuery({
    queryKey: ['blind-draw-signups', eventDate],
    queryFn: async () => {
      let query = supabase
        .from('blind_draw_signups')
        .select('id, event_date, first_name, last_initial, created_at')
        .order('created_at', { ascending: true });

      if (eventDate) {
        query = query.eq('event_date', eventDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BlindDrawSignup[];
    },
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });
};

// Add a signup (public, no auth required)
export const useAddBlindDrawSignup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      eventDate,
      firstName,
      lastInitial,
    }: {
      eventDate: string;
      firstName: string;
      lastInitial: string;
    }) => {
      const { error } = await supabase.from('blind_draw_signups').insert({
        event_date: eventDate,
        first_name: firstName.trim(),
        last_initial: lastInitial.trim().toUpperCase(),
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blind-draw-signups'] });
      queryClient.invalidateQueries({ queryKey: ['blind-draw-signup-count'] });
    },
    onError: (error) => {
      errorLog('Signup error:', error);
      toast({
        title: 'Error',
        description: 'Failed to sign up. Please try again.',
        variant: 'destructive',
      });
    },
  });
};

// Delete a signup (admin only)
export const useDeleteBlindDrawSignup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blind_draw_signups').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blind-draw-signups'] });
      toast({
        title: 'Success',
        description: 'Signup removed',
      });
    },
    onError: (error) => {
      errorLog('Delete error:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove signup',
        variant: 'destructive',
      });
    },
  });
};

// Clear all signups for a date (admin only)
export const useClearBlindDrawSignups = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('blind_draw_signups')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blind-draw-signups'] });
      toast({
        title: 'Success',
        description: 'All signups cleared',
      });
    },
    onError: (error) => {
      errorLog('Clear error:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear signups',
        variant: 'destructive',
      });
    },
  });
};
