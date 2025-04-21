
import React from "react";
import { Match } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface MatchCardProps {
  match: Match;
  isCompleted: boolean;
  onEdit?: (match: Match) => void;
  onDelete?: (matchId: string) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ 
  match, 
  isCompleted
}) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  // Get team names with fallbacks
  const team1Name = match.team1Details?.name || "Unknown Team";
  const team2Name = match.team2Details?.name || "Unknown Team";

  // Determine winner/loser for styling
  const team1IsWinner = isCompleted && match.team1Score !== undefined && match.team2Score !== undefined && match.team1Score > match.team2Score;
  const team2IsWinner = isCompleted && match.team1Score !== undefined && match.team2Score !== undefined && match.team2Score > match.team1Score;

  // Score styling based on win/loss
  const getScoreStyle = (isWinner: boolean) => cn(
    "text-xl font-bold tabular-nums",
    isWinner 
      ? isLight ? "text-green-600" : "text-green-400"
      : isLight ? "text-gray-600" : "text-gray-400"
  );

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-200",
      "hover:shadow-lg hover:scale-[1.01]",
      isLight 
        ? "bg-gray-50 border-gray-200" 
        : "bg-gray-800/50 border-gray-700"
    )}>
      {/* Final Badge */}
      <div className={cn(
        "absolute -top-2 left-4 z-10 px-3 py-1 text-xs font-semibold rounded-md",
        "bg-indigo-600 text-white transform -translate-y-1/2"
      )}>
        Final
      </div>

      <CardContent className="p-6 pt-8">
        {/* Scoreboard Layout */}
        <div className="flex items-center justify-between gap-4">
          {/* Team 1 */}
          <div className="flex-1 flex items-center justify-start gap-3">
            <Avatar className="w-12 h-12 flex-shrink-0">
              <AvatarImage 
                src={match.team1Details?.image_url || ''} 
                alt={team1Name}
              />
              <AvatarFallback className={cn(
                "font-semibold",
                isLight ? "bg-gray-100" : "bg-gray-800"
              )}>
                {team1Name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn(
                "font-medium truncate",
                team1IsWinner 
                  ? isLight ? "text-green-700" : "text-green-400"
                  : isLight ? "text-gray-700" : "text-gray-400"
              )}>
                {team1Name}
              </span>
              {team1IsWinner && (
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
            </div>
          </div>

          {/* Score */}
          <div className="text-center px-4 flex items-center gap-3">
            <span className={getScoreStyle(team1IsWinner)}>
              {match.team1Score || 0}
            </span>
            <span className="text-xl text-gray-400">-</span>
            <span className={getScoreStyle(team2IsWinner)}>
              {match.team2Score || 0}
            </span>
          </div>

          {/* Team 2 */}
          <div className="flex-1 flex items-center justify-end gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {team2IsWinner && (
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
              <span className={cn(
                "font-medium truncate",
                team2IsWinner 
                  ? isLight ? "text-green-700" : "text-green-400"
                  : isLight ? "text-gray-700" : "text-gray-400"
              )}>
                {team2Name}
              </span>
            </div>
            <Avatar className="w-12 h-12 flex-shrink-0">
              <AvatarImage 
                src={match.team2Details?.image_url || ''} 
                alt={team2Name}
              />
              <AvatarFallback className={cn(
                "font-semibold",
                isLight ? "bg-gray-100" : "bg-gray-800"
              )}>
                {team2Name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Game Wins Summary */}
        {match.team1_game_wins !== undefined && match.team2_game_wins !== undefined && (
          <div className={cn(
            "mt-4 text-sm text-center px-3 py-2 rounded-md",
            isLight 
              ? "bg-gray-800 text-white" 
              : "bg-gray-900 text-gray-200"
          )}>
            Game Wins: {team1Name} ({match.team1_game_wins}) - {team2Name} ({match.team2_game_wins})
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchCard;
