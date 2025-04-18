
import { useState } from 'react';
import { Match } from "@/types";

export const useMatchScoresState = (matches: Match[]) => {
  const [scores, setScores] = useState<Record<string, { team1Score: string, team2Score: string }>>({});

  const initializeScores = (matches: Match[]) => {
    const initialScores: Record<string, { team1Score: string, team2Score: string }> = {};
    matches.forEach(match => {
      initialScores[match.id] = { 
        team1Score: match.team1Score?.toString() || '', 
        team2Score: match.team2Score?.toString() || '' 
      };
    });
    setScores(initialScores);
  };

  const handleScoreChange = (matchId: string, team: 'team1Score' | 'team2Score', value: string) => {
    setScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team]: value
      }
    }));
  };

  return {
    scores,
    initializeScores,
    handleScoreChange
  };
};
