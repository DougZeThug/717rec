
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

  // Group matches by round
  const winnersByRound = winnerMatches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, typeof winnerMatches>);

  const losersByRound = loserMatches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, typeof loserMatches>);

  const winnerRounds = Object.keys(winnersByRound)
    .map(Number)
    .sort((a, b) => a - b);

  const loserRounds = Object.keys(losersByRound)
    .map(Number)
    .sort((a, b) => a - b);

  const lineColor = isDark ? "#6b7280" : "#9ca3af";

  return (
    <div 
      className={cn(
        "w-full rounded-lg p-4 transition-colors duration-300",
        isDark 
          ? "bg-gray-900 border border-gray-700" 
          : "bg-white border border-gray-200"
      )}
      style={{
        '--match-height': '80px',
        '--match-gap': '16px'
      } as React.CSSProperties}
    >
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

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Winners Bracket */}
          {winnerRounds.length > 0 && (
            <div className="mb-8">
              <div 
                className="flex justify-between items-start w-full"
                style={{ minWidth: `${(winnerRounds.length + (finalMatches.length > 0 ? 1 : 0)) * 220}px` }}
              >
                {/* Winners Rounds */}
                {winnerRounds.map((round, roundIndex) => {
                  const roundMatches = winnersByRound[round].sort((a, b) => a.position - b.position);
                  const isLastRound = round === Math.max(...winnerRounds);
                  
                  // Calculate vertical offset
                  const getMarginTop = () => {
                    if (roundIndex === 0) return '0px';
                    return `calc(${roundIndex} * (var(--match-height) + var(--match-gap)))`;
                  };

                  return (
                    <div key={round} className="relative flex flex-col items-center">
                      {/* Round Header */}
                      <div className="text-center mb-4">
                        <h3 className={cn(
                          "text-sm font-semibold transition-colors duration-300",
                          isDark ? "text-blue-300" : "text-blue-800"
                        )}>
                          {roundIndex === winnerRounds.length - 1 ? "Semifinals" : `Round ${round}`}
                        </h3>
                      </div>

                      {/* Matches Container */}
                      <div 
                        className="relative flex flex-col"
                        style={{ 
                          marginTop: getMarginTop(),
                          gap: 'var(--match-gap)'
                        }}
                      >
                        {roundMatches.map((match, matchIndex) => (
                          <div key={match.id} className="relative">
                            <TournamentMatchCard
                              match={match}
                              onMatchClick={onMatchClick}
                              showSeeds={roundIndex === 0}
                              bracketType="winners"
                              fixedHeight={true}
                            />
                            
                            {/* Horizontal connecting lines */}
                            {!isLastRound && finalMatches.length === 0 && (
                              <div
                                className="absolute left-full top-1/2 w-8 h-0.5 -translate-y-1/2 pointer-events-none"
                                style={{ 
                                  backgroundColor: lineColor,
                                  transition: 'background-color 0.3s'
                                }}
                              />
                            )}

                            {/* Connect to Finals if this is the last winners round */}
                            {isLastRound && finalMatches.length > 0 && (
                              <div
                                className="absolute left-full top-1/2 w-8 h-0.5 -translate-y-1/2 pointer-events-none"
                                style={{ 
                                  backgroundColor: lineColor,
                                  transition: 'background-color 0.3s'
                                }}
                              />
                            )}
                          </div>
                        ))}

                        {/* Vertical connecting lines for bracket tree */}
                        {roundIndex < winnerRounds.length - 1 && roundMatches.length > 1 && (
                          <div className="absolute left-full top-0 w-8 pointer-events-none"
                               style={{ height: `calc(${roundMatches.length} * (var(--match-height) + var(--match-gap)) - var(--match-gap))` }}>
                            {roundMatches.map((_, index) => {
                              if (index % 2 === 1) return null;
                              
                              const match1Y = `calc(${index} * (var(--match-height) + var(--match-gap)) + var(--match-height) / 2)`;
                              const match2Y = `calc(${index + 1} * (var(--match-height) + var(--match-gap)) + var(--match-height) / 2)`;
                              const midY = `calc(${index} * (var(--match-height) + var(--match-gap)) + var(--match-height) + var(--match-gap) / 2)`;
                              
                              return (
                                <div key={index} className="relative">
                                  {/* Vertical line */}
                                  <div
                                    className="absolute w-0.5"
                                    style={{
                                      backgroundColor: lineColor,
                                      left: '32px',
                                      top: match1Y,
                                      height: 'var(--match-gap)'
                                    }}
                                  />
                                  {/* Horizontal connector to next round */}
                                  <div
                                    className="absolute h-0.5 w-2"
                                    style={{
                                      backgroundColor: lineColor,
                                      left: '32px',
                                      top: midY
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Finals Column (integrated with Winners) */}
                {finalMatches.length > 0 && (
                  <div className="relative flex flex-col items-center">
                    <div className="text-center mb-4">
                      <h3 className={cn(
                        "text-sm font-semibold transition-colors duration-300",
                        isDark ? "text-purple-300" : "text-purple-800"
                      )}>
                        Finals
                      </h3>
                    </div>
                    <div 
                      className="relative flex flex-col"
                      style={{ 
                        marginTop: `calc(${winnerRounds.length} * (var(--match-height) + var(--match-gap)))`,
                        gap: 'var(--match-gap)'
                      }}
                    >
                      {finalMatches.map((match) => (
                        <div key={match.id} className="relative">
                          <TournamentMatchCard
                            match={match}
                            onMatchClick={onMatchClick}
                            showSeeds={false}
                            bracketType="finals"
                            fixedHeight={true}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Losers Bracket */}
          {loserRounds.length > 0 && (
            <div style={{ marginTop: '40px' }}>
              <div 
                className="flex justify-between items-start w-full"
                style={{ minWidth: `${loserRounds.length * 220}px` }}
              >
                {loserRounds.map((round, roundIndex) => {
                  const roundMatches = losersByRound[round].sort((a, b) => a.position - b.position);
                  const isLastRound = round === Math.max(...loserRounds);
                  
                  // Calculate staggered vertical offset for losers rounds
                  const getMarginTop = () => {
                    if (roundIndex === 0) return '0px';
                    return `calc(${roundIndex} * (var(--match-height) + var(--match-gap)))`;
                  };

                  return (
                    <div key={round} className="relative flex flex-col items-center">
                      {/* Round Header */}
                      <div className="text-center mb-4">
                        <h3 className={cn(
                          "text-sm font-semibold transition-colors duration-300",
                          isDark ? "text-orange-300" : "text-orange-800"
                        )}>
                          Losers Round {round}
                        </h3>
                      </div>

                      {/* Matches Container */}
                      <div 
                        className="relative flex flex-col"
                        style={{ 
                          marginTop: getMarginTop(),
                          gap: 'var(--match-gap)'
                        }}
                      >
                        {roundMatches.map((match, matchIndex) => (
                          <div key={match.id} className="relative">
                            <TournamentMatchCard
                              match={match}
                              onMatchClick={onMatchClick}
                              showSeeds={false}
                              bracketType="losers"
                              fixedHeight={true}
                            />
                            
                            {/* Horizontal connecting lines */}
                            {!isLastRound && (
                              <div
                                className="absolute left-full top-1/2 w-8 h-0.5 -translate-y-1/2 pointer-events-none"
                                style={{ 
                                  backgroundColor: lineColor,
                                  transition: 'background-color 0.3s'
                                }}
                              />
                            )}
                          </div>
                        ))}

                        {/* Vertical connecting lines for bracket tree */}
                        {roundIndex < loserRounds.length - 1 && roundMatches.length > 1 && (
                          <div className="absolute left-full top-0 w-8 pointer-events-none"
                               style={{ height: `calc(${roundMatches.length} * (var(--match-height) + var(--match-gap)) - var(--match-gap))` }}>
                            {roundMatches.map((_, index) => {
                              if (index % 2 === 1) return null;
                              
                              const match1Y = `calc(${index} * (var(--match-height) + var(--match-gap)) + var(--match-height) / 2)`;
                              const match2Y = `calc(${index + 1} * (var(--match-height) + var(--match-gap)) + var(--match-height) / 2)`;
                              const midY = `calc(${index} * (var(--match-height) + var(--match-gap)) + var(--match-height) + var(--match-gap) / 2)`;
                              
                              return (
                                <div key={index} className="relative">
                                  <div
                                    className="absolute w-0.5"
                                    style={{
                                      backgroundColor: lineColor,
                                      left: '32px',
                                      top: match1Y,
                                      height: 'var(--match-gap)'
                                    }}
                                  />
                                  <div
                                    className="absolute h-0.5 w-2"
                                    style={{
                                      backgroundColor: lineColor,
                                      left: '32px',
                                      top: midY
                                    }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoubleEliminationBracket;
