import React from 'react';

import type { PlayoffMatch, Team } from '@/types';

import PlayoffMatchCard from './match-card/PlayoffMatchCard';

interface MatchCardProps {
  match: PlayoffMatch;
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
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
  isUpdated,
}) => {
  return (
    <PlayoffMatchCard
      match={match}
      teams={teams}
      onEditMatch={onEditMatch}
      isUpdated={isUpdated}
    />
  );
};

export default MatchCard;
