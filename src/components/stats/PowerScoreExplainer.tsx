import React from 'react';

import { usePowerScoreWeights } from '@/hooks/usePowerScoreWeights';

/**
 * The plain-language description of the three standings numbers, carrying the
 * live weights. Shared by the help page and the info popover on /stats so the
 * two can never drift apart.
 */
export const PowerScoreExplainer: React.FC = () => {
  const weights = usePowerScoreWeights();

  return (
    <ul className="list-disc pl-5 space-y-2">
      <li>
        <strong>Power Score:</strong> A 0-100 rating built from three parts &mdash; {weights.win}%
        match win rate, {weights.sos}% strength of schedule, and {weights.game}% game win rate. Wins
        and games are weighted by the division of the opponent you played, so beating a stronger
        team is worth more than beating a weaker one.
      </li>
      <li>
        <strong>SOS (Strength of Schedule):</strong> The average division strength of the opponents
        you have faced. A harder schedule raises your Power Score, which is why two teams with the
        same record can be ranked differently.
      </li>
      <li>
        <strong>Game Differential:</strong> Total games won minus games lost.
      </li>
    </ul>
  );
};
