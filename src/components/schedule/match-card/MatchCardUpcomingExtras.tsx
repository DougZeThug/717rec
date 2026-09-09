import React from 'react';

import type { PredictionResult } from '@/utils/predictions';

import MatchCountdown from '../MatchCountdown';
import { MatchPrediction } from '../MatchPrediction';

interface MatchCardUpcomingExtrasProps {
  isCompleted: boolean;
  matchDate?: string;
  prediction: PredictionResult | null;
  team1Name: string;
  team2Name: string;
}

/**
 * The countdown and the win-probability bar.
 *
 * Both are about a match still to come, so a finished one renders neither.
 */
export const MatchCardUpcomingExtras: React.FC<MatchCardUpcomingExtrasProps> = ({
  isCompleted,
  matchDate,
  prediction,
  team1Name,
  team2Name,
}) => {
  if (isCompleted) return null;

  return (
    <>
      {matchDate && (
        <div className="mt-1.5">
          <MatchCountdown matchDate={matchDate} />
        </div>
      )}
      {prediction && (
        <div className="mt-1.5">
          <MatchPrediction prediction={prediction} team1Name={team1Name} team2Name={team2Name} />
        </div>
      )}
    </>
  );
};
