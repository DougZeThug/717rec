
import React from "react";
import { Match } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, CheckCircle, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface MatchCardProps {
  match: Match;
  isCompleted: boolean;
  onEdit?: (match: Match) => void;
  onDelete?: (matchId: string) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ 
  match, 
  isCompleted = false, 
  onEdit, 
  onDelete 
}) => {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No date set";
    try {
      return format(parseISO(dateStr), "MMM d, yyyy 'at' h:mm a");
    } catch (e) {
      console.error("Date parsing error:", e);
      return "Invalid date";
    }
  };

  const getScoreText = () => {
    if (match.iscompleted) {
      return `${match.team1Score || 0} - ${match.team2Score || 0}`;
    }
    return "vs";
  };

  // Get team names with fallbacks
  const team1Name = match.team1Details?.name || "Unknown Team";
  const team2Name = match.team2Details?.name || "Unknown Team";
  
  return (
    <Card className={`overflow-hidden ${match.iscompleted ? 'bg-gray-50 border-green-200' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">
            {team1Name} vs {team2Name}
          </CardTitle>
          <div>
            {match.iscompleted && (
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" /> Completed
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-center items-center py-4">
            <div className="flex flex-col items-center w-1/3">
              <Avatar className="w-16 h-16">
                <AvatarImage 
                  src={match.team1Details?.image_url || '/placeholder.svg'}
                  alt={team1Name}
                />
                <AvatarFallback>
                  {team1Name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="mt-2 text-center font-medium">
                {team1Name}
              </div>
            </div>
            
            <div className={`text-xl font-bold mx-4 ${match.iscompleted ? 'text-green-600' : ''}`}>
              {getScoreText()}
            </div>
            
            <div className="flex flex-col items-center w-1/3">
              <Avatar className="w-16 h-16">
                <AvatarImage 
                  src={match.team2Details?.image_url || '/placeholder.svg'}
                  alt={team2Name}
                />
                <AvatarFallback>
                  {team2Name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="mt-2 text-center font-medium">
                {team2Name}
              </div>
            </div>
          </div>
          
          {match.iscompleted && match.team1_game_wins !== undefined && match.team2_game_wins !== undefined && (
            <div className="bg-gray-100 p-2 rounded text-center text-sm">
              Game Wins: {team1Name} ({match.team1_game_wins}) - {team2Name} ({match.team2_game_wins})
            </div>
          )}
          
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-1" />
            {formatDate(match.date)}
          </div>
          
          {match.location && (
            <div className="text-sm text-gray-500">
              Location: {match.location}
            </div>
          )}
        </div>
      </CardContent>
      {!isCompleted && (
        <CardFooter className="pt-2 border-t bg-gray-50 flex justify-end space-x-2">
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(match)}>
              <Edit className="h-4 w-4 mr-1" /> Edit
            </Button>
          )}
          {onDelete && (
            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => onDelete(match.id)}>
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
};

export default MatchCard;
