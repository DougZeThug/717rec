
import React from "react";
import { Match } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface MatchCardProps {
  match: Match;
  isCompleted: boolean;
  onEdit?: (match: Match) => void;
  onDelete?: (matchId: string) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ 
  match, 
  isCompleted = false
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
      "group overflow-hidden transition-all duration-200 transform hover:scale-[1.01] hover:shadow-lg",
      isLight 
        ? "bg-white border-gray-300" 
        : "bg-[#1F2937] border-gray-700"
    )}>
      <div className="relative">
        {/* Status Badge */}
        <div className={cn(
          "absolute top-0 left-4 z-10 -translate-y-1/2",
          "bg-indigo-600 text-white text-xs px-3 py-1 rounded-md font-semibold"
        )}>
          Final
        </div>

        <CardContent className="pt-6">
          {/* Teams and Score */}
          <div className="flex justify-between items-center gap-4">
            {/* Team 1 */}
            <div className="flex-1 flex flex-col items-center text-center">
              <Avatar className="w-16 h-16 mb-2">
                <AvatarImage 
                  src={match.team1Details?.image_url || '/placeholder.svg'}
                  alt={team1Name}
                />
                <AvatarFallback className={cn(
                  "font-semibold",
                  isLight ? "bg-gray-100" : "bg-gray-800"
                )}>
                  {team1Name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1">
                {team1IsWinner && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  team1IsWinner 
                    ? isLight ? "text-green-700" : "text-green-400"
                    : isLight ? "text-gray-700" : "text-gray-400"
                )}>
                  {team1Name}
                </span>
              </div>
            </div>

            {/* Score */}
            <div className="text-center px-4">
              <div className="text-3xl font-bold tabular-nums">
                <span className={cn(
                  team1IsWinner
                    ? isLight ? "text-green-600" : "text-green-400"
                    : isLight ? "text-gray-500" : "text-gray-400"
                )}>
                  {match.team1Score || 0}
                </span>
                <span className="mx-2 text-gray-400">-</span>
                <span className={cn(
                  team2IsWinner
                    ? isLight ? "text-green-600" : "text-green-400"
                    : isLight ? "text-gray-500" : "text-gray-400"
                )}>
                  {match.team2Score || 0}
                </span>
              </div>
            </div>

            {/* Team 2 */}
            <div className="flex-1 flex flex-col items-center text-center">
              <Avatar className="w-16 h-16 mb-2">
                <AvatarImage 
                  src={match.team2Details?.image_url || '/placeholder.svg'}
                  alt={team2Name}
                />
                <AvatarFallback className={cn(
                  "font-semibold",
                  isLight ? "bg-gray-100" : "bg-gray-800"
                )}>
                  {team2Name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1">
                {team2IsWinner && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  team2IsWinner 
                    ? isLight ? "text-green-700" : "text-green-400"
                    : isLight ? "text-gray-700" : "text-gray-400"
                )}>
                  {team2Name}
                </span>
              </div>
            </div>
          </div>

          {/* Game Wins Summary */}
          {match.team1_game_wins !== undefined && match.team2_game_wins !== undefined && (
            <div className={cn(
              "text-sm text-center mt-4 px-3 py-1.5 rounded-md",
              isLight ? "bg-gray-100 text-gray-800" : "bg-gray-800 text-gray-300"
            )}>
              Game Wins: {team1Name} ({match.team1_game_wins}) - {team2Name} ({match.team2_game_wins})
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
};

export default MatchCard;
