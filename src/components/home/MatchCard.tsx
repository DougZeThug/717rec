import React from 'react';
import { Link } from 'react-router';

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

const MatchCard: React.FC<MatchCardProps> = ({ match, team1, team2, formatDate, formatTime }) => {
  // Always render logos as square
  const SquareLogo = ({
    src,
    alt,
    fallback,
  }: {
    src?: string | null;
    alt: string;
    fallback: string;
  }) => (
    <div className="w-10 h-10 flex items-center justify-center bg-gray-200">
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="w-10 h-10 object-contain rounded-none"
          onError={(e) => {
            imageErrorLog(alt, src);
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=300&h=300&fit=crop';
          }}
        />
      ) : (
        <div className="w-10 h-10 flex items-center justify-center bg-gray-200 text-gray-400">
          <span className="text-xs">{fallback}</span>
        </div>
      )}
    </div>
  );

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
          <div className="flex justify-between text-sm text-gray-600 mt-4">
            <div>
              <p>
                <strong>Date:</strong> {formatDate(match.date!)}
              </p>
              <p>
                <strong>Time:</strong> {formatTime(match.date!)}
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
