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
      // Use atomic RPC function to prevent leaving zero active seasons on failure
      const { data: season, error } = await supabase.rpc('activate_season', {
        season_id: seasonId,
      });

      if (error) throw error;
      return season;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
    },
  });

  const archiveSeason = useMutation({
    mutationFn: async ({ id }: ArchiveSeasonData) => {
      const { data: season, error } = await supabase.rpc('archive_season', {
        p_season_id: id,
        p_champion_team_id: null,
        p_runner_up_team_id: null,
        p_third_place_team_id: null,
      });

      if (error) throw error;
      return season;
    },
    onSuccess: () => {
      // Broad invalidation since archival touches matches, stats, rankings, etc.
      queryClient.invalidateQueries({ queryKey: ['seasons'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
      queryClient.invalidateQueries({ queryKey: ['v_team_details'] });
      queryClient.invalidateQueries({ queryKey: ['teamStats'] });
      queryClient.invalidateQueries({ queryKey: ['standings'] });
      queryClient.invalidateQueries({ queryKey: ['careerRankings'] });
      queryClient.invalidateQueries({ queryKey: ['bracket-data'] });
      queryClient.invalidateQueries({ queryKey: ['playoff-matches'] });
    },
  });

  return {
    createSeason,
    updateSeason,
    activateSeason,
    archiveSeason,
  };
};
