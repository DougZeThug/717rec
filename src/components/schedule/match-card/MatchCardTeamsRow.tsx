import React from 'react';

import { Match } from '@/types';

import { MatchCardScore } from './MatchCardScore';
import { MatchCardTeam } from './MatchCardTeam';

interface MatchCardTeamsRowProps {
  match: Match;
  team1Name: string;
  team2Name: string;
  isCompleted: boolean;
  winners: { team1: boolean; team2: boolean };
  isAnimating: boolean;
}

/**
 * Logo — score — logo.
 *
 * A finished match shows games won; an unplayed one shows the stored points,
 * which are zero until somebody enters a result.
 */
export const MatchCardTeamsRow: React.FC<MatchCardTeamsRowProps> = ({
  match,
  team1Name,
  team2Name,
  isCompleted,
  winners,
  isAnimating,
}) => (
  <div className="flex items-center justify-center gap-2">
    <MatchCardTeam
      teamId={match.team1Id}
      teamName={team1Name}
      logoUrl={match.team1Details?.image_url || ''}
      isWinner={winners.team1}
    />
    <MatchCardScore
      team1Score={(isCompleted ? match.team1_game_wins : match.team1Score) || 0}
      team2Score={(isCompleted ? match.team2_game_wins : match.team2Score) || 0}
      team1IsWinner={winners.team1}
      team2IsWinner={winners.team2}
      isAnimating={isAnimating}
    />
    <MatchCardTeam
      teamId={match.team2Id}
      teamName={team2Name}
      logoUrl={match.team2Details?.image_url || ''}
      isWinner={winners.team2}
    />
  </div>
);
