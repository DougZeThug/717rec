
import { useQuery } from '@tanstack/react-query';
import { ChallongeService } from '@/services/ChallongeService';
import { useChallongeBracket } from './useChallongeBracket';

export function useChallongePublicBracket(tournamentId: number | string) {
  const id = Number(tournamentId);
  const matches = useChallongeBracket(id);
  
  const { data: participants } = useQuery({
    queryKey: ['participants', id],
    queryFn: () => ChallongeService.getParticipants(id.toString()),
    enabled: !!id
  });
  
  return { 
    matches: matches.matches, 
    participants, 
    isLoading: matches.isLoading 
  };
}
