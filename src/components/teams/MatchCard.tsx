
import React from 'react';
import { Match } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { TransitionLink } from '@/components/transitions/TransitionLink';

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
  
  // Determine game scores based on perspective
  const isTeam1 = match.team1Id === opponentId;
  const teamGameWins = isTeam1 ? match.team2_game_wins : match.team1_game_wins;
  const opponentGameWins = isTeam1 ? match.team1_game_wins : match.team2_game_wins;
  
  // Format game score display
  const hasGameScores = teamGameWins !== undefined && opponentGameWins !== undefined;
  const gameScoreDisplay = hasGameScores ? `${teamGameWins}-${opponentGameWins}` : '';

  // For debugging
  // console.log("Match data:", {
  //   id: match.id,
  //   team1Id: match.team1Id,
  //   team2Id: match.team2Id,
  //   isTeam1,
  //   team1GameWins: match.team1_game_wins,
  //   team2GameWins: match.team2_game_wins,
  //   teamGameWins,
  //   opponentGameWins,
  //   hasGameScores,
  //   gameScoreDisplay
  // });

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <TransitionLink 
              to={`/teams/${opponentId}`}
              className="hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                {opponentImage ? (
                  <img
                    src={opponentImage}
                    alt={opponentName}
                    className="w-10 h-10 object-contain rounded-none"
                  />
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center bg-gray-200 text-gray-400">
                    <span className="text-xs">{opponentName.charAt(0)}</span>
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
