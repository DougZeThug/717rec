
import React from "react";
import { cn } from "@/lib/utils";

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
}

const TournamentMatchCard: React.FC<TournamentMatchCardProps> = ({ 
  match, 
  onMatchClick,
  showSeeds = false 
}) => {
  const isClickable = onMatchClick && match.team1Id && match.team2Id;
  const isComplete = match.status === 'completed' || match.winnerId;
  
  const team1Won = match.winnerId === match.team1Id;
  const team2Won = match.winnerId === match.team2Id;

  const handleClick = () => {
    if (isClickable) {
      onMatchClick(match.id);
    }
  };

  return (
    <div 
      className={cn(
        "bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm",
        "w-48 transition-shadow duration-200",
        isClickable && "hover:shadow-md cursor-pointer",
        isComplete && "border-green-300"
      )}
      onClick={handleClick}
    >
      {/* Team 1 */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2 border-b border-gray-100",
        team1Won && "bg-green-50 border-green-200"
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {showSeeds && match.team1Seed && (
            <span className="text-xs font-semibold text-gray-500 w-6 text-center">
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
            "text-sm font-medium truncate",
            team1Won ? "text-green-800" : "text-gray-900"
          )}>
            {match.team1Name || 'TBD'}
          </span>
        </div>
        <span className={cn(
          "text-sm font-bold ml-2 w-6 text-center",
          team1Won ? "text-green-800" : "text-gray-700"
        )}>
          {match.team1Score ?? '-'}
        </span>
      </div>

      {/* Team 2 */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2",
        team2Won && "bg-green-50"
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {showSeeds && match.team2Seed && (
            <span className="text-xs font-semibold text-gray-500 w-6 text-center">
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
            "text-sm font-medium truncate",
            team2Won ? "text-green-800" : "text-gray-900"
          )}>
            {match.team2Name || 'TBD'}
          </span>
        </div>
        <span className={cn(
          "text-sm font-bold ml-2 w-6 text-center",
          team2Won ? "text-green-800" : "text-gray-700"
        )}>
          {match.team2Score ?? '-'}
        </span>
      </div>

      {/* Status indicator for pending matches */}
      {!isComplete && match.team1Id && match.team2Id && (
        <div className="px-3 py-1 bg-gray-50 border-t border-gray-100">
          <span className="text-xs text-gray-500">Pending</span>
        </div>
      )}
    </div>
  );
};

export default TournamentMatchCard;
