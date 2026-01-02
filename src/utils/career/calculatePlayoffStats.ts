
import { PlayoffMatchData, PlayoffStatsResult } from './types';

interface PlayoffStatsInput {
  playoffMatches: PlayoffMatchData[] | null;
  bracketDivisionWeights: Record<string, number>;
  teamId: string;
}

/**
 * Calculates playoff statistics including wins, losses, and competitive division wins.
 * Competitive divisions are those with weight >= 0.89.
 */
export const calculatePlayoffStats = ({
  playoffMatches,
  bracketDivisionWeights,
  teamId
}: PlayoffStatsInput): PlayoffStatsResult => {
  let career_playoff_wins = 0;
  let career_playoff_losses = 0;
  let competitive_playoff_wins = 0;

  if (!playoffMatches) {
    return {
      career_playoff_wins,
      career_playoff_losses,
      competitive_playoff_wins
    };
  }

  for (const match of playoffMatches) {
    const bracketDivisionWeight = bracketDivisionWeights[match.bracket_id || ''] || 0.85;
    const isCompetitiveDivision = bracketDivisionWeight >= 0.89;
    
    if (match.winner_id === teamId) {
      career_playoff_wins++;
      if (isCompetitiveDivision) {
        competitive_playoff_wins++;
      }
    } else if (match.loser_id === teamId) {
      career_playoff_losses++;
    }
  }

  return {
    career_playoff_wins,
    career_playoff_losses,
    competitive_playoff_wins
  };
};
