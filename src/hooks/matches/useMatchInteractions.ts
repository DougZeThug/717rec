
import { useMatchComments } from './useMatchComments';
import { useMatchReactions } from './useMatchReactions';
import { useTeamMembership } from '@/hooks/useTeamMembership';

// Combined hook to manage both comments and reactions
export const useMatchInteractions = (matchId: string) => {
  const comments = useMatchComments(matchId);
  const reactions = useMatchReactions(matchId);
  const { membership } = useTeamMembership();
  
  return {
    comments,
    reactions,
    currentUserTeam: membership?.team
  };
};
