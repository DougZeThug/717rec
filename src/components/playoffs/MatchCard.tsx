
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { PlayoffMatch, Team, PlayoffGame } from "@/types";
import { getRowInteractionStyles } from "@/styles/interactionUtils";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { CheckCircle } from "lucide-react";
import { blueAmber } from "@/styles/design-system";

interface MatchCardProps {
  match: PlayoffMatch;
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
  hasNextMatch: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({ 
  match, 
  teams, 
  onEditMatch,
  hasNextMatch
}) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const getTeamById = (id?: string) => {
    if (!id) return null;
    
    // Special handling for play-in placeholders
    if (id.startsWith('play-in-')) {
      return {
        id,
        name: `Winner of Play-in ${id.split('-')[2]}`,
        seed: match.team1Seed || match.team2Seed || 0
      };
    }
    
    return teams.find(team => team.id === id);
  };

  const team1 = getTeamById(match.team1Id);
  const team2 = getTeamById(match.team2Id);
  const winner = getTeamById(match.winnerId);

  // Determine team seeds
  const team1Seed = match.team1Seed || (team1?.seed || 0);
  const team2Seed = match.team2Seed || (team2?.seed || 0);

  const cardClasses = onEditMatch
    ? getRowInteractionStyles("w-64 transition-shadow")
    : "w-64 transition-shadow";
  
  const getTeamRowClasses = (isWinner: boolean) => cn(
    "flex items-center p-2 rounded-md",
    isWinner ? (
      isLight ? "bg-green-50 border-l-4 border-green-500" : "bg-green-900/20 border-l-4 border-green-500"
    ) : (
      isLight ? "bg-gray-50" : "bg-gray-800/40"
    )
  );

  // Determine match state
  const isPending = !match.team1Id || !match.team2Id;
  const isComplete = !!match.winnerId;
  const isPlayIn = match.matchType === 'play-in';
  
  // Determine if this is a grand finals reset match
  const isResetMatch = match.matchType === 'finals' && match.round === 2;
  
  // Get match status text
  const getMatchStatusText = () => {
    if (isPlayIn) return "Play-in Match";
    if (isPending) return "Waiting for teams";
    if (isResetMatch) return "Grand Finals Reset";
    if (match.matchType === 'finals' && match.round === 1) return "Grand Finals";
    return "";
  };

  return (
    <div className="relative flex">
      <Card 
        className={cn(
          cardClasses,
          isLight 
            ? "border border-gray-200 hover:border-gray-300 shadow-sm"
            : "border border-gray-800 hover:border-gray-700 bg-gray-900/50 shadow-md",
          isPlayIn && "border-l-4 border-purple-500",
          isResetMatch && "border-l-4 border-amber-500"
        )}
        onClick={() => onEditMatch && match.team1Id && match.team2Id && onEditMatch(match.id)}
      >
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1 text-xs text-gray-500 dark:text-gray-400">
              <span>Best of {match.bestOf || 3}</span>
              <span className="text-xs font-mono">Match #{match.position}</span>
            </div>

            {/* Team 1 Row */}
            <div className={getTeamRowClasses(match.team1Id === match.winnerId)}>
              {team1 ? (
                <div className="flex items-center w-full">
                  <div className="flex-none w-6 h-6 flex items-center justify-center mr-2 rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-bold">
                    {team1Seed}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex items-center">
                    {team1.imageUrl || team1.logoUrl ? (
                      <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 mr-2">
                        <img 
                          src={team1.imageUrl || team1.logoUrl} 
                          alt={team1.name} 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : null}
                    <span className="truncate text-sm font-medium">{team1.name}</span>
                  </div>
                  
                  {match.team1Score !== undefined && (
                    <span className={cn(
                      "flex-none ml-2 text-sm font-bold",
                      match.team1Id === match.winnerId ? "text-green-600 dark:text-green-400" : ""
                    )}>
                      {match.team1Score}
                    </span>
                  )}
                  
                  {match.team1Id === match.winnerId && (
                    <CheckCircle className="flex-none ml-1 h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  )}
                </div>
              ) : (
                <span className="text-gray-400 italic text-sm">TBD</span>
              )}
            </div>
            
            {/* Team 2 Row */}
            <div className={getTeamRowClasses(match.team2Id === match.winnerId)}>
              {team2 ? (
                <div className="flex items-center w-full">
                  <div className="flex-none w-6 h-6 flex items-center justify-center mr-2 rounded-full bg-gray-200 dark:bg-gray-700 text-xs font-bold">
                    {team2Seed}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex items-center">
                    {team2.imageUrl || team2.logoUrl ? (
                      <div className="w-5 h-5 rounded-full overflow-hidden bg-gray-200 mr-2">
                        <img 
                          src={team2.imageUrl || team2.logoUrl} 
                          alt={team2.name} 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : null}
                    <span className="truncate text-sm font-medium">{team2.name}</span>
                  </div>
                  
                  {match.team2Score !== undefined && (
                    <span className={cn(
                      "flex-none ml-2 text-sm font-bold",
                      match.team2Id === match.winnerId ? "text-green-600 dark:text-green-400" : ""
                    )}>
                      {match.team2Score}
                    </span>
                  )}
                  
                  {match.team2Id === match.winnerId && (
                    <CheckCircle className="flex-none ml-1 h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                  )}
                </div>
              ) : (
                <span className="text-gray-400 italic text-sm">TBD</span>
              )}
            </div>

            {/* Match Status Display */}
            {(isPending || isPlayIn || isResetMatch) && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-center">
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded",
                  isPlayIn 
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" 
                    : isResetMatch
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                      : "text-gray-500 dark:text-gray-400"
                )}>
                  {getMatchStatusText()}
                </span>
              </div>
            )}

            {/* Games detail section - only show if there are games */}
            {match.games && match.games.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Games</div>
                <div className="grid grid-cols-3 gap-1">
                  {match.games.map((game, index) => (
                    <GameResult key={game.id} game={game} index={index} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Match status indicator */}
            {match.status && match.status !== 'pending' && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-center">
                <div className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  match.status === 'completed' 
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                )}>
                  {match.status === 'completed' ? 'Completed' : 'In Progress'}
                </div>
              </div>
            )}
            
            {/* Champion display for finals */}
            {winner && match.matchType === 'finals' && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-center">
                <div className="text-xs text-gray-500 dark:text-gray-400">Champion</div>
                <div className={blueAmber.text.heading + " font-semibold"}>
                  {winner.name}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const GameResult: React.FC<{ game: PlayoffGame, index: number }> = ({ game, index }) => {
  return (
    <div className="text-center text-xs bg-gray-50 dark:bg-gray-800/40 p-1 rounded">
      <div className="font-medium text-gray-500 dark:text-gray-400">Game {index + 1}</div>
      <div className="font-mono">
        <span className={game.winner === 'team1Id' ? "font-bold" : ""}>
          {game.team1Score}
        </span>
        {" - "}
        <span className={game.winner === 'team2Id' ? "font-bold" : ""}>
          {game.team2Score}
        </span>
      </div>
    </div>
  );
};

export default MatchCard;
