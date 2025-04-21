
import React from "react";
import { Match } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, CheckCircle, MapPin, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "next-themes";

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
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "No time set";
    try {
      return format(parseISO(dateStr), "h:mm a");
    } catch (e) {
      console.error("Date parsing error:", e);
      return "Invalid time";
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
    <Card className={`overflow-hidden font-inter transition-shadow hover:shadow-md ${match.iscompleted ? (isLight ? 'bg-green-50 border-green-200' : 'bg-green-900/20 border-green-800/30') : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div className={isLight ? "text-gray-900" : "text-white"}>
            <span className="font-medium">Match</span>
          </div>
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
              <Avatar className="w-16 h-16 border shadow-sm">
                <AvatarImage 
                  src={match.team1Details?.image_url || '/placeholder.svg'}
                  alt={team1Name}
                />
                <AvatarFallback className="bg-gray-100 text-gray-800 font-semibold">
                  {team1Name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="mt-2 text-center font-medium">
                <span className={isLight ? "text-gray-700" : "text-gray-300"}>
                  {team1Name}
                </span>
              </div>
            </div>
            
            <div className={`text-xl font-bold mx-4 ${match.iscompleted ? 'text-green-600' : (isLight ? 'text-gray-700' : 'text-gray-300')}`}>
              {getScoreText()}
            </div>
            
            <div className="flex flex-col items-center w-1/3">
              <Avatar className="w-16 h-16 border shadow-sm">
                <AvatarImage 
                  src={match.team2Details?.image_url || '/placeholder.svg'}
                  alt={team2Name}
                />
                <AvatarFallback className="bg-gray-100 text-gray-800 font-semibold">
                  {team2Name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="mt-2 text-center font-medium">
                <span className={isLight ? "text-gray-700" : "text-gray-300"}>
                  {team2Name}
                </span>
              </div>
            </div>
          </div>
          
          {match.iscompleted && match.team1_game_wins !== undefined && match.team2_game_wins !== undefined && (
            <div className={`p-2 rounded text-center text-sm ${isLight ? 'bg-gray-100 text-gray-700' : 'bg-gray-800 text-gray-300'}`}>
              Game Wins: {team1Name} ({match.team1_game_wins}) - {team2Name} ({match.team2_game_wins})
            </div>
          )}
          
          <div className="flex items-center text-sm">
            <Clock className={`h-4 w-4 mr-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`} />
            <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>
              {formatDate(match.date)}
            </span>
          </div>
          
          {match.location && (
            <div className="flex items-center text-sm">
              <MapPin className={`h-4 w-4 mr-1 ${isLight ? 'text-gray-500' : 'text-gray-400'}`} />
              <span className={isLight ? 'text-gray-700' : 'text-gray-300'}>
                {match.location}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      {!isCompleted && onEdit && onDelete && (
        <CardFooter className={`pt-2 border-t flex justify-end space-x-2 ${isLight ? 'bg-gray-50' : 'bg-gray-800/50'}`}>
          <Button variant="ghost" size="sm" onClick={() => onEdit(match)}>
            <Edit className="h-4 w-4 mr-1" /> Edit
          </Button>
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(match.id)}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default MatchCard;
