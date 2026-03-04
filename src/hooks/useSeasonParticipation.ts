import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useToast } from '@/hooks/useToast';
import {
  SeasonParticipation,
  SeasonService,
  ParticipationStatus,
} from '@/services/SeasonService';

export type { ParticipationStatus, SeasonParticipation };

// Get the confirmation season (active season with confirmation_open = true)
export const useConfirmationSeason = () => {
  return useQuery({
    queryKey: ['seasons', 'confirmation'],
    queryFn: SeasonService.fetchConfirmationSeason,
  });
};

// Get participation status for a specific team
export const useTeamParticipation = (seasonId: string | undefined, teamId: string | undefined) => {
  return useQuery({
    queryKey: ['season-participation', seasonId, teamId],
    queryFn: async () => {
      if (!seasonId || !teamId) return null;
      return SeasonService.fetchTeamParticipation(seasonId, teamId);
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
      return SeasonService.fetchSeasonParticipations(seasonId);
    },
    enabled: !!seasonId,
  });
};

// Submit/update participation
export const useSubmitParticipation = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: SeasonService.submitParticipation,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['season-participation', variables.seasonId, variables.teamId],
      });
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

