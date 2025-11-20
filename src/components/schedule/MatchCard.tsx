
import React, { useState, useEffect } from "react";
import { Match } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Pencil, Timer, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { TransitionLink } from '@/components/transitions/TransitionLink';
import { Skeleton } from "@/components/ui/skeleton";
import { animations, gradients, typography, elevation } from "@/styles/design-system";
import { Progress } from "@/components/ui/progress";
import { TeamLogo } from "@/components/ui/team";
import { MatchInteractions } from "@/components/matches";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { MatchHeadToHead } from "./MatchHeadToHead";

interface MatchCardProps {
  match: Match;
  isCompleted: boolean;
  onEdit?: (match: Match) => void;
  onDelete?: (matchId: string) => void;
  showInteractions?: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({ 
  match, 
  isCompleted,
  onEdit,
  onDelete,
  showInteractions = true
}) => {
  const { resolvedTheme } = useTheme();
  const { isAdminAccessGranted } = useAdminAccess();
  const isLight = resolvedTheme === "light";
  const [scoreAnimation, setScoreAnimation] = useState(false);
  const [countdownText, setCountdownText] = useState("");
  const [countdownPercent, setCountdownPercent] = useState(100);

  // Check if team details are loading
  const isTeam1Loading = !match.team1Details;
  const isTeam2Loading = !match.team2Details;

  const team1Name = isTeam1Loading ? "" : match.team1Details?.name || "Unknown Team";
  const team2Name = isTeam2Loading ? "" : match.team2Details?.name || "Unknown Team";

  const team1Logo = isTeam1Loading ? '' : match.team1Details?.image_url || '';
  const team2Logo = isTeam2Loading ? '' : match.team2Details?.image_url || '';

  const team1IsWinner = isCompleted && match.team1Score !== undefined && match.team2Score !== undefined && match.team1Score > match.team2Score;
  const team2IsWinner = isCompleted && match.team1Score !== undefined && match.team2Score !== undefined && match.team2Score > match.team1Score;

  // Determine if match has a special status
  const isPostponed = match.status === "postponed";
  const isCanceled = match.status === "canceled";
  const hasSpecialStatus = isPostponed || isCanceled;

  // Set animation when scores change
  useEffect(() => {
    if (match.team1Score !== undefined || match.team2Score !== undefined) {
      setScoreAnimation(true);
      const timer = setTimeout(() => setScoreAnimation(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [match.team1Score, match.team2Score]);

  // Countdown timer for upcoming matches
  useEffect(() => {
    if (isCompleted || !match.date) return;

    const matchDate = new Date(match.date);
    const now = new Date();
    
    // Only show countdown if match is in the future
    if (matchDate <= now) return;

    const updateCountdown = () => {
      const now = new Date();
      const diff = matchDate.getTime() - now.getTime();
      
      if (diff <= 0) {
        setCountdownText("Starting now!");
        setCountdownPercent(0);
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      // Calculate percentage for progress bar (using 12 hours max for more responsive feedback)
      const maxDiff = 12 * 60 * 60 * 1000; // 12 hours in ms
      const percentage = Math.max(0, Math.min(100, (diff / maxDiff) * 100));
      setCountdownPercent(100 - percentage); // Invert so it fills up as time gets closer
      
      if (days > 0) {
        setCountdownText(`${days}d ${hours}h until match`);
      } else if (hours > 0) {
        setCountdownText(`${hours}h ${minutes}m until match`);
      } else {
        setCountdownText(`${minutes}m until match`);
      }
    };
    
    updateCountdown();
    const intervalId = setInterval(updateCountdown, 60000); // Update every minute
    
    return () => clearInterval(intervalId);
  }, [match.date, isCompleted]);

  const getScoreStyle = (isWinner: boolean) => cn(
    "text-2xl font-black tracking-wide tabular-nums transition-all duration-500",
    scoreAnimation && "animate-scale-in",
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

  // Determine whether to show interactions (only for completed matches)
  const shouldShowInteractions = showInteractions && isCompleted;

  return (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300",
      isLight 
        ? gradients.card.subtle
        : "from-gray-800/50 to-gray-900/50 border-gray-700",
      elevation.card.default,
      animations.scaleIn
    )}>
      {/* Status indicators */}
      {isCompleted && (
        <div className={cn(
          "absolute -top-3 left-4 z-10 px-3 py-1 text-[10px] font-bold tracking-wider uppercase",
          "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-md transform -translate-y-1/2 shadow-sm"
        )}>
          Final
        </div>
      )}
      
      {hasSpecialStatus && (
        <div className={cn(
          "absolute -top-3 right-4 z-10 px-3 py-1 text-[10px] font-bold tracking-wider uppercase",
          isPostponed 
            ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white"
            : "bg-gradient-to-r from-red-600 to-red-700 text-white",
          "rounded-md transform -translate-y-1/2 shadow-sm"
        )}>
          {isPostponed ? "Postponed" : "Canceled"}
        </div>
      )}

      <CardContent className="p-6 pt-8">
        <div className="flex flex-col space-y-4">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
            {/* Team 1 Logo */}
            <TransitionLink to={`/teams/${match.team1Id}`} className="hover:opacity-80 transition-opacity">
              <TeamLogo 
                imageUrl={team1Logo} 
                teamName={team1Name} 
                teamId={match.team1Id}
                size="md"
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
              <TeamLogo 
                imageUrl={team2Logo} 
                teamName={team2Name}
                teamId={match.team2Id} 
                size="md"
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
          
          {/* Head-to-Head Record */}
          <MatchHeadToHead 
            team1Id={match.team1Id}
            team2Id={match.team2Id}
            team1Name={team1Name}
            team2Name={team2Name}
          />
          
          {/* Countdown for upcoming matches */}
          {!isCompleted && countdownText && (
            <div className="mt-1 space-y-1">
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Timer className="h-3 w-3" />
                <span>{countdownText}</span>
              </div>
              <Progress value={countdownPercent} className="h-1" />
            </div>
          )}

          {/* Action buttons - Admin can manage all matches, non-admins only incomplete matches */}
          {((onEdit && !isCompleted) || (onDelete && (!isCompleted || isAdminAccessGranted))) && isAdminAccessGranted && (
            <div className="flex justify-end gap-2 pt-2">
              {onEdit && !isCompleted && (
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
                    isCompleted 
                      ? "bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800"
                      : "bg-gray-100 hover:bg-red-100 dark:bg-gray-800 dark:hover:bg-red-900/30",
                    "hover:shadow-sm active:scale-95"
                  )}
                  title={isCompleted ? "Permanently delete completed match" : "Delete incomplete match"}
                >
                  <Trash2 className={cn(
                    "h-4 w-4 transition-colors",
                    isCompleted 
                      ? "text-red-600 dark:text-red-400"
                      : "text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                  )} />
                </button>
              )}
            </div>
          )}

          {/* Match Interactions Section - Only for completed matches */}
          {shouldShowInteractions && (
            <MatchInteractions matchId={match.id} />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MatchCard;
