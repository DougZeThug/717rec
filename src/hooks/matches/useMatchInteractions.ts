
import { useMatchComments } from './useMatchComments';
import { useMatchReactions } from './useMatchReactions';

// Combined hook to manage both comments and reactions
export const useMatchInteractions = (matchId: string) => {
  const comments = useMatchComments(matchId);
  const reactions = useMatchReactions(matchId);
  
  return {
    comments,
    reactions
  };
};
