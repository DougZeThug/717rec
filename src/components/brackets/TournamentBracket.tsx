
import React from "react";
import { SimpleBracketData } from "@/hooks/brackets/useBracketData";
import TournamentMatchCard from "./TournamentMatchCard";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface TournamentBracketProps {
  bracket: SimpleBracketData;
  onMatchClick?: (matchId: string) => void;
  bracketType?: "winners" | "losers" | "finals" | "single";
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({ 
  bracket, 
  onMatchClick,
  bracketType = "single"
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  console.log('TournamentBracket rendering with bracket:', {
    bracketExists: !!bracket,
    bracketId: bracket?.id,
    bracketName: bracket?.name,
    matchesCount: bracket?.matches?.length,
    bracketType
  });

  if (!bracket || !bracket.matches || !Array.isArray(bracket.matches)) {
    return (
      <div className="text-center p-8">
        <p className={cn(
          "transition-colors duration-300",
          isDark ? "text-gray-400" : "text-gray-500"
        )}>
          No tournament data available
        </p>
      </div>
    );
  }

  if (bracket.matches.length === 0) {
    return (
      <div className="text-center p-8">
        <h3 className={cn(
          "text-xl font-semibold mb-2 transition-colors duration-300",
          isDark ? "text-white" : "text-gray-900"
        )}>
          {bracket.name}
        </h3>
        <p className={cn(
          "transition-colors duration-300",
          isDark ? "text-gray-400" : "text-gray-500"
        )}>
          No matches have been created for this tournament yet
        </p>
      </div>
    );
  }

  // Group matches by round
  const matchesByRound = bracket.matches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, typeof bracket.matches>);

  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  const maxRound = Math.max(...rounds);

  // Get theme-aware colors for connecting lines
  const lineColor = isDark ? "#6b7280" : "#9ca3af";

  return (
    <div className="relative">
      <div className="flex gap-16 items-start min-w-max">
        {rounds.map((round, roundIndex) => {
          const roundMatches = matchesByRound[round].sort((a, b) => a.position - b.position);
          const isLastRound = round === maxRound;
          
          // Determine round name based on bracket type
          const getRoundName = () => {
            if (bracketType === "finals") return "Finals";
            if (isLastRound && bracketType === "winners") return "Winners Final";
            if (isLastRound && bracketType === "losers") return "Losers Final";
            return `Round ${round}`;
          };
          
          return (
            <div key={round} className="relative">
              {/* Round Header */}
              <div className="text-center mb-6">
                <h3 className={cn(
                  "text-lg font-semibold transition-colors duration-300",
                  isDark ? "text-gray-200" : "text-gray-800"
                )}>
                  {getRoundName()}
                </h3>
              </div>

              {/* Matches Column */}
              <div className={cn(
                "flex flex-col",
                roundIndex === 0 ? "space-y-2" : "space-y-8"
              )}>
                {roundMatches.map((match, matchIndex) => (
                  <div key={match.id} className="relative">
                    <TournamentMatchCard
                      match={match}
                      onMatchClick={onMatchClick}
                      showSeeds={roundIndex === 0}
                      bracketType={bracketType}
                    />
                    
                    {/* Connecting Lines - only if not the last round */}
                    {!isLastRound && (
                      <svg 
                        className="absolute left-full top-1/2 -translate-y-1/2 pointer-events-none"
                        width="64" 
                        height="2"
                      >
                        <line 
                          x1="0" 
                          y1="1" 
                          x2="64" 
                          y2="1" 
                          stroke={lineColor}
                          strokeWidth="2"
                          className="transition-colors duration-300"
                        />
                      </svg>
                    )}
                  </div>
                ))}
              </div>

              {/* Vertical Connecting Lines for bracket tree structure */}
              {roundIndex < rounds.length - 1 && roundMatches.length > 1 && (
                <svg 
                  className="absolute left-full top-0 pointer-events-none"
                  width="64"
                  height="100%"
                  style={{ height: `${roundMatches.length * (roundIndex === 0 ? 80 : 120)}px` }}
                >
                  {roundMatches.map((_, index) => {
                    if (index % 2 === 1) return null; // Only draw for even indices
                    
                    const match1Y = (index * (roundIndex === 0 ? 80 : 120)) + 40;
                    const match2Y = ((index + 1) * (roundIndex === 0 ? 80 : 120)) + 40;
                    const midY = (match1Y + match2Y) / 2;
                    
                    return (
                      <g key={index}>
                        {/* Vertical line connecting two matches */}
                        <line 
                          x1="64" 
                          y1={match1Y} 
                          x2="64" 
                          y2={match2Y} 
                          stroke={lineColor}
                          strokeWidth="2"
                          className="transition-colors duration-300"
                        />
                        {/* Horizontal line to next round */}
                        <line 
                          x1="64" 
                          y1={midY} 
                          x2="80" 
                          y2={midY} 
                          stroke={lineColor}
                          strokeWidth="2"
                          className="transition-colors duration-300"
                        />
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TournamentBracket;
