
import React from 'react';
import { Match } from '@/types';
import { format, parseISO } from 'date-fns';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

interface MatchCardProps {
  match: Match;
  opponentId: string;
  isPastMatch?: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, opponentId, isPastMatch = false }) => {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No date";
    try {
      return format(parseISO(dateStr), "MMM d, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };

  // Fix: Use team2Details when team1Id matches opponentId, and vice versa
  const opponentDetails = match.team1Id === opponentId ? match.team2Details : match.team1Details;
  const opponentName = opponentDetails?.name || "Unknown Opponent";
  const opponentImage = opponentDetails?.image_url || opponentDetails?.logo_url;

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={opponentImage || ''} alt={opponentName} />
              <AvatarFallback>
                {opponentName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-medium">{opponentName}</h3>
              <p className="text-sm text-gray-500">{formatDate(match.date)}</p>
            </div>
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
