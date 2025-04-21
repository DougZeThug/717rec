
import React from "react";
import { Match } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { TransitionLink } from '@/components/transitions/TransitionLink';

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

  const team1Name = match.team1Details?.name || "Unknown Team";
  const team2Name = match.team2Details?.name || "Unknown Team";

  const team1IsWinner = isCompleted && match.team1Score !== undefined && match.team2Score !== undefined && match.team1Score > match.team2Score;
  const team2IsWinner = isCompleted && match.team1Score !== undefined && match.team2Score !== undefined && match.team2Score > match.team2Score;

  const getScoreStyle = (isWinner: boolean) => cn(
    "text-2xl font-black tracking-wide tabular-nums transition-colors",
    isWinner 
      ? isLight ? "text-green-600" : "text-green-400"
      : isLight ? "text-gray-600" : "text-gray-400"
  );

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-200",
      "bg-gradient-to-br border",
      isLight 
        ? "from-gray-50 to-gray-100 border-gray-200 hover:shadow-md" 
        : "from-gray-800/50 to-gray-900/50 border-gray-700 hover:shadow-[0_0_15px_rgba(0,0,0,0.3)]"
    )}>
      {/* Final Badge */}
      <div className={cn(
        "absolute -top-3 left-4 z-10 px-3 py-1 text-[10px] font-bold tracking-wider uppercase",
        "bg-indigo-600 text-white rounded-md transform -translate-y-1/2 shadow-sm"
      )}>
        Final
      </div>

      <CardContent className="p-6 pt-8">
        <div className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-4">
          {/* Team 1 */}
          <TransitionLink to={`/teams/${match.team1Id}`} className="hover:opacity-80 transition-opacity">
            <Avatar className="w-12 h-12 ring-2 ring-white/10 dark:ring-black/10">
              <AvatarImage 
                src={match.team1Details?.image_url || ''} 
                alt={team1Name}
                className="object-contain bg-white dark:bg-gray-800"
              />
              <AvatarFallback className={cn(
                "font-semibold",
                isLight ? "bg-gray-100" : "bg-gray-800"
              )}>
                {team1Name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </TransitionLink>
          
          <TransitionLink 
            to={`/teams/${match.team1Id}`}
            className={cn(
              "flex items-center gap-2 min-w-0 hover:underline",
              team1IsWinner && "font-semibold"
            )}
          >
            <span className={cn(
              "truncate",
              team1IsWinner 
                ? isLight ? "text-green-700" : "text-green-400"
                : isLight ? "text-gray-700" : "text-gray-400"
            )}>
              {team1Name}
            </span>
            {team1IsWinner && (
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
            )}
          </TransitionLink>

          {/* Score */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800/50">
            <span className={getScoreStyle(team1IsWinner)}>
              {match.team1Score || 0}
            </span>
            <span className="text-xl font-bold text-gray-400">-</span>
            <span className={getScoreStyle(team2IsWinner)}>
              {match.team2Score || 0}
            </span>
          </div>

          {/* Team 2 */}
          <TransitionLink 
            to={`/teams/${match.team2Id}`}
            className={cn(
              "flex items-center justify-end gap-2 min-w-0 hover:underline",
              team2IsWinner && "font-semibold"
            )}
          >
            {team2IsWinner && (
              <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
            )}
            <span className={cn(
              "truncate text-right",
              team2IsWinner 
                ? isLight ? "text-green-700" : "text-green-400"
                : isLight ? "text-gray-700" : "text-gray-400"
            )}>
              {team2Name}
            </span>
          </TransitionLink>

          <TransitionLink to={`/teams/${match.team2Id}`} className="hover:opacity-80 transition-opacity">
            <Avatar className="w-12 h-12 ring-2 ring-white/10 dark:ring-black/10">
              <AvatarImage 
                src={match.team2Details?.image_url || ''} 
                alt={team2Name}
                className="object-contain bg-white dark:bg-gray-800"
              />
              <AvatarFallback className={cn(
                "font-semibold",
                isLight ? "bg-gray-100" : "bg-gray-800"
              )}>
                {team2Name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </TransitionLink>
        </div>

        {/* Game Wins Summary */}
        {match.team1_game_wins !== undefined && match.team2_game_wins !== undefined && (
          <div className={cn(
            "mt-4 text-sm text-center px-3 py-2 rounded-md font-mono",
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
