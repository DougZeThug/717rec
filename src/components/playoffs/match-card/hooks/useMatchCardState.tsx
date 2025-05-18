
import { useMemo } from "react";
import { PlayoffMatch, Team } from "@/types";

interface UseMatchCardStateProps {
  match: PlayoffMatch;
  teams: Team[];
}

export const useMatchCardState = ({ match, teams }: UseMatchCardStateProps) => {
  const getTeamById = (id?: string | null) => {
    if (!id) return null;
    
    // Special handling for play-in placeholders
    if (id.startsWith('play-in-')) {
      return {
        id,
        name: `Winner of Play-in ${id.split('-')[2]}`,
        seed: match.team1Seed || match.team2Seed || 0
      } as Team;
    }
    
    return teams.find(team => team.id === id) || null;
  };

  const team1 = getTeamById(match.team1Id);
  const team2 = getTeamById(match.team2Id);
  const winner = getTeamById(match.winnerId);

  // Determine team seeds
  const team1Seed = match.team1Seed || (team1?.seed || 0);
  const team2Seed = match.team2Seed || (team2?.seed || 0);

  // Determine match state
  const isPending = !match.team1Id || !match.team2Id;
  const isComplete = !!match.winnerId;
  const isPlayIn = match.matchType === 'play-in' || match.matchType === 'play-in-2';
  const isResetMatch = match.matchType === 'finals' && match.round > 3;

  // Format series score for display
  const getSeriesScoreText = () => {
    if (!match.team1GameWins && !match.team2GameWins) return '';
    return `${match.team1GameWins || 0}-${match.team2GameWins || 0}`;
  };

  return {
    team1,
    team2,
    winner,
    team1Seed,
    team2Seed,
    isPending,
    isComplete,
    isPlayIn,
    isResetMatch,
    seriesScoreText: getSeriesScoreText()
  };
};
