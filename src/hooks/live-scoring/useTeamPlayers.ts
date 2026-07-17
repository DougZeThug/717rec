import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/hooks/useToast';
import { TeamPlayersService } from '@/services/liveScoring/TeamPlayersService';
import { getUIErrorMessage } from '@/utils/errorHandler';

import { liveScoringKeys } from './liveScoringKeys';

export function useTeamPlayers(teamId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: liveScoringKeys.teamPlayers(teamId ?? ''),
    queryFn: () => {
      if (!teamId) throw new Error('Team id is required');
      return TeamPlayersService.fetchTeamPlayers(teamId);
    },
    enabled: Boolean(teamId),
    staleTime: 5 * 60 * 1000,
  });

  const addPlayer = useMutation({
    mutationFn: (displayName: string) => {
      if (!teamId) throw new Error('Team id is required');
      return TeamPlayersService.addTeamPlayer(teamId, displayName);
    },
    onSuccess: (player) => {
      toast({ title: 'Player added', description: `${player.display_name} joined the roster.` });
      queryClient.invalidateQueries({ queryKey: liveScoringKeys.teamPlayers(player.team_id) });
    },
    onError: (error) => {
      toast({
        title: 'Could not add player',
        description: getUIErrorMessage(error),
        variant: 'destructive',
      });
    },
  });

  return { players: query.data ?? [], isLoading: query.isLoading, error: query.error, addPlayer };
}
