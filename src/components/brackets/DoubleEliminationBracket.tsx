
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

  // Get round names for main bracket
  const getWinnerRoundName = (round: number, totalRounds: number) => {
    if (round === totalRounds) return "Semifinals";
    return `Round ${round}`;
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

      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* Winners Bracket Grid */}
          {winnerRounds.length > 0 && (
            <div className="mb-8">
              <div 
                className="grid gap-0 relative"
                style={{ 
                  gridTemplateColumns: `repeat(${winnerRounds.length}, 1fr)`,
                  minWidth: `${winnerRounds.length * 220}px`
                }}
              >
                {winnerRounds.map((round, roundIndex) => {
                  const roundMatches = winnersByRound[round].sort((a, b) => a.position - b.position);
                  const isLastRound = round === Math.max(...winnerRounds);
                  
                  // Calculate top margin for vertical alignment
                  const getTopMargin = () => {
                    if (roundIndex === 0) return 0;
                    const prevRoundsMatches = roundIndex === 1 ? 1 : Math.pow(2, roundIndex - 1);
                    return `${prevRoundsMatches * 48}px`; // 80px match height - 32px for better alignment
                  };

                  return (
                    <div key={round} className="relative p-2">
                      {/* Round Header */}
                      <div className="text-center mb-4">
                        <h3 className={cn(
                          "text-sm font-semibold transition-colors duration-300",
                          isDark ? "text-blue-300" : "text-blue-800"
                        )}>
                          {getWinnerRoundName(round, winnerRounds.length)}
                        </h3>
                      </div>

                      {/* Matches Container */}
                      <div 
                        className="relative"
                        style={{ marginTop: getTopMargin() }}
                      >
                        {roundMatches.map((match, matchIndex) => (
                          <div 
                            key={match.id} 
                            className="relative mb-4"
                            style={{ height: '80px' }}
                          >
                            <TournamentMatchCard
                              match={match}
                              onMatchClick={onMatchClick}
                              showSeeds={roundIndex === 0}
                              bracketType="winners"
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
                        {roundIndex < winnerRounds.length - 1 && roundMatches.length > 1 && (
                          <div className="absolute left-full top-0 w-8 h-full pointer-events-none">
                            {roundMatches.map((_, index) => {
                              if (index % 2 === 1) return null;
                              
                              const match1Y = index * 84 + 40; // 80px height + 4px margin + center offset
                              const match2Y = (index + 1) * 84 + 40;
                              const midY = (match1Y + match2Y) / 2;
                              
                              return (
                                <div key={index} className="relative">
                                  {/* Vertical line */}
                                  <div
                                    className="absolute w-0.5"
                                    style={{
                                      backgroundColor: lineColor,
                                      left: '32px',
                                      top: `${match1Y}px`,
                                      height: `${match2Y - match1Y}px`
                                    }}
                                  />
                                  {/* Horizontal connector to next round */}
                                  <div
                                    className="absolute h-0.5 w-2"
                                    style={{
                                      backgroundColor: lineColor,
                                      left: '32px',
                                      top: `${midY}px`
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

          {/* Finals Section */}
          {finalMatches.length > 0 && (
            <div className="mb-8">
              <div className="grid grid-cols-1 gap-0 w-56 mx-auto">
                <div className="relative p-2">
                  <div className="text-center mb-4">
                    <h3 className={cn(
                      "text-sm font-semibold transition-colors duration-300",
                      isDark ? "text-purple-300" : "text-purple-800"
                    )}>
                      Finals
                    </h3>
                  </div>
                  <div className="relative">
                    {finalMatches.map((match) => (
                      <div 
                        key={match.id} 
                        className="relative"
                        style={{ height: '80px' }}
                      >
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
              </div>
            </div>
          )}

          {/* Losers Bracket Grid */}
          {loserRounds.length > 0 && (
            <div>
              <div 
                className="grid gap-0 relative"
                style={{ 
                  gridTemplateColumns: `repeat(${loserRounds.length}, 1fr)`,
                  minWidth: `${loserRounds.length * 220}px`
                }}
              >
                {loserRounds.map((round, roundIndex) => {
                  const roundMatches = losersByRound[round].sort((a, b) => a.position - b.position);
                  const isLastRound = round === Math.max(...loserRounds);
                  
                  // Calculate top margin for losers bracket alignment
                  const getTopMargin = () => {
                    if (roundIndex === 0) return 0;
                    return `${roundIndex * 48}px`; // Progressive margin for losers rounds
                  };

                  return (
                    <div key={round} className="relative p-2">
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
                        className="relative"
                        style={{ marginTop: getTopMargin() }}
                      >
                        {roundMatches.map((match, matchIndex) => (
                          <div 
                            key={match.id} 
                            className="relative mb-4"
                            style={{ height: '80px' }}
                          >
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
                          <div className="absolute left-full top-0 w-8 h-full pointer-events-none">
                            {roundMatches.map((_, index) => {
                              if (index % 2 === 1) return null;
                              
                              const match1Y = index * 84 + 40;
                              const match2Y = (index + 1) * 84 + 40;
                              const midY = (match1Y + match2Y) / 2;
                              
                              return (
                                <div key={index} className="relative">
                                  <div
                                    className="absolute w-0.5"
                                    style={{
                                      backgroundColor: lineColor,
                                      left: '32px',
                                      top: `${match1Y}px`,
                                      height: `${match2Y - match1Y}px`
                                    }}
                                  />
                                  <div
                                    className="absolute h-0.5 w-2"
                                    style={{
                                      backgroundColor: lineColor,
                                      left: '32px',
                                      top: `${midY}px`
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
