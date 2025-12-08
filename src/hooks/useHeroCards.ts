import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { HeroCard, HeroCardFormData } from "@/types/heroCard";
import { toast } from "sonner";

// Hook for fetching visible hero cards (homepage)
export const useHeroCards = () => {
  return useQuery({
    queryKey: ['hero-cards', 'visible'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hero_cards')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as HeroCard[];
    }
  });
};

// Hook for admin - fetches ALL cards
export const useAllHeroCards = () => {
  return useQuery({
    queryKey: ['hero-cards', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hero_cards')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as HeroCard[];
    }
  });
};

// Hook for single hero card
export const useHeroCard = (id: string | null) => {
  return useQuery({
    queryKey: ['hero-cards', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('hero_cards')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as HeroCard;
    },
    enabled: !!id
  });
};

// Mutations for CRUD operations
export const useHeroCardMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (formData: Omit<HeroCard, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('hero_cards')
        .insert([formData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hero-cards'] });
      toast.success('Hero card created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create hero card: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...formData }: Partial<HeroCard> & { id: string }) => {
      const { data, error } = await supabase
        .from('hero_cards')
        .update({ ...formData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hero-cards'] });
      toast.success('Hero card updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update hero card: ${error.message}`);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('hero_cards')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hero-cards'] });
      toast.success('Hero card deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete hero card: ${error.message}`);
    }
  });

  const toggleVisibilityMutation = useMutation({
    mutationFn: async ({ id, is_visible }: { id: string; is_visible: boolean }) => {
      const { error } = await supabase
        .from('hero_cards')
        .update({ is_visible, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hero-cards'] });
      toast.success('Visibility updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update visibility: ${error.message}`);
    }
  });

  return {
    createCard: createMutation.mutateAsync,
    updateCard: updateMutation.mutateAsync,
    deleteCard: deleteMutation.mutateAsync,
    toggleVisibility: toggleVisibilityMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
};
