import { useCallback } from 'react';

import { GameData } from '../types';
import { canAddMoreGames } from '../utils/scoreUtils';

interface UseGameManagementProps {
  games: GameData[];
  setGames: React.Dispatch<React.SetStateAction<GameData[]>>;
  validateGameScores: () => boolean;
  maxGames: number;
}

export const useGameManagement = ({
  games,
  setGames,
  validateGameScores,
  maxGames,
}: UseGameManagementProps) => {
  const handleGameScoreChange = useCallback(
    (index: number, team: 1 | 2, score: number) => {
      const newGames = [...games];
      if (team === 1) {
        newGames[index].team1Score = score;
      } else {
        newGames[index].team2Score = score;
      }
      setGames(newGames);
      validateGameScores();
    },
    [games, setGames, validateGameScores]
  );

  const addGame = useCallback(() => {
    if (!canAddMoreGames(games, maxGames)) return;
    setGames((prev) => [...prev, { team1Score: 0, team2Score: 0 }]);
  }, [games, maxGames, setGames]);

  const removeGame = useCallback(
    (index: number) => {
      if (games.length <= 1) return;
      setGames((prev) => {
        const newGames = [...prev];
        newGames.splice(index, 1);
        return newGames;
      });
      validateGameScores();
    },
    [games.length, setGames, validateGameScores]
  );

  return {
    handleGameScoreChange,
    addGame,
    removeGame,
    canAddGames: canAddMoreGames(games, maxGames),
  };
};
