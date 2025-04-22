import React from 'react';
import { Match } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { TransitionLink } from '@/components/transitions/TransitionLink';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface MatchCardProps {
  match: Match;
  opponentId: string;
  isPastMatch?: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, opponentId, isPastMatch = false }) => {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No date";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch (e) {
      return "Invalid date";
    }
  };

  const opponent = match.team1Id === opponentId ? match.team1Details : match.team2Details;
  const opponentName = opponent?.name || "Unknown Team";
  const opponentImage = opponent?.image_url || opponent?.logo_url;
  
  const isTeam1 = match.team1Id === opponentId;
  const teamGameWins = isTeam1 ? match.team2_game_wins : match.team1_game_wins;
  const opponentGameWins = isTeam1 ? match.team1_game_wins : match.team2_game_wins;
  
  const hasGameScores = teamGameWins !== undefined && opponentGameWins !== undefined;
  const gameScoreDisplay = hasGameScores ? `${teamGameWins}-${opponentGameWins}` : '';

  console.log("Match data:", {
    id: match.id,
    team1Id: match.team1Id,
    team2Id: match.team2Id,
    isTeam1,
    team1GameWins: match.team1_game_wins,
    team2GameWins: match.team2_game_wins,
    teamGameWins,
    opponentGameWins,
    hasGameScores,
    gameScoreDisplay
  });

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <TransitionLink 
              to={`/teams/${opponentId}`}
              className="hover:opacity-80 transition-opacity"
            >
              <div className="h-12 w-12 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {opponentImage ? (
                  <img
                    src={opponentImage}
                    alt={opponentName}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=300&h=300&fit=crop';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    {opponentName.charAt(0)}
                  </div>
                )}
              </div>
            </TransitionLink>
            <TransitionLink
              to={`/teams/${opponentId}`}
              className="hover:underline"
            >
              <h3 className="font-medium">{opponentName}</h3>
            </TransitionLink>
          </div>
          <div className="text-right">
            {match.iscompleted && (
              <div className="space-y-1">
                <div className="text-lg font-semibold">
                  {match.team1Id === opponentId ? (
                    `${match.team2Score || 0} - ${match.team1Score || 0}`
                  ) : (
                    `${match.team1Score || 0} - ${match.team2Score || 0}`
                  )}
                </div>
                {hasGameScores && (
                  <div className="text-sm text-muted-foreground">
                    Games: {gameScoreDisplay}
                  </div>
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
