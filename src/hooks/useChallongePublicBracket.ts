
import { useQuery } from '@tanstack/react-query';
import { ChallongeService } from '@/services/ChallongeService';
import { useChallongeBracket } from './useChallongeBracket';

export function useChallongePublicBracket(tournamentId: number) {
  const matches = useChallongeBracket(tournamentId);
  
  const { data: participants } = useQuery({
    queryKey: ['participants', tournamentId],
    queryFn: () => ChallongeService.getParticipants(tournamentId.toString()),
    enabled: !!tournamentId
  });
  
  return { 
    matches: matches.matches, 
    participants, 
    isLoading: matches.isLoading 
  };
}
