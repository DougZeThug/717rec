
import React from "react";
import { Match } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Clock, MapPin } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

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
  
  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "No time set";
    try {
      return format(parseISO(dateStr), "h:mm a");
    } catch (e) {
      console.error("Time parsing error:", e);
      return "Invalid time";
    }
  };

  // Get team names with fallbacks
  const team1Name = match.team1Details?.name || "Unknown Team";
  const team2Name = match.team2Details?.name || "Unknown Team";
  
  // Determine winner/loser for styling
  const team1IsWinner = isCompleted && match.team1Score !== undefined && match.team2Score !== undefined && match.team1Score > match.team2Score;
  const team2IsWinner = isCompleted && match.team1Score !== undefined && match.team2Score !== undefined && match.team2Score > match.team1Score;
  
  return (
    <Card className={cn(
      "overflow-hidden font-inter border transition-shadow hover:shadow-md",
      isLight 
        ? "bg-white border-gray-200 shadow-sm" 
        : "bg-gray-800/50 border-gray-700"
    )}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <span className={cn(
            "text-sm font-medium",
            isLight ? "text-gray-700" : "text-gray-300"
          )}>
            Match
          </span>
          {isCompleted && (
            <Badge variant="success" className="text-xs">
              Completed
            </Badge>
          )}
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
                <AvatarFallback className={cn(
                  "font-semibold",
                  isLight ? "bg-gray-100 text-gray-800" : "bg-gray-700 text-gray-200"
                )}>
                  {team1Name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="mt-2 text-center">
                <span className={cn(
                  "font-medium",
                  isLight 
                    ? team1IsWinner ? "text-green-700" : "text-gray-900"
                    : team1IsWinner ? "text-green-400" : "text-gray-300"
                )}>
                  {team1Name}
                </span>
              </div>
            </div>
            
            <div className={cn(
              "text-xl font-bold mx-4",
              isLight ? "text-gray-700" : "text-gray-300"
            )}>
              {isCompleted 
                ? `${match.team1Score || 0} - ${match.team2Score || 0}`
                : "vs"
              }
            </div>
            
            <div className="flex flex-col items-center w-1/3">
              <Avatar className="w-16 h-16 border shadow-sm">
                <AvatarImage 
                  src={match.team2Details?.image_url || '/placeholder.svg'}
                  alt={team2Name}
                />
                <AvatarFallback className={cn(
                  "font-semibold",
                  isLight ? "bg-gray-100 text-gray-800" : "bg-gray-700 text-gray-200"
                )}>
                  {team2Name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="mt-2 text-center">
                <span className={cn(
                  "font-medium",
                  isLight 
                    ? team2IsWinner ? "text-green-700" : "text-gray-900"
                    : team2IsWinner ? "text-green-400" : "text-gray-300"
                )}>
                  {team2Name}
                </span>
              </div>
            </div>
          </div>
          
          {isCompleted && match.team1_game_wins !== undefined && match.team2_game_wins !== undefined && (
            <div className={cn(
              "p-2 rounded text-center text-sm",
              isLight ? "bg-gray-100 text-gray-800" : "bg-gray-800 text-gray-300"
            )}>
              Game Wins: {team1Name} ({match.team1_game_wins}) - {team2Name} ({match.team2_game_wins})
            </div>
          )}
          
          <div className={cn(
            "flex items-center text-sm",
            isLight ? "text-gray-700" : "text-gray-400"
          )}>
            <Clock className="h-4 w-4 mr-1" />
            <span>{formatTime(match.date)}</span>
          </div>
          
          {match.location && (
            <div className={cn(
              "flex items-center text-sm",
              isLight ? "text-gray-700" : "text-gray-400"
            )}>
              <MapPin className="h-4 w-4 mr-1" />
              <span>{match.location}</span>
            </div>
          )}
        </div>
      </CardContent>
      
      {!isCompleted && onEdit && onDelete && (
        <CardFooter className={cn(
          "pt-2 border-t flex justify-end space-x-2",
          isLight ? "bg-gray-50 border-gray-100" : "bg-gray-800/50 border-gray-700"
        )}>
          <Button variant="ghost" size="sm" onClick={() => onEdit(match)}>
            <Edit className="h-4 w-4 mr-1" /> Edit
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onDelete(match.id)}
            className={isLight ? "text-red-600 hover:text-red-700 hover:bg-red-50" : "text-red-500 hover:text-red-400"}
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default MatchCard;
