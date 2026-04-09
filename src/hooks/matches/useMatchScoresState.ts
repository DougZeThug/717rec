import { useState, useCallback } from 'react';

import { Match } from '@/types';

export function useMatchScoresState(matches: Match[] = []) {
  const [scores, setScores] = useState<Record<string, { team1Score: string; team2Score: string }>>(
    {}
  );

  const initializeScores = useCallback((newMatches: Match[]) => {
    const initialScores: Record<string, { team1Score: string; team2Score: string }> = {};

    newMatches.forEach((match) => {
      initialScores[match.id] = {
        team1Score: match.team1Score?.toString() || '',
        team2Score: match.team2Score?.toString() || '',
      };
    });

    setScores(initialScores);
  }, []);

  const handleScoreChange = (
    matchId: string,
    scoreField: 'team1Score' | 'team2Score',
    value: string
  ) => {
    setScores((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [scoreField]: value,
      },
    }));
  };

  // Initialize on first load
  if (matches.length > 0 && Object.keys(scores).length === 0) {
    initializeScores(matches);
  }

  return { scores, initializeScores, handleScoreChange };
}
