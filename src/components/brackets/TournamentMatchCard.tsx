
import React from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { BracketTheme } from "./types/bracketTypes";

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
  fixedHeight?: boolean;
  theme?: BracketTheme;
  size?: 'compact' | 'normal' | 'large';
}

const TournamentMatchCard: React.FC<TournamentMatchCardProps> = ({ 
  match, 
  onMatchClick,
  showSeeds = false,
  bracketType = "single",
  fixedHeight = false,
  theme,
  size = 'normal'
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

  // Use theme colors if provided
  const getBracketStyling = () => {
    if (theme) {
      const bracketColor = theme.colors[bracketType] || theme.colors.border;
      return {
        borderColor: bracketColor,
        backgroundColor: theme.colors.background
      };
    }

    // Fallback to existing logic
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
    
    if (theme) {
      return {
        backgroundColor: `${theme.colors.completed}20`,
        borderColor: theme.colors.completed
      };
    }
    
    return cn(
      "transition-colors duration-300",
      isDark ? "bg-green-900/30 border-green-600" : "bg-green-50 border-green-200"
    );
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'compact':
        return "text-xs";
      case 'large':
        return "text-sm";
      default:
        return "text-xs";
    }
  };

  const cardStyle = theme ? getBracketStyling() : {};
  const cardClasses = theme ? "border rounded-lg overflow-hidden shadow-sm transition-all duration-300" : getBracketStyling();

  return (
    <div 
      className={cn(
        theme ? cardClasses : cardClasses,
        "w-full box-border",
        getSizeClasses(),
        isClickable && "hover:shadow-md cursor-pointer",
        isClickable && !theme && isDark && "hover:bg-gray-700",
        isClickable && !theme && !isDark && "hover:bg-gray-50"
      )}
      style={{
        ...cardStyle,
        ...(fixedHeight ? { 
          height: theme?.spacing.matchHeight || 70,
          margin: '0',
          padding: '8px',
          boxSizing: 'border-box'
        } : {})
      }}
      onClick={handleClick}
    >
      {/* Team 1 */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2 border-b transition-colors duration-300",
        fixedHeight ? "h-1/2 py-1" : "",
        theme ? "" : (isDark ? "border-gray-600" : "border-gray-100"),
        team1Won && (theme ? "" : getWinnerStyling(true))
      )}
      style={{
        ...(theme && team1Won ? getWinnerStyling(true) : {}),
        borderBottomColor: theme?.colors.border
      }}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {showSeeds && match.team1Seed && (
            <span className={cn(
              "font-semibold w-6 text-center transition-colors duration-300",
              theme ? "" : (isDark ? "text-gray-400" : "text-gray-500")
            )}
            style={{ color: theme?.colors.text }}>
              {match.team1Seed}
            </span>
          )}
          {match.team1Logo && (
            <img 
              src={match.team1Logo} 
              alt={`${match.team1Name} logo`}
              className="w-4 h-4 rounded object-cover flex-shrink-0"
            />
          )}
          <span className={cn(
            "font-medium truncate transition-colors duration-300",
            theme ? "" : (team1Won 
              ? (isDark ? "text-green-300" : "text-green-800")
              : (isDark ? "text-gray-200" : "text-gray-900"))
          )}
          style={{ 
            color: theme ? (team1Won ? theme.colors.completed : theme.colors.text) : undefined
          }}>
            {match.team1Name || 'TBD'}
          </span>
        </div>
        <span className={cn(
          "font-bold ml-2 w-6 text-center transition-colors duration-300",
          theme ? "" : (team1Won 
            ? (isDark ? "text-green-300" : "text-green-800")
            : (isDark ? "text-gray-300" : "text-gray-700"))
        )}
        style={{ 
          color: theme ? (team1Won ? theme.colors.completed : theme.colors.text) : undefined
        }}>
          {match.team1Score ?? '-'}
        </span>
      </div>

      {/* Team 2 */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2 transition-colors duration-300",
        fixedHeight ? "h-1/2 py-1" : "",
        team2Won && (theme ? "" : getWinnerStyling(true))
      )}
      style={theme && team2Won ? getWinnerStyling(true) : {}}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {showSeeds && match.team2Seed && (
            <span className={cn(
              "font-semibold w-6 text-center transition-colors duration-300",
              theme ? "" : (isDark ? "text-gray-400" : "text-gray-500")
            )}
            style={{ color: theme?.colors.text }}>
              {match.team2Seed}
            </span>
          )}
          {match.team2Logo && (
            <img 
              src={match.team2Logo} 
              alt={`${match.team2Name} logo`}
              className="w-4 h-4 rounded object-cover flex-shrink-0"
            />
          )}
          <span className={cn(
            "font-medium truncate transition-colors duration-300",
            theme ? "" : (team2Won 
              ? (isDark ? "text-green-300" : "text-green-800")
              : (isDark ? "text-gray-200" : "text-gray-900"))
          )}
          style={{ 
            color: theme ? (team2Won ? theme.colors.completed : theme.colors.text) : undefined
          }}>
            {match.team2Name || 'TBD'}
          </span>
        </div>
        <span className={cn(
          "font-bold ml-2 w-6 text-center transition-colors duration-300",
          theme ? "" : (team2Won 
            ? (isDark ? "text-green-300" : "text-green-800")
            : (isDark ? "text-gray-300" : "text-gray-700"))
        )}
        style={{ 
          color: theme ? (team2Won ? theme.colors.completed : theme.colors.text) : undefined
        }}>
          {match.team2Score ?? '-'}
        </span>
      </div>
    </div>
  );
};

export default TournamentMatchCard;
