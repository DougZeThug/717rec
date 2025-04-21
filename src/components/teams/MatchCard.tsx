
import React from 'react';
import { Match } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { TransitionLink } from '@/components/transitions/TransitionLink';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

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

  // Get opponent details by checking which team ID matches the opponentId
  const opponent = match.team1Id === opponentId ? match.team1Details : match.team2Details;
  const opponentName = opponent?.name || "Unknown Team";
  const opponentImage = opponent?.image_url || opponent?.logo_url;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <TransitionLink 
              to={`/teams/${opponentId}`}
              className="hover:opacity-80 transition-opacity"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={opponentImage || ''} alt={opponentName} />
                <AvatarFallback>
                  {opponentName.charAt(0)}
                </AvatarFallback>
              </Avatar>
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
              <div className="text-lg font-semibold">
                {match.team1Id === opponentId ? (
                  `${match.team2Score || 0} - ${match.team1Score || 0}`
                ) : (
                  `${match.team1Score || 0} - ${match.team2Score || 0}`
                )}
              </div>
            )}
            {match.team1_game_wins !== undefined && match.team2_game_wins !== undefined && (
              <div className="text-sm text-gray-600">
                Games: {match.team1Id === opponentId ? (
                  `${match.team2_game_wins}-${match.team1_game_wins}`
                ) : (
                  `${match.team1_game_wins}-${match.team2_game_wins}`
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
