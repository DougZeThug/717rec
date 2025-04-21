
import React from "react";
import { Match } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

  // Get team names with fallbacks
  const team1Name = match.team1Details?.name || "Unknown Team";
  const team2Name = match.team2Details?.name || "Unknown Team";
  
  // Determine winner/loser for styling
  const team1IsWinner = isCompleted && match.team1Score !== undefined && match.team2Score !== undefined && match.team1Score > match.team2Score;
  const team2IsWinner = isCompleted && match.team1Score !== undefined && match.team2Score !== undefined && match.team2Score > match.team1Score;
  
  return (
    <Card className={cn(
      "overflow-hidden border transition-all duration-200",
      isLight 
        ? "bg-white border-gray-200 hover:shadow-md rounded-xl shadow-sm" 
        : "bg-gray-800/50 border-gray-700",
      isCompleted && "relative"
    )}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <span className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            isLight ? "text-gray-500" : "text-gray-400"
          )}>
            Match
          </span>
          {isCompleted && (
            <Badge 
              variant="success" 
              className={cn(
                "text-xs",
                isLight && "bg-green-100 text-green-800 hover:bg-green-200"
              )}
            >
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
                  "text-base font-medium",
                  isLight 
                    ? team1IsWinner ? "text-green-700 font-bold" : "text-gray-700"
                    : team1IsWinner ? "text-green-400" : "text-gray-300"
                )}>
                  {team1Name}
                </span>
              </div>
            </div>
            
            <div className={cn(
              "text-lg font-bold mx-4",
              isLight ? "text-gray-900" : "text-gray-300"
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
                  "text-base font-medium",
                  isLight 
                    ? team2IsWinner ? "text-green-700 font-bold" : "text-gray-700"
                    : team2IsWinner ? "text-green-400" : "text-gray-300"
                )}>
                  {team2Name}
                </span>
              </div>
            </div>
          </div>
          
          {isCompleted && match.team1_game_wins !== undefined && match.team2_game_wins !== undefined && (
            <div className={cn(
              "rounded-md px-3 py-1 text-sm text-center mt-2",
              isLight ? "bg-gray-100 text-gray-800" : "bg-gray-800 text-gray-300"
            )}>
              Game Wins: {team1Name} ({match.team1_game_wins}) - {team2Name} ({match.team2_game_wins})
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchCard;
