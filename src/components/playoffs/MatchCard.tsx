import React from 'react';

import type { PlayoffMatch, Team } from '@/types';

import PlayoffMatchCard from './match-card/PlayoffMatchCard';

interface MatchCardProps {
  match: PlayoffMatch;
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
  hasNextMatch: boolean;
  isUpdated?: boolean;
}

/**
 * MatchCard component for rendering playoff match cards
 * This is now a thin wrapper around the PlayoffMatchCard component
 */
const MatchCard: React.FC<MatchCardProps> = ({
  match,
  teams,
  onEditMatch,
  hasNextMatch,
  isUpdated,
}) => {
  return (
    <PlayoffMatchCard
      match={match}
      teams={teams}
      onEditMatch={onEditMatch}
      hasNextMatch={hasNextMatch}
      isUpdated={isUpdated}
    />
  );
};

export default MatchCard;
