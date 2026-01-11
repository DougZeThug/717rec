import { useCallback } from 'react';

interface UseMatchCardInteractionsProps {
  matchId: string;
  hasBothTeams: boolean;
  onEditMatch?: (matchId: string) => void;
}

export const useMatchCardInteractions = ({
  matchId,
  hasBothTeams,
  onEditMatch,
}: UseMatchCardInteractionsProps) => {
  const handleCardClick = useCallback(() => {
    if (onEditMatch && hasBothTeams) {
      onEditMatch(matchId);
    }
  }, [matchId, hasBothTeams, onEditMatch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (onEditMatch && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleCardClick();
      }
    },
    [onEditMatch, handleCardClick]
  );

  return {
    handleCardClick,
    handleKeyDown,
    isInteractive: !!onEditMatch,
  };
};
