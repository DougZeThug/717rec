import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useActiveSeason } from "./useSeasons";
import { errorLog } from "@/utils/logger";

export type ParticipationStatus = 'PLAYING' | 'NOT_PLAYING';

export interface SeasonParticipation {
  id: string;
  season_id: string;
  team_id: string;
  status: ParticipationStatus;
  submitted_by: string | null;
  submitted_by_name: string | null;
  created_at: string;
  updated_at: string;
}

// Get the confirmation season (active season with confirmation_open = true)
export const useConfirmationSeason = () => {
  return useQuery({
    queryKey: ['seasons', 'confirmation'],
    queryFn: async () => {
      // First try to find an active season with confirmation open
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .eq('confirmation_open', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        errorLog('Error fetching confirmation season:', error);
        throw error;
      }

      return data;
    },
  });
};

// Get participation status for a specific team
export const useTeamParticipation = (seasonId: string | undefined, teamId: string | undefined) => {
  return useQuery({
    queryKey: ['season-participation', seasonId, teamId],
    queryFn: async () => {
      if (!seasonId || !teamId) return null;

      const { data, error } = await supabase
        .from('season_team_participation')
        .select('*')
        .eq('season_id', seasonId)
        .eq('team_id', teamId)
        .maybeSingle();

      if (error) {
        errorLog('Error fetching participation:', error);
        throw error;
      }

      return data as SeasonParticipation | null;
    },
    enabled: !!seasonId && !!teamId,
  });
};

// Get all participations for a season (admin use)
export const useSeasonParticipations = (seasonId: string | undefined) => {
  return useQuery({
    queryKey: ['season-participations', seasonId],
    queryFn: async () => {
      if (!seasonId) return [];

      const { data, error } = await supabase
        .from('season_team_participation')
        .select('*')
        .eq('season_id', seasonId);

      if (error) {
        errorLog('Error fetching participations:', error);
        throw error;
      }

      return data as SeasonParticipation[];
    },
    enabled: !!seasonId,
  });
};

// Submit/update participation
export const useSubmitParticipation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      seasonId,
      teamId,
      status,
      submittedByName,
    }: {
      seasonId: string;
      teamId: string;
      status: ParticipationStatus;
      submittedByName?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('season_team_participation')
        .upsert({
          season_id: seasonId,
          team_id: teamId,
          status,
          submitted_by: user?.id ?? null,
          submitted_by_name: submittedByName ?? null,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'season_id,team_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['season-participation', variables.seasonId, variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['season-participations', variables.seasonId] });
      toast({
        title: 'Saved',
        description: 'Your participation status has been recorded.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to save: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};
