import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { PlayoffMatch, Team, PlayoffGame } from "@/types";
import { getRowInteractionStyles } from "@/styles/interactionUtils";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { CheckCircle, AlertTriangle, Trophy } from "lucide-react";
import { blueAmber } from "@/styles/design-system";
import { matchUpdateAnimation } from "./animation/BracketAnimationUtils";

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
  const isUpdated = match.team1Score !== null || match.team2Score !== null;

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

  // Determine card style based on match type
  const getCardStyle = () => {
    switch (match.matchType) {
      case 'winners':
        return "border-blue-300 dark:border-blue-800 shadow-blue-900/5 dark:shadow-blue-500/5";
      case 'losers':
        return "border-amber-300 dark:border-amber-800 shadow-amber-900/5 dark:shadow-amber-500/5";
      case 'finals':
        return "border-purple-300 dark:border-purple-800 shadow-purple-900/5 dark:shadow-purple-500/5";
      case 'play-in':
      case 'play-in-2':
        return "border-teal-300 dark:border-teal-800 shadow-teal-900/5 dark:shadow-teal-500/5";
      default:
        return "border-gray-300 dark:border-gray-700";
    }
  };

  const cardClasses = cn(
    "w-64 transition-shadow",
    getCardStyle(),
    onEditMatch ? getRowInteractionStyles("") : "",
    isUpdated && !match.winnerId && "animate-pulse"
  );
  
  // Animation style for updated matches
  const animationStyle = isUpdated ? { animation: matchUpdateAnimation } : {};

  // Determine team row classes
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
  const isResetMatch = match.matchType === 'finals' && match.round > 3;

  // Format series score for display
  const getSeriesScoreText = () => {
    if (!match.team1GameWins && !match.team2GameWins) return '';
    return `${match.team1GameWins || 0}-${match.team2GameWins || 0}`;
  };

  // Get match status text
  const getMatchStatusText = () => {
    if (isPending) return "Waiting for teams";
    if (isComplete) return "Final";
    if (isResetMatch) return "Bracket Reset";
    return "In progress";
  };

  // Get match status color classes
  const getStatusClasses = () => {
    if (isPending) return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
    if (isComplete) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (isResetMatch) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  };

  return (
    <div className="relative flex">
      <Card 
        className={cn(
          cardClasses,
          isLight 
            ? "border hover:border-gray-300 shadow-sm"
            : "border hover:border-gray-700 bg-gray-900/50 shadow-md",
          isPlayIn && "border-l-4 border-l-teal-500",
          isResetMatch && "border-l-4 border-l-amber-500",
          match.matchType === 'finals' && match.round === 1 && "border-l-4 border-l-purple-500",
          match.matchType === 'winners' && "border-l-4 border-l-blue-500",
          match.matchType === 'losers' && "border-l-4 border-l-amber-500"
        )}
        onClick={() => onEditMatch && match.team1Id && match.team2Id && onEditMatch(match.id)}
        style={animationStyle}
      >
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-1 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <span>Best of {match.bestOf || 3}</span>
                {getSeriesScoreText() && (
                  <span className="ml-2 font-medium px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">
                    {getSeriesScoreText()}
                  </span>
                )}
              </div>
              <span className="text-xs font-mono">Match #{match.position}</span>
            </div>

            {/* Team 1 Row */}
            <div className={getTeamRowClasses(match.team1Id === match.winnerId)}>
              {team1 ? (
                <div className="flex items-center w-full">
                  <div className={cn(
                    "flex-none w-6 h-6 flex items-center justify-center mr-2 rounded-full",
                    "bg-gray-200 dark:bg-gray-700 text-xs font-bold",
                    match.matchType === 'winners' && "bg-blue-100 dark:bg-blue-900/30"
                  )}>
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
                  <div className={cn(
                    "flex-none w-6 h-6 flex items-center justify-center mr-2 rounded-full",
                    "bg-gray-200 dark:bg-gray-700 text-xs font-bold",
                    match.matchType === 'winners' && "bg-blue-100 dark:bg-blue-900/30"
                  )}>
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

            {/* Match Status Display - Enhanced with status styling */}
            <div className={cn(
              "mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center",
            )}>
              <div className={cn(
                "text-center px-2 py-1 rounded-full text-xs",
                getStatusClasses()
              )}>
                {getMatchStatusText()}
              </div>
              
              {isResetMatch && (
                <div className="flex items-center text-amber-500">
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs">Bracket Reset</span>
                </div>
              )}
              
              {match.matchType === 'finals' && match.winnerId && (
                <div className="flex items-center text-amber-500">
                  <Trophy className="h-3.5 w-3.5 mr-1" />
                  <span className="text-xs">Champion</span>
                </div>
              )}
            </div>

            {/* Games detail section - condensed view */}
            {match.games && match.games.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">Games</div>
                <div className="flex justify-center gap-1">
                  {match.games.map((game, index) => (
                    <GameResultDot 
                      key={game.id || index} 
                      winnerTeam={game.winner === "team1Id" ? 1 : 2}
                      isTeam1Winner={match.winnerId === match.team1Id}
                      isTeam2Winner={match.winnerId === match.team2Id}
                    />
                  ))}
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

const GameResultDot: React.FC<{ 
  winnerTeam: number; 
  isTeam1Winner: boolean;
  isTeam2Winner: boolean;
}> = ({ winnerTeam, isTeam1Winner, isTeam2Winner }) => {
  const team1WonGame = winnerTeam === 1;
  const team2WonGame = winnerTeam === 2;
  
  return (
    <div 
      className={cn(
        "w-3 h-3 rounded-full",
        team1WonGame 
          ? isTeam1Winner 
            ? "bg-green-500" 
            : "bg-blue-400"
          : team2WonGame 
            ? isTeam2Winner 
              ? "bg-green-500" 
              : "bg-blue-400"
            : "bg-gray-300 dark:bg-gray-600"
      )}
    />
  );
};

export default MatchCard;
