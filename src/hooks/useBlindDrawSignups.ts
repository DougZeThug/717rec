import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/useToast';
import { BlindDrawService } from '@/services/BlindDrawService';
import { errorLog } from '@/utils/logger';

export type { BlindDrawSignup } from '@/services/BlindDrawService';

// Fetch signup count for public display (no auth required)
export const useBlindDrawSignupCount = () => {
  return useQuery({
    queryKey: ['blind-draw-signup-count'],
    queryFn: BlindDrawService.fetchBlindDrawSignupCount,
    staleTime: 1000 * 60 * 2,
  });
};

// Fetch signups for admin view (requires admin role)
export const useBlindDrawSignups = (eventDate?: string) => {
  return useQuery({
    queryKey: ['blind-draw-signups', eventDate],
    queryFn: () => BlindDrawService.fetchBlindDrawSignups(eventDate),
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });
};

// Add a signup (public, no auth required)
export const useAddBlindDrawSignup = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: BlindDrawService.createSignup,
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
    mutationFn: BlindDrawService.deleteSignup,
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
    mutationFn: BlindDrawService.clearSignups,
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
