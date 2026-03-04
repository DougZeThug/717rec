import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/useToast';
import { HeroCardService } from '@/services/HeroCardService';
import { HeroCard } from '@/types/heroCard';

// Hook for fetching visible hero cards (homepage)
export const useHeroCards = () => {
  return useQuery({
    queryKey: ['hero-cards', 'visible'],
    queryFn: HeroCardService.fetchVisibleHeroCards,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

// Hook for admin - fetches ALL cards
export const useAllHeroCards = () => {
  return useQuery({
    queryKey: ['hero-cards', 'all'],
    queryFn: HeroCardService.fetchAllHeroCards,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

// Hook for single hero card
export const useHeroCard = (id: string | null) => {
  return useQuery({
    queryKey: ['hero-cards', id],
    queryFn: () => HeroCardService.fetchHeroCardById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};

// Mutations for CRUD operations
export const useHeroCardMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: (formData: Omit<HeroCard, 'id' | 'created_at' | 'updated_at'>) =>
      HeroCardService.createHeroCard(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hero-cards'] });
      toast({
        title: 'Success',
        description: 'Hero card created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create hero card: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<HeroCard> & { id: string }) => HeroCardService.updateHeroCard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hero-cards'] });
      toast({
        title: 'Success',
        description: 'Hero card updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update hero card: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => HeroCardService.deleteHeroCard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hero-cards'] });
      toast({
        title: 'Success',
        description: 'Hero card deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete hero card: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: (data: { id: string; is_visible: boolean }) =>
      HeroCardService.toggleHeroCardVisibility(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hero-cards'] });
      toast({
        title: 'Success',
        description: 'Visibility updated',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update visibility: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    createCard: createMutation.mutateAsync,
    updateCard: updateMutation.mutateAsync,
    deleteCard: deleteMutation.mutateAsync,
    toggleVisibility: toggleVisibilityMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
