import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreateSeasonData {
  name: string;
  start_date: string;
  end_date?: string | null;
}

interface UpdateSeasonData extends CreateSeasonData {
  id: string;
}

interface ArchiveSeasonData {
  id: string;
  champion_team_id?: string | null;
  runner_up_team_id?: string | null;
  third_place_team_id?: string | null;
}

export const useSeasonMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createSeason = useMutation({
    mutationFn: async (data: CreateSeasonData) => {
      const { data: season, error } = await supabase
        .from('seasons')
        .insert([data])
        .select()
        .single();

      if (error) throw error;
      return season;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast({
        title: 'Success',
        description: 'Season created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create season: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const updateSeason = useMutation({
    mutationFn: async ({ id, ...data }: UpdateSeasonData) => {
      const { data: season, error } = await supabase
        .from('seasons')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return season;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast({
        title: 'Success',
        description: 'Season updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update season: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const activateSeason = useMutation({
    mutationFn: async (seasonId: string) => {
      const { data: season, error } = await supabase
        .from('seasons')
        .update({ is_active: true })
        .eq('id', seasonId)
        .select()
        .single();

      if (error) throw error;
      return season;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast({
        title: 'Success',
        description: 'Season activated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to activate season: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const archiveSeason = useMutation({
    mutationFn: async ({ id, ...championData }: ArchiveSeasonData) => {
      const { data: season, error } = await supabase
        .from('seasons')
        .update({
          is_active: false,
          is_archived: true,
          ...championData,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return season;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      toast({
        title: 'Success',
        description: 'Season archived successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to archive season: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  return {
    createSeason,
    updateSeason,
    activateSeason,
    archiveSeason,
  };
};
