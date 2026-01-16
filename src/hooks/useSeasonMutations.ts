import { useMutation, useQueryClient } from '@tanstack/react-query';

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
    },
  });

  const activateSeason = useMutation({
    mutationFn: async (seasonId: string) => {
      // First, deactivate all other seasons
      const { error: deactivateError } = await supabase
        .from('seasons')
        .update({ is_active: false })
        .neq('id', seasonId);

      if (deactivateError) throw deactivateError;

      // Then, activate the selected season
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
    },
  });

  return {
    createSeason,
    updateSeason,
    activateSeason,
    archiveSeason,
  };
};
