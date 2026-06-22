import React from 'react';
import { Link } from 'react-router';

import { FALLBACK_TEAM_IMAGE } from '@/constants/images';
import { getCardInteractionStyles } from '@/styles/interactionUtils';
import { Match, Team } from '@/types';
import { imageErrorLog } from '@/utils/logger';

interface MatchCardProps {
  match: Match;
  team1: Team;
  team2: Team;
  formatDate: (dateString: string) => string;
  formatTime: (dateString: string) => string;
}

// Module-scope component so React keeps a stable component identity across
// renders of MatchCard (avoids unmount/remount on every parent render).
const SquareLogo: React.FC<{
  src?: string | null;
  alt: string;
  fallback: string;
}> = ({ src, alt, fallback }) => (
  <div className="size-10 flex items-center justify-center bg-gray-200">
    {src ? (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="size-10 object-contain rounded-none"
        onError={(e) => {
          imageErrorLog(alt, src);
          (e.target as HTMLImageElement).src = FALLBACK_TEAM_IMAGE;
        }}
      />
    ) : (
      <div className="size-10 flex items-center justify-center bg-gray-200 text-muted-foreground">
        <span className="text-xs">{fallback}</span>
      </div>
    )}
  </div>
);

const MatchCard: React.FC<MatchCardProps> = ({ match, team1, team2, formatDate, formatTime }) => {
  const matchDate = match.date;

  return (
    <Link to={`/schedule?matchId=${match.id}`} className="block">
      <div
        className={getCardInteractionStyles(
          'bg-white rounded-lg shadow-md overflow-hidden transform transition-all duration-200'
        )}
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <SquareLogo src={team1?.imageUrl} alt={team1.name} fallback="No Logo" />
              <span className="ml-3 font-medium">{team1.name}</span>
            </div>
            <span className="text-lg font-bold mx-2">VS</span>
            <div className="flex items-center">
              <span className="mr-3 font-medium">{team2.name}</span>
              <SquareLogo src={team2?.imageUrl} alt={team2.name} fallback="No Logo" />
            </div>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground mt-4">
            <div>
              <p>
                <strong>Date:</strong> {matchDate ? formatDate(matchDate) : 'TBD'}
              </p>
              <p>
                <strong>Time:</strong> {matchDate ? formatTime(matchDate) : 'TBD'}
              </p>
            </div>
            <div className="text-right">
              <p>
                <strong>Score:</strong>
              </p>
              <p>
                {match.team1Score} - {match.team2Score}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default MatchCard;
