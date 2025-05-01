
import React from "react";
import { Match } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { TransitionLink } from '@/components/transitions/TransitionLink';
import { Skeleton } from "@/components/ui/skeleton";
import { animations, gradients, typography, elevation } from "@/styles/designSystem";

interface MatchCardProps {
  match: Match;
  isCompleted: boolean;
  onEdit?: (match: Match) => void;
  onDelete?: (matchId: string) => void;
}

const MatchCard: React.FC<MatchCardProps> = ({ 
  match, 
  isCompleted,
  onEdit,
  onDelete
}) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  // Check if team details are loading
  const isTeam1Loading = !match.team1Details;
  const isTeam2Loading = !match.team2Details;

  const team1Name = isTeam1Loading ? "" : match.team1Details?.name || "Unknown Team";
  const team2Name = isTeam2Loading ? "" : match.team2Details?.name || "Unknown Team";

  const team1Logo = isTeam1Loading ? '' : match.team1Details?.image_url || '';
  const team2Logo = isTeam2Loading ? '' : match.team2Details?.image_url || '';

  const team1IsWinner = isCompleted && match.team1Score !== undefined && match.team2Score !== undefined && match.team1Score > match.team2Score;
  const team2IsWinner = isCompleted && match.team1Score !== undefined && match.team2Score !== undefined && match.team2Score > match.team1Score;

  const getScoreStyle = (isWinner: boolean) => cn(
    "text-2xl font-black tracking-wide tabular-nums transition-colors",
    isWinner 
      ? isLight ? "text-green-600" : "text-green-500"
      : isLight ? "text-gray-600" : "text-gray-400"
  );

  const getTeamStyle = (isWinner: boolean) => cn(
    "truncate",
    isWinner 
      ? isLight ? "text-green-600 font-medium" : "text-green-500 font-medium"
      : isLight ? "text-gray-600" : "text-gray-400"
  );

  const SquareLogo = ({ src, alt, fallback, isLoading }: { src: string, alt: string, fallback: string, isLoading: boolean }) => (
    <div className="w-10 h-10 flex items-center justify-center bg-white dark:bg-gray-800 transition-all duration-300">
      {isLoading ? (
        <Skeleton className="w-10 h-10" />
      ) : src ? (
        <img
          src={src}
          alt={alt}
          className="w-10 h-10 object-contain rounded-none transition-opacity duration-300 hover:opacity-90"
          draggable={false}
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className={cn(
          "w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 font-semibold text-md rounded-none",
          "transition-colors duration-300"
        )}>
          {fallback}
        </div>
      )}
    </div>
  );

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300",
      isLight 
        ? gradients.card.subtle
        : "from-gray-800/50 to-gray-900/50 border-gray-700",
      elevation.card.default,
      animations.scaleIn
    )}>
      {isCompleted && (
        <div className={cn(
          "absolute -top-3 left-4 z-10 px-3 py-1 text-[10px] font-bold tracking-wider uppercase",
          "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-md transform -translate-y-1/2 shadow-sm"
        )}>
          Final
        </div>
      )}

      <CardContent className="p-6 pt-8">
        <div className="flex flex-col space-y-4">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
            {/* Team 1 Logo */}
            <TransitionLink to={`/teams/${match.team1Id}`} className="hover:opacity-80 transition-opacity">
              <SquareLogo 
                src={team1Logo} 
                alt={team1Name} 
                fallback={team1Name.charAt(0)} 
                isLoading={isTeam1Loading}
              />
            </TransitionLink>
            
            {/* Score */}
            <div className="flex items-center justify-center">
              <div className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-full",
                "bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800/50 dark:to-gray-900/50",
                "transition-all duration-300 shadow-sm"
              )}>
                <span className={getScoreStyle(team1IsWinner)}>
                  {match.team1Score || 0}
                </span>
                <span className="text-xl font-bold text-gray-400">-</span>
                <span className={getScoreStyle(team2IsWinner)}>
                  {match.team2Score || 0}
                </span>
              </div>
            </div>
            
            {/* Team 2 Logo */}
            <TransitionLink to={`/teams/${match.team2Id}`} className="hover:opacity-80 transition-opacity">
              <SquareLogo 
                src={team2Logo} 
                alt={team2Name} 
                fallback={team2Name.charAt(0)} 
                isLoading={isTeam2Loading}
              />
            </TransitionLink>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            {/* Team 1 Name */}
            <TransitionLink 
              to={`/teams/${match.team1Id}`}
              className={cn(
                "flex items-center gap-2 justify-center min-w-0 transition-transform duration-200 hover:translate-x-1",
                team1IsWinner && "font-semibold"
              )}
            >
              {team1IsWinner && !isTeam1Loading && (
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
              {isTeam1Loading ? (
                <Skeleton className="h-6 w-full" />
              ) : (
                <span className={cn(
                  getTeamStyle(team1IsWinner),
                  typography.special.stat
                )}>
                  ({match.team1_game_wins || 0}) {team1Name}
                </span>
              )}
            </TransitionLink>

            <div className="w-4"></div>

            {/* Team 2 Name */}
            <TransitionLink 
              to={`/teams/${match.team2Id}`}
              className={cn(
                "flex items-center gap-2 justify-center min-w-0 transition-transform duration-200 hover:-translate-x-1",
                team2IsWinner && "font-semibold"
              )}
            >
              {team2IsWinner && !isTeam2Loading && (
                <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
              {isTeam2Loading ? (
                <Skeleton className="h-6 w-full" />
              ) : (
                <span className={cn(
                  getTeamStyle(team2IsWinner),
                  typography.special.stat
                )}>
                  ({match.team2_game_wins || 0}) {team2Name}
                </span>
              )}
            </TransitionLink>
          </div>

          {/* Action buttons for non-completed matches */}
          {!isCompleted && (onEdit || onDelete) && (
            <div className="flex justify-end gap-2 pt-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(match)}
                  className={cn(
                    "p-1.5 rounded-full transition-all duration-200",
                    "bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700",
                    "hover:shadow-sm active:scale-95"
                  )}
                >
                  <Pencil className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(match.id)}
                  className={cn(
                    "p-1.5 rounded-full transition-all duration-200",
                    "bg-gray-100 hover:bg-red-100 dark:bg-gray-800 dark:hover:bg-red-900/30",
                    "hover:shadow-sm active:scale-95"
                  )}
                >
                  <Trash2 className="h-4 w-4 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" />
                </button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchCard;
