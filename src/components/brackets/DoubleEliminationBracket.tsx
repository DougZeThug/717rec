
import React from "react";
import { SimpleBracketData } from "@/hooks/brackets/useBracketData";
import TournamentMatchCard from "./TournamentMatchCard";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface DoubleEliminationBracketProps {
  bracket: SimpleBracketData;
  onMatchClick?: (matchId: string) => void;
}

const DoubleEliminationBracket: React.FC<DoubleEliminationBracketProps> = ({ 
  bracket, 
  onMatchClick 
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Group matches by bracket type
  const winnerMatches = bracket.matches.filter(match => 
    match.matchType === 'winners' || match.matchType === 'winner'
  );
  const loserMatches = bracket.matches.filter(match => 
    match.matchType === 'losers' || match.matchType === 'loser'
  );
  const finalMatches = bracket.matches.filter(match => 
    match.matchType === 'finals' || match.matchType === 'final'
  );

  // Combine winners and finals for the main bracket flow
  const mainBracketMatches = [...winnerMatches, ...finalMatches];

  // Group main bracket matches by round for horizontal flow
  const mainBracketByRound = mainBracketMatches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, typeof mainBracketMatches>);

  // Group losers matches by round
  const losersBracketByRound = loserMatches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, typeof loserMatches>);

  const mainRounds = Object.keys(mainBracketByRound)
    .map(Number)
    .sort((a, b) => a - b);

  const losersRounds = Object.keys(losersBracketByRound)
    .map(Number)
    .sort((a, b) => a - b);

  // Get round names for main bracket
  const getMainRoundName = (round: number, totalRounds: number) => {
    if (round === totalRounds) return "Finals";
    if (round === totalRounds - 1) return "Semifinals";
    return `Round ${round}`;
  };

  // Get round names for losers bracket
  const getLosersRoundName = (round: number) => {
    return `Losers Round ${round}`;
  };

  const lineColor = isDark ? "#6b7280" : "#9ca3af";

  return (
    <div className={cn(
      "w-full rounded-lg p-4 transition-colors duration-300",
      isDark 
        ? "bg-gray-900 border border-gray-700" 
        : "bg-white border border-gray-200"
    )}>
      <div className="mb-4">
        <h2 className={cn(
          "text-2xl font-bold transition-colors duration-300",
          isDark ? "text-white" : "text-gray-900"
        )}>
          {bracket.name}
        </h2>
        <p className={cn(
          "text-sm mt-1 transition-colors duration-300",
          isDark ? "text-gray-400" : "text-gray-600"
        )}>
          {bracket.format} • {bracket.state}
        </p>
      </div>

      <div className="space-y-8 overflow-x-auto">
        {/* Main Bracket (Winners + Finals) */}
        {mainRounds.length > 0 && (
          <div className="relative">
            <div className="flex gap-8 items-start min-w-max">
              {mainRounds.map((round, roundIndex) => {
                const roundMatches = mainBracketByRound[round].sort((a, b) => a.position - b.position);
                const isLastRound = round === Math.max(...mainRounds);
                
                return (
                  <div key={round} className="relative">
                    {/* Round Header */}
                    <div className="text-center mb-3">
                      <h3 className={cn(
                        "text-sm font-semibold transition-colors duration-300",
                        isDark ? "text-blue-300" : "text-blue-800"
                      )}>
                        {getMainRoundName(round, mainRounds.length)}
                      </h3>
                    </div>

                    {/* Matches Column */}
                    <div className={cn(
                      "flex flex-col",
                      roundIndex === 0 ? "space-y-2" : "space-y-6"
                    )}>
                      {roundMatches.map((match, matchIndex) => (
                        <div key={match.id} className="relative">
                          <TournamentMatchCard
                            match={match}
                            onMatchClick={onMatchClick}
                            showSeeds={roundIndex === 0}
                            bracketType="winners"
                          />
                          
                          {/* Horizontal connecting lines to next round */}
                          {!isLastRound && (
                            <svg 
                              className="absolute left-full top-1/2 -translate-y-1/2 pointer-events-none"
                              width="32" 
                              height="2"
                            >
                              <line 
                                x1="0" 
                                y1="1" 
                                x2="32" 
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

                    {/* Vertical connecting lines for bracket tree structure */}
                    {roundIndex < mainRounds.length - 1 && roundMatches.length > 1 && (
                      <svg 
                        className="absolute left-full top-0 pointer-events-none"
                        width="32"
                        height="100%"
                        style={{ height: `${roundMatches.length * (roundIndex === 0 ? 56 : 80)}px` }}
                      >
                        {roundMatches.map((_, index) => {
                          if (index % 2 === 1) return null;
                          
                          const match1Y = (index * (roundIndex === 0 ? 56 : 80)) + 28;
                          const match2Y = ((index + 1) * (roundIndex === 0 ? 56 : 80)) + 28;
                          const midY = (match1Y + match2Y) / 2;
                          
                          return (
                            <g key={index}>
                              <line 
                                x1="32" 
                                y1={match1Y} 
                                x2="32" 
                                y2={match2Y} 
                                stroke={lineColor}
                                strokeWidth="2"
                                className="transition-colors duration-300"
                              />
                              <line 
                                x1="32" 
                                y1={midY} 
                                x2="40" 
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
        )}

        {/* Losers Bracket */}
        {losersRounds.length > 0 && (
          <div className="relative">
            <div className="flex gap-8 items-start min-w-max">
              {losersRounds.map((round, roundIndex) => {
                const roundMatches = losersBracketByRound[round].sort((a, b) => a.position - b.position);
                const isLastRound = round === Math.max(...losersRounds);
                
                return (
                  <div key={round} className="relative">
                    {/* Round Header */}
                    <div className="text-center mb-3">
                      <h3 className={cn(
                        "text-sm font-semibold transition-colors duration-300",
                        isDark ? "text-orange-300" : "text-orange-800"
                      )}>
                        {getLosersRoundName(round)}
                      </h3>
                    </div>

                    {/* Matches Column */}
                    <div className={cn(
                      "flex flex-col",
                      roundIndex === 0 ? "space-y-2" : "space-y-6"
                    )}>
                      {roundMatches.map((match, matchIndex) => (
                        <div key={match.id} className="relative">
                          <TournamentMatchCard
                            match={match}
                            onMatchClick={onMatchClick}
                            showSeeds={false}
                            bracketType="losers"
                          />
                          
                          {/* Horizontal connecting lines to next round */}
                          {!isLastRound && (
                            <svg 
                              className="absolute left-full top-1/2 -translate-y-1/2 pointer-events-none"
                              width="32" 
                              height="2"
                            >
                              <line 
                                x1="0" 
                                y1="1" 
                                x2="32" 
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

                    {/* Vertical connecting lines for bracket tree structure */}
                    {roundIndex < losersRounds.length - 1 && roundMatches.length > 1 && (
                      <svg 
                        className="absolute left-full top-0 pointer-events-none"
                        width="32"
                        height="100%"
                        style={{ height: `${roundMatches.length * (roundIndex === 0 ? 56 : 80)}px` }}
                      >
                        {roundMatches.map((_, index) => {
                          if (index % 2 === 1) return null;
                          
                          const match1Y = (index * (roundIndex === 0 ? 56 : 80)) + 28;
                          const match2Y = ((index + 1) * (roundIndex === 0 ? 56 : 80)) + 28;
                          const midY = (match1Y + match2Y) / 2;
                          
                          return (
                            <g key={index}>
                              <line 
                                x1="32" 
                                y1={match1Y} 
                                x2="32" 
                                y2={match2Y} 
                                stroke={lineColor}
                                strokeWidth="2"
                                className="transition-colors duration-300"
                              />
                              <line 
                                x1="32" 
                                y1={midY} 
                                x2="40" 
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
        )}
      </div>
    </div>
  );
};

export default DoubleEliminationBracket;
