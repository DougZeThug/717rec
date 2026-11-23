import { DEFAULT_DIVISION_WEIGHT } from '@/utils/rankingUtils/defaultDivisionWeight';
import { COMPETITIVE_PLAYOFF_MIN_WEIGHT } from '@/utils/rankingUtils/playoffTierCutoffs';

import { PlayoffMatchData, PlayoffStatsResult } from './types';

interface PlayoffStatsInput {
  playoffMatches: PlayoffMatchData[] | null;
  bracketDivisionWeights: Record<string, number>;
  teamId: string;
}

/**
 * Calculates playoff statistics including wins, losses, and competitive division wins.
 * Competitive divisions are those with weight >= COMPETITIVE_PLAYOFF_MIN_WEIGHT (0.89).
 */
export const calculatePlayoffStats = ({
  playoffMatches,
  bracketDivisionWeights,
  teamId,
}: PlayoffStatsInput): PlayoffStatsResult => {
  let career_playoff_wins = 0;
  let career_playoff_losses = 0;
  let competitive_playoff_wins = 0;

  if (!playoffMatches) {
    return {
      career_playoff_wins,
      career_playoff_losses,
      competitive_playoff_wins,
    };
  }

  for (const match of playoffMatches) {
    // `||` turns a stored 0 into 0.85. The Team page uses `??` (keeps 0). Do not unify.
    const bracketDivisionWeight =
      bracketDivisionWeights[match.bracket_id || ''] || DEFAULT_DIVISION_WEIGHT;
    const isCompetitiveDivision = bracketDivisionWeight >= COMPETITIVE_PLAYOFF_MIN_WEIGHT;

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
    competitive_playoff_wins,
  };
};
