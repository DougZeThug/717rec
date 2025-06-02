
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

  // Constants for layout calculations
  const MATCH_WIDTH = 192; // w-48 = 192px
  const COLUMN_GAP = 64; // gap-16 = 64px
  const MATCH_HEIGHT = 80; // --match-height
  const MATCH_GAP = 16; // --match-gap

  // Helper function to create L-shaped connectors between rounds
  const createLShapedConnectors = (matches: any[], roundIndex: number, isLastRound: boolean, startX: number) => {
    if (isLastRound || matches.length <= 1) return [];

    const connectors = [];
    for (let i = 0; i < matches.length; i += 2) {
      if (i + 1 < matches.length) {
        // Calculate vertical positions for the two matches
        const verticalOffset = roundIndex === 0 ? 0 : Math.pow(2, roundIndex - 1) * (MATCH_HEIGHT + MATCH_GAP);
        const gapMultiplier = Math.pow(2, roundIndex);
        
        const match1Y = verticalOffset + i * (MATCH_HEIGHT + MATCH_GAP * gapMultiplier) + MATCH_HEIGHT / 2;
        const match2Y = verticalOffset + (i + 1) * (MATCH_HEIGHT + MATCH_GAP * gapMultiplier) + MATCH_HEIGHT / 2;
        const midY = (match1Y + match2Y) / 2;
        
        // Calculate horizontal positions
        const matchEndX = startX + MATCH_WIDTH;
        const horizontalExtend = COLUMN_GAP / 2;
        const nextMatchStartX = startX + MATCH_WIDTH + COLUMN_GAP;
        
        connectors.push(
          <g key={`connector-${roundIndex}-${i}`}>
            {/* Horizontal line from first match */}
            <line
              x1={matchEndX}
              y1={match1Y}
              x2={matchEndX + horizontalExtend}
              y2={match1Y}
              stroke={lineColor}
              strokeWidth="2"
            />
            {/* Horizontal line from second match */}
            <line
              x1={matchEndX}
              y1={match2Y}
              x2={matchEndX + horizontalExtend}
              y2={match2Y}
              stroke={lineColor}
              strokeWidth="2"
            />
            {/* Vertical connecting line */}
            <line
              x1={matchEndX + horizontalExtend}
              y1={match1Y}
              x2={matchEndX + horizontalExtend}
              y2={match2Y}
              stroke={lineColor}
              strokeWidth="2"
            />
            {/* Horizontal line to next round */}
            <line
              x1={matchEndX + horizontalExtend}
              y1={midY}
              x2={nextMatchStartX}
              y2={midY}
              stroke={lineColor}
              strokeWidth="2"
            />
          </g>
        );
      }
    }
    return connectors;
  };

  // Calculate all connector lines for winners bracket
  const winnersConnectors = winnerRounds.flatMap((round, roundIndex) => {
    const roundMatches = winnersByRound[round].sort((a, b) => a.position - b.position);
    const isLastRound = roundIndex === winnerRounds.length - 1;
    const startX = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
    return createLShapedConnectors(roundMatches, roundIndex, isLastRound, startX);
  });

  // Calculate all connector lines for losers bracket
  const losersConnectors = loserRounds.flatMap((round, roundIndex) => {
    const roundMatches = losersByRound[round].sort((a, b) => a.position - b.position);
    const isLastRound = roundIndex === loserRounds.length - 1;
    const startX = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
    return createLShapedConnectors(roundMatches, roundIndex, isLastRound, startX);
  });

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
        <div className="min-w-max relative">
          {/* Winners Bracket */}
          {winnerRounds.length > 0 && (
            <div className="mb-8">
              <div className="flex gap-16 items-start relative">
                {/* Winners Rounds */}
                {winnerRounds.map((round, roundIndex) => {
                  const roundMatches = winnersByRound[round].sort((a, b) => a.position - b.position);
                  const isLastRound = round === Math.max(...winnerRounds);
                  
                  // Calculate vertical offset
                  const getMarginTop = () => {
                    if (roundIndex === 0) return '0px';
                    return `calc(${Math.pow(2, roundIndex - 1)} * (var(--match-height) + var(--match-gap)))`;
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
                          gap: `calc(${Math.pow(2, roundIndex)} * var(--match-gap))`
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
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Finals Column */}
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
                      className="relative flex gap-4"
                      style={{ 
                        marginTop: `calc(${Math.pow(2, winnerRounds.length - 1)} * (var(--match-height) + var(--match-gap)))`
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
              <div className="flex gap-16 items-start relative">
                {loserRounds.map((round, roundIndex) => {
                  const roundMatches = losersByRound[round].sort((a, b) => a.position - b.position);
                  
                  // Calculate staggered vertical offset for losers rounds
                  const getMarginTop = () => {
                    if (roundIndex === 0) return '0px';
                    // Alternate pattern for losers bracket positioning
                    const stagger = Math.floor(roundIndex / 2);
                    return `calc(${stagger} * (var(--match-height) + var(--match-gap)))`;
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
                          gap: roundIndex % 2 === 0 ? 'calc(2 * var(--match-gap))' : 'var(--match-gap)'
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
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Single SVG overlay for all connector lines */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ 
              left: '0',
              top: '0',
              width: '100%',
              height: '100%',
              overflow: 'visible'
            }}
          >
            {/* Winners bracket connectors */}
            <g transform="translate(0, 60)">
              {winnersConnectors}
            </g>
            
            {/* Losers bracket connectors */}
            <g transform={`translate(0, ${winnerRounds.length > 0 ? 380 : 60})`}>
              {losersConnectors}
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default DoubleEliminationBracket;
