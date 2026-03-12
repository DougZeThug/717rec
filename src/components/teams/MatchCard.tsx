import React from 'react';

import { TransitionLink } from '@/components/transitions/TransitionLink';
import { Card, CardContent } from '@/components/ui/card';
import { Match } from '@/types';
import { toTeamSlug } from '@/utils/teamSlug';

interface MatchCardProps {
  match: Match;
  opponentId: string;
  isPastMatch?: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, opponentId, isPastMatch: _isPastMatch = false }) => {
  const _formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No date';
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch (_e) {
      return 'Invalid date';
    }
  };

  const opponent = match.team1Id === opponentId ? match.team1Details : match.team2Details;
  const opponentName = opponent?.name || 'Unknown Team';
  const opponentImage = opponent?.image_url || opponent?.logo_url;

  const isTeam1 = match.team1Id === opponentId;
  const teamGameWins = isTeam1 ? match.team2_game_wins : match.team1_game_wins;
  const opponentGameWins = isTeam1 ? match.team1_game_wins : match.team2_game_wins;

  const hasGameScores = teamGameWins !== undefined && opponentGameWins !== undefined;
  const gameScoreDisplay = hasGameScores ? `${teamGameWins}-${opponentGameWins}` : '';

  const SquareLogo = ({ src, alt, fallback }: { src: string; alt: string; fallback: string }) => (
    <div className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800">
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-10 h-10 object-contain rounded-none"
          draggable={false}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <div className="w-10 h-10 flex items-center justify-center bg-gray-200 text-gray-400 text-xs rounded-none">
          {fallback}
        </div>
      )}
    </div>
  );

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <TransitionLink
              to={`/teams/${toTeamSlug(opponentName)}`}
              className="hover:opacity-80 transition-opacity"
            >
              <SquareLogo
                src={opponentImage}
                alt={opponentName}
                fallback={opponentName.charAt(0)}
              />
            </TransitionLink>
            <TransitionLink to={`/teams/${toTeamSlug(opponentName)}`} className="hover:underline">
              <h3 className="font-bebas uppercase tracking-wide font-normal m-0">{opponentName}</h3>
            </TransitionLink>
          </div>
          <div className="text-right">
            {match.iscompleted && (
              <div className="space-y-1">
                <div className="text-lg font-semibold">
                  {match.team1Id === opponentId
                    ? `${match.team2Score || 0} - ${match.team1Score || 0}`
                    : `${match.team1Score || 0} - ${match.team2Score || 0}`}
                </div>
                {hasGameScores && (
                  <div className="text-sm text-muted-foreground">Games: {gameScoreDisplay}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchCard;
