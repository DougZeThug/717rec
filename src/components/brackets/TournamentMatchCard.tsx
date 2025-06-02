
import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface TournamentMatch {
  id: string;
  team1Name?: string;
  team2Name?: string;
  team1Logo?: string;
  team2Logo?: string;
  team1Score: number | null;
  team2Score: number | null;
  team1Seed?: number;
  team2Seed?: number;
  winnerId: string | null;
  team1Id: string | null;
  team2Id: string | null;
  status: string;
}

interface TournamentMatchCardProps {
  match: TournamentMatch;
  onMatchClick?: (matchId: string) => void;
  showSeeds?: boolean;
  bracketType?: "winners" | "losers" | "finals" | "single";
}

const TournamentMatchCard: React.FC<TournamentMatchCardProps> = ({ 
  match, 
  onMatchClick,
  showSeeds = false,
  bracketType = "single"
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  
  const isClickable = onMatchClick && match.team1Id && match.team2Id;
  const isComplete = match.status === 'completed' || match.winnerId;
  
  const team1Won = match.winnerId === match.team1Id;
  const team2Won = match.winnerId === match.team2Id;

  const handleClick = () => {
    if (isClickable) {
      onMatchClick(match.id);
    }
  };

  // Get bracket-specific styling
  const getBracketStyling = () => {
    const baseClasses = isDark 
      ? "bg-gray-800 border-gray-600" 
      : "bg-white border-gray-200";
      
    switch (bracketType) {
      case "winners":
        return cn(
          baseClasses,
          isDark 
            ? "border-blue-600 shadow-blue-900/20" 
            : "border-blue-300 shadow-blue-900/5"
        );
      case "losers":
        return cn(
          baseClasses,
          isDark 
            ? "border-orange-600 shadow-orange-900/20" 
            : "border-orange-300 shadow-orange-900/5"
        );
      case "finals":
        return cn(
          baseClasses,
          isDark 
            ? "border-purple-600 shadow-purple-900/20" 
            : "border-purple-300 shadow-purple-900/5"
        );
      default:
        return cn(
          baseClasses,
          isComplete && (isDark ? "border-green-600" : "border-green-300")
        );
    }
  };

  const getWinnerStyling = (isWinner: boolean) => {
    if (!isWinner) return "";
    
    return cn(
      "transition-colors duration-300",
      isDark ? "bg-green-900/30 border-green-600" : "bg-green-50 border-green-200"
    );
  };

  return (
    <div 
      className={cn(
        "border rounded-lg overflow-hidden shadow-sm transition-all duration-300",
        "w-48",
        getBracketStyling(),
        isClickable && "hover:shadow-md cursor-pointer",
        isClickable && isDark && "hover:bg-gray-700",
        isClickable && !isDark && "hover:bg-gray-50"
      )}
      onClick={handleClick}
    >
      {/* Team 1 */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2 border-b transition-colors duration-300",
        isDark ? "border-gray-600" : "border-gray-100",
        team1Won && getWinnerStyling(true)
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {showSeeds && match.team1Seed && (
            <span className={cn(
              "text-xs font-semibold w-6 text-center transition-colors duration-300",
              isDark ? "text-gray-400" : "text-gray-500"
            )}>
              {match.team1Seed}
            </span>
          )}
          {match.team1Logo && (
            <img 
              src={match.team1Logo} 
              alt={`${match.team1Name} logo`}
              className="w-5 h-5 rounded object-cover flex-shrink-0"
            />
          )}
          <span className={cn(
            "text-sm font-medium truncate transition-colors duration-300",
            team1Won 
              ? (isDark ? "text-green-300" : "text-green-800")
              : (isDark ? "text-gray-200" : "text-gray-900")
          )}>
            {match.team1Name || 'TBD'}
          </span>
        </div>
        <span className={cn(
          "text-sm font-bold ml-2 w-6 text-center transition-colors duration-300",
          team1Won 
            ? (isDark ? "text-green-300" : "text-green-800")
            : (isDark ? "text-gray-300" : "text-gray-700")
        )}>
          {match.team1Score ?? '-'}
        </span>
      </div>

      {/* Team 2 */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2 transition-colors duration-300",
        team2Won && getWinnerStyling(true)
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {showSeeds && match.team2Seed && (
            <span className={cn(
              "text-xs font-semibold w-6 text-center transition-colors duration-300",
              isDark ? "text-gray-400" : "text-gray-500"
            )}>
              {match.team2Seed}
            </span>
          )}
          {match.team2Logo && (
            <img 
              src={match.team2Logo} 
              alt={`${match.team2Name} logo`}
              className="w-5 h-5 rounded object-cover flex-shrink-0"
            />
          )}
          <span className={cn(
            "text-sm font-medium truncate transition-colors duration-300",
            team2Won 
              ? (isDark ? "text-green-300" : "text-green-800")
              : (isDark ? "text-gray-200" : "text-gray-900")
          )}>
            {match.team2Name || 'TBD'}
          </span>
        </div>
        <span className={cn(
          "text-sm font-bold ml-2 w-6 text-center transition-colors duration-300",
          team2Won 
            ? (isDark ? "text-green-300" : "text-green-800")
            : (isDark ? "text-gray-300" : "text-gray-700")
        )}>
          {match.team2Score ?? '-'}
        </span>
      </div>

      {/* Status indicator for pending matches */}
      {!isComplete && match.team1Id && match.team2Id && (
        <div className={cn(
          "px-3 py-1 border-t transition-colors duration-300",
          isDark 
            ? "bg-gray-700 border-gray-600" 
            : "bg-gray-50 border-gray-100"
        )}>
          <span className={cn(
            "text-xs transition-colors duration-300",
            isDark ? "text-gray-400" : "text-gray-500"
          )}>
            Pending
          </span>
        </div>
      )}
    </div>
  );
};

export default TournamentMatchCard;
