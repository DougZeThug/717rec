import { useState } from 'react';

import { PlayoffMatch } from '@/types';

import { GameData } from '../types';

export const useMatchScoreState = (match: PlayoffMatch) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [games, setGames] = useState<GameData[]>(
    match.games && match.games.length > 0
      ? match.games.map((game) => ({
          team1Score: game.team1Score,
          team2Score: game.team2Score,
        }))
      : [{ team1Score: 0, team2Score: 0 }]
  );

  return {
    isSubmitting,
    setIsSubmitting,
    validationError,
    setValidationError,
    games,
    setGames,
  };
};
