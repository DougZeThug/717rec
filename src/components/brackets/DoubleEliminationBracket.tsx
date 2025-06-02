
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
  const COLUMN_GAP = 48; // Gap between columns
  const MATCH_HEIGHT = 80; // --match-height
  const MATCH_GAP = 20; // Gap between matches
  const HEADER_HEIGHT = 60; // Header + margin

  // Helper function to create direct edge-to-edge connectors between rounds
  const createWinnersConnectors = () => {
    const connectors = [];
    
    for (let roundIndex = 0; roundIndex < winnerRounds.length - 1; roundIndex++) {
      const currentRound = winnerRounds[roundIndex];
      const currentMatches = winnersByRound[currentRound].sort((a, b) => a.position - b.position);
      
      // Calculate positions for current round
      const currentX = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
      const nextX = (roundIndex + 1) * (MATCH_WIDTH + COLUMN_GAP);
      
      // Group matches in pairs for connections
      for (let i = 0; i < currentMatches.length; i += 2) {
        if (i + 1 < currentMatches.length) {
          const match1 = currentMatches[i];
          const match2 = currentMatches[i + 1];
          
          // Calculate exact vertical positions based on exponential spacing
          const spacing = MATCH_HEIGHT + MATCH_GAP;
          const roundSpacing = Math.pow(2, roundIndex) * spacing;
          
          const match1Y = HEADER_HEIGHT + i * roundSpacing + MATCH_HEIGHT / 2;
          const match2Y = HEADER_HEIGHT + (i + 1) * roundSpacing + MATCH_HEIGHT / 2;
          
          // Calculate target match Y position
          const targetSpacing = Math.pow(2, roundIndex + 1) * spacing;
          const targetY = HEADER_HEIGHT + (i / 2) * targetSpacing + MATCH_HEIGHT / 2;
          
          // Direct edge-to-edge connections with L-shape
          connectors.push(
            <g key={`winners-connector-${roundIndex}-${i}`}>
              {/* Horizontal line from first match right edge */}
              <line
                x1={currentX + MATCH_WIDTH}
                y1={match1Y}
                x2={currentX + MATCH_WIDTH + COLUMN_GAP / 2}
                y2={match1Y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Horizontal line from second match right edge */}
              <line
                x1={currentX + MATCH_WIDTH}
                y1={match2Y}
                x2={currentX + MATCH_WIDTH + COLUMN_GAP / 2}
                y2={match2Y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Vertical connecting line */}
              <line
                x1={currentX + MATCH_WIDTH + COLUMN_GAP / 2}
                y1={match1Y}
                x2={currentX + MATCH_WIDTH + COLUMN_GAP / 2}
                y2={match2Y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Horizontal line to next round left edge */}
              <line
                x1={currentX + MATCH_WIDTH + COLUMN_GAP / 2}
                y1={targetY}
                x2={nextX}
                y2={targetY}
                stroke={lineColor}
                strokeWidth="2"
              />
            </g>
          );
        }
      }
    }
    
    return connectors;
  };

  // Helper function to create losers bracket connectors
  const createLosersConnectors = () => {
    const connectors = [];
    const losersStartY = 300; // Position losers bracket below winners
    
    for (let roundIndex = 0; roundIndex < loserRounds.length - 1; roundIndex++) {
      const currentRound = loserRounds[roundIndex];
      const currentMatches = losersByRound[currentRound].sort((a, b) => a.position - b.position);
      
      // Calculate positions for current round
      const currentX = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
      const nextX = (roundIndex + 1) * (MATCH_WIDTH + COLUMN_GAP);
      
      // Losers bracket has tighter spacing
      for (let i = 0; i < currentMatches.length; i += 2) {
        if (i + 1 < currentMatches.length) {
          const spacing = MATCH_HEIGHT + MATCH_GAP / 2; // Tighter in losers
          const baseY = losersStartY + HEADER_HEIGHT;
          
          const match1Y = baseY + i * spacing + MATCH_HEIGHT / 2;
          const match2Y = baseY + (i + 1) * spacing + MATCH_HEIGHT / 2;
          const targetY = baseY + (i / 2) * spacing * 2 + MATCH_HEIGHT / 2;
          
          // Direct edge-to-edge connections
          connectors.push(
            <g key={`losers-connector-${roundIndex}-${i}`}>
              {/* Horizontal line from first match right edge */}
              <line
                x1={currentX + MATCH_WIDTH}
                y1={match1Y}
                x2={currentX + MATCH_WIDTH + COLUMN_GAP / 2}
                y2={match1Y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Horizontal line from second match right edge */}
              <line
                x1={currentX + MATCH_WIDTH}
                y1={match2Y}
                x2={currentX + MATCH_WIDTH + COLUMN_GAP / 2}
                y2={match2Y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Vertical connecting line */}
              <line
                x1={currentX + MATCH_WIDTH + COLUMN_GAP / 2}
                y1={match1Y}
                x2={currentX + MATCH_WIDTH + COLUMN_GAP / 2}
                y2={match2Y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Horizontal line to next round left edge */}
              <line
                x1={currentX + MATCH_WIDTH + COLUMN_GAP / 2}
                y1={targetY}
                x2={nextX}
                y2={targetY}
                stroke={lineColor}
                strokeWidth="2"
              />
            </g>
          );
        }
      }
    }
    
    return connectors;
  };

  // Connect winners bracket to finals and losers to finals
  const createFinalsConnectors = () => {
    const connectors = [];
    
    if (finalMatches.length === 0) return connectors;
    
    const finalsX = winnerRounds.length * (MATCH_WIDTH + COLUMN_GAP);
    const finalsY = HEADER_HEIGHT + MATCH_HEIGHT + MATCH_GAP + MATCH_HEIGHT / 2; // Position finals higher
    
    // Connect winners bracket semifinal to finals
    if (winnerRounds.length > 0) {
      const winnersLastRound = winnerRounds[winnerRounds.length - 1];
      const winnersLastMatches = winnersByRound[winnersLastRound];
      
      if (winnersLastMatches.length > 0) {
        const winnersLastX = (winnerRounds.length - 1) * (MATCH_WIDTH + COLUMN_GAP);
        const winnersLastY = HEADER_HEIGHT + MATCH_HEIGHT / 2;
        
        connectors.push(
          <g key="winners-to-finals">
            <line
              x1={winnersLastX + MATCH_WIDTH}
              y1={winnersLastY}
              x2={finalsX}
              y2={finalsY}
              stroke={lineColor}
              strokeWidth="2"
            />
          </g>
        );
      }
    }
    
    // Connect losers bracket final to finals
    if (loserRounds.length > 0) {
      const losersLastRound = loserRounds[loserRounds.length - 1];
      const losersLastMatches = losersByRound[losersLastRound];
      
      if (losersLastMatches.length > 0) {
        const losersLastX = (loserRounds.length - 1) * (MATCH_WIDTH + COLUMN_GAP);
        const losersStartY = 300; // Match the losers bracket start position
        const losersLastY = losersStartY + HEADER_HEIGHT + MATCH_HEIGHT / 2;
        
        connectors.push(
          <g key="losers-to-finals">
            <line
              x1={losersLastX + MATCH_WIDTH}
              y1={losersLastY}
              x2={finalsX}
              y2={finalsY}
              stroke={lineColor}
              strokeWidth="2"
            />
          </g>
        );
      }
    }
    
    return connectors;
  };

  return (
    <div 
      className={cn(
        "w-full rounded-lg p-4 transition-colors duration-300",
        isDark 
          ? "bg-gray-900 border border-gray-700" 
          : "bg-white border border-gray-200"
      )}
      style={{
        '--match-height': `${MATCH_HEIGHT}px`,
        '--match-gap': `${MATCH_GAP}px`
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
              <div className="flex gap-12 items-start relative">
                {/* Winners Rounds */}
                {winnerRounds.map((round, roundIndex) => {
                  const roundMatches = winnersByRound[round].sort((a, b) => a.position - b.position);
                  
                  // Calculate vertical spacing based on round
                  const spacing = MATCH_HEIGHT + MATCH_GAP;
                  const roundSpacing = Math.pow(2, roundIndex) * spacing;

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
                      <div className="relative flex flex-col">
                        {roundMatches.map((match, matchIndex) => (
                          <div 
                            key={match.id} 
                            className="relative"
                            style={{
                              marginBottom: matchIndex < roundMatches.length - 1 ? `${roundSpacing - MATCH_HEIGHT}px` : '0'
                            }}
                          >
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
                        marginTop: `${MATCH_HEIGHT + MATCH_GAP}px` // Position finals higher
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
              <div className="flex gap-12 items-start relative">
                {loserRounds.map((round, roundIndex) => {
                  const roundMatches = losersByRound[round].sort((a, b) => a.position - b.position);
                  
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
                      <div className="relative flex flex-col">
                        {roundMatches.map((match, matchIndex) => (
                          <div 
                            key={match.id} 
                            className="relative"
                            style={{
                              marginBottom: matchIndex < roundMatches.length - 1 ? `${MATCH_GAP / 2}px` : '0'
                            }}
                          >
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
            {createWinnersConnectors()}
            
            {/* Losers bracket connectors */}
            {createLosersConnectors()}
            
            {/* Finals connectors */}
            {createFinalsConnectors()}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default DoubleEliminationBracket;
