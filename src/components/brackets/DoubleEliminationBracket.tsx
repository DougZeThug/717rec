
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

  // Layout constants based on reference image
  const MATCH_WIDTH = 192; // w-48 = 192px
  const MATCH_HEIGHT = 80;
  const COLUMN_GAP = 96; // Wider gap for connectors
  const HEADER_HEIGHT = 60;
  const WINNERS_TOP_OFFSET = 100;
  const LOSERS_TOP_OFFSET = 450; // Position losers bracket below winners

  // Calculate match positions for winners bracket
  const getWinnersMatchPosition = (roundIndex: number, matchIndex: number) => {
    const x = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
    const verticalSpacing = Math.pow(2, roundIndex) * 60;
    const y = WINNERS_TOP_OFFSET + matchIndex * (MATCH_HEIGHT + verticalSpacing);
    return { x, y };
  };

  // Calculate match positions for losers bracket
  const getLosersMatchPosition = (roundIndex: number, matchIndex: number) => {
    const x = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
    const y = LOSERS_TOP_OFFSET + matchIndex * (MATCH_HEIGHT + 40);
    return { x, y };
  };

  // Calculate finals positions
  const getFinalsPosition = (matchIndex: number) => {
    const finalsX = winnerRounds.length * (MATCH_WIDTH + COLUMN_GAP);
    const y = WINNERS_TOP_OFFSET + 120 + matchIndex * (MATCH_HEIGHT + 20);
    return { x: finalsX, y };
  };

  // Create winners bracket connectors
  const createWinnersConnectors = () => {
    const connectors = [];
    
    for (let roundIndex = 0; roundIndex < winnerRounds.length - 1; roundIndex++) {
      const currentRound = winnerRounds[roundIndex];
      const currentMatches = winnersByRound[currentRound].sort((a, b) => a.position - b.position);
      
      // Group matches in pairs for connections
      for (let i = 0; i < currentMatches.length; i += 2) {
        if (i + 1 < currentMatches.length) {
          const match1Pos = getWinnersMatchPosition(roundIndex, i);
          const match2Pos = getWinnersMatchPosition(roundIndex, i + 1);
          const nextMatchPos = getWinnersMatchPosition(roundIndex + 1, Math.floor(i / 2));
          
          const match1Center = { x: match1Pos.x + MATCH_WIDTH, y: match1Pos.y + MATCH_HEIGHT / 2 };
          const match2Center = { x: match2Pos.x + MATCH_WIDTH, y: match2Pos.y + MATCH_HEIGHT / 2 };
          const nextMatchCenter = { x: nextMatchPos.x, y: nextMatchPos.y + MATCH_HEIGHT / 2 };
          
          const midX = match1Center.x + COLUMN_GAP / 2;
          const midY = (match1Center.y + match2Center.y) / 2;
          
          connectors.push(
            <g key={`winners-${roundIndex}-${i}`}>
              {/* Horizontal lines from matches */}
              <line
                x1={match1Center.x}
                y1={match1Center.y}
                x2={midX}
                y2={match1Center.y}
                stroke={lineColor}
                strokeWidth="2"
              />
              <line
                x1={match2Center.x}
                y1={match2Center.y}
                x2={midX}
                y2={match2Center.y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Vertical connector */}
              <line
                x1={midX}
                y1={match1Center.y}
                x2={midX}
                y2={match2Center.y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Line to next match */}
              <line
                x1={midX}
                y1={midY}
                x2={nextMatchCenter.x}
                y2={nextMatchCenter.y}
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

  // Create losers bracket connectors
  const createLosersConnectors = () => {
    const connectors = [];
    
    for (let roundIndex = 0; roundIndex < loserRounds.length - 1; roundIndex++) {
      const currentRound = loserRounds[roundIndex];
      const currentMatches = losersByRound[currentRound].sort((a, b) => a.position - b.position);
      
      for (let i = 0; i < currentMatches.length; i += 2) {
        if (i + 1 < currentMatches.length) {
          const match1Pos = getLosersMatchPosition(roundIndex, i);
          const match2Pos = getLosersMatchPosition(roundIndex, i + 1);
          const nextMatchPos = getLosersMatchPosition(roundIndex + 1, Math.floor(i / 2));
          
          const match1Center = { x: match1Pos.x + MATCH_WIDTH, y: match1Pos.y + MATCH_HEIGHT / 2 };
          const match2Center = { x: match2Pos.x + MATCH_WIDTH, y: match2Pos.y + MATCH_HEIGHT / 2 };
          const nextMatchCenter = { x: nextMatchPos.x, y: nextMatchPos.y + MATCH_HEIGHT / 2 };
          
          const midX = match1Center.x + COLUMN_GAP / 2;
          const midY = (match1Center.y + match2Center.y) / 2;
          
          connectors.push(
            <g key={`losers-${roundIndex}-${i}`}>
              <line
                x1={match1Center.x}
                y1={match1Center.y}
                x2={midX}
                y2={match1Center.y}
                stroke={lineColor}
                strokeWidth="2"
              />
              <line
                x1={match2Center.x}
                y1={match2Center.y}
                x2={midX}
                y2={match2Center.y}
                stroke={lineColor}
                strokeWidth="2"
              />
              <line
                x1={midX}
                y1={match1Center.y}
                x2={midX}
                y2={match2Center.y}
                stroke={lineColor}
                strokeWidth="2"
              />
              <line
                x1={midX}
                y1={midY}
                x2={nextMatchCenter.x}
                y2={nextMatchCenter.y}
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

  // Create cross-bracket connections (winners losers drop to losers bracket)
  const createCrossConnectors = () => {
    const connectors = [];
    
    // Connect winners bracket losers to losers bracket
    if (winnerRounds.length > 0 && loserRounds.length > 0) {
      winnerRounds.forEach((round, roundIndex) => {
        const winnersMatches = winnersByRound[round];
        
        winnersMatches.forEach((match, matchIndex) => {
          // Find corresponding losers bracket entry point
          const correspondingLosersRound = Math.floor(roundIndex / 2) + 1;
          if (losersByRound[correspondingLosersRound]) {
            const winnersPos = getWinnersMatchPosition(roundIndex, matchIndex);
            const losersPos = getLosersMatchPosition(correspondingLosersRound - 1, matchIndex);
            
            const winnersCenter = { x: winnersPos.x + MATCH_WIDTH / 2, y: winnersPos.y + MATCH_HEIGHT };
            const losersCenter = { x: losersPos.x + MATCH_WIDTH / 2, y: losersPos.y };
            
            connectors.push(
              <line
                key={`cross-${roundIndex}-${matchIndex}`}
                x1={winnersCenter.x}
                y1={winnersCenter.y}
                x2={losersCenter.x}
                y2={losersCenter.y}
                stroke={lineColor}
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.6"
              />
            );
          }
        });
      });
    }
    
    return connectors;
  };

  // Create finals connectors
  const createFinalsConnectors = () => {
    const connectors = [];
    
    if (winnerRounds.length > 0 && finalMatches.length > 0) {
      // Connect winners bracket winner to finals
      const lastWinnersRound = winnerRounds[winnerRounds.length - 1];
      const lastWinnersMatches = winnersByRound[lastWinnersRound];
      
      if (lastWinnersMatches.length > 0) {
        const winnersPos = getWinnersMatchPosition(winnerRounds.length - 1, 0);
        const finalsPos = getFinalsPosition(0);
        
        const winnersCenter = { x: winnersPos.x + MATCH_WIDTH, y: winnersPos.y + MATCH_HEIGHT / 2 };
        const finalsCenter = { x: finalsPos.x, y: finalsPos.y + MATCH_HEIGHT / 2 };
        
        connectors.push(
          <line
            key="winners-to-finals"
            x1={winnersCenter.x}
            y1={winnersCenter.y}
            x2={finalsCenter.x}
            y2={finalsCenter.y}
            stroke={lineColor}
            strokeWidth="2"
          />
        );
      }
    }
    
    if (loserRounds.length > 0 && finalMatches.length > 0) {
      // Connect losers bracket winner to finals
      const lastLosersRound = loserRounds[loserRounds.length - 1];
      const lastLosersMatches = losersByRound[lastLosersRound];
      
      if (lastLosersMatches.length > 0) {
        const losersPos = getLosersMatchPosition(loserRounds.length - 1, 0);
        const finalsPos = getFinalsPosition(finalMatches.length > 1 ? 1 : 0);
        
        const losersCenter = { x: losersPos.x + MATCH_WIDTH, y: losersPos.y + MATCH_HEIGHT / 2 };
        const finalsCenter = { x: finalsPos.x, y: finalsPos.y + MATCH_HEIGHT / 2 };
        
        connectors.push(
          <line
            key="losers-to-finals"
            x1={losersCenter.x}
            y1={losersCenter.y}
            x2={finalsCenter.x}
            y2={finalsCenter.y}
            stroke={lineColor}
            strokeWidth="2"
          />
        );
      }
    }
    
    return connectors;
  };

  const getRoundLabel = (roundIndex: number, type: 'winners' | 'losers' | 'finals') => {
    if (type === 'finals') return 'Finals';
    if (type === 'winners') {
      if (roundIndex === winnerRounds.length - 1) return 'Semifinals';
      return `Round ${roundIndex + 1}`;
    }
    return `Losers Round ${roundIndex + 1}`;
  };

  return (
    <div 
      className={cn(
        "w-full rounded-lg p-4 transition-colors duration-300",
        isDark 
          ? "bg-gray-900 border border-gray-700" 
          : "bg-white border border-gray-200"
      )}
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
        <div className="relative" style={{ width: '1200px', height: '800px' }}>
          {/* Winners Bracket */}
          {winnerRounds.map((round, roundIndex) => {
            const roundMatches = winnersByRound[round].sort((a, b) => a.position - b.position);
            
            return (
              <div key={`winners-${round}`} className="absolute">
                {/* Round Header */}
                <div 
                  className="text-center mb-4"
                  style={{ 
                    left: `${roundIndex * (MATCH_WIDTH + COLUMN_GAP)}px`,
                    top: `${WINNERS_TOP_OFFSET - 50}px`,
                    width: `${MATCH_WIDTH}px`
                  }}
                >
                  <h3 className={cn(
                    "text-sm font-semibold transition-colors duration-300",
                    isDark ? "text-blue-300" : "text-blue-800"
                  )}>
                    {getRoundLabel(roundIndex, 'winners')}
                  </h3>
                </div>

                {/* Matches */}
                {roundMatches.map((match, matchIndex) => {
                  const pos = getWinnersMatchPosition(roundIndex, matchIndex);
                  return (
                    <div
                      key={match.id}
                      className="absolute"
                      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                    >
                      <TournamentMatchCard
                        match={match}
                        onMatchClick={onMatchClick}
                        showSeeds={roundIndex === 0}
                        bracketType="winners"
                        fixedHeight={true}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Losers Bracket */}
          {loserRounds.map((round, roundIndex) => {
            const roundMatches = losersByRound[round].sort((a, b) => a.position - b.position);
            
            return (
              <div key={`losers-${round}`} className="absolute">
                {/* Round Header */}
                <div 
                  className="text-center mb-4"
                  style={{ 
                    left: `${roundIndex * (MATCH_WIDTH + COLUMN_GAP)}px`,
                    top: `${LOSERS_TOP_OFFSET - 50}px`,
                    width: `${MATCH_WIDTH}px`
                  }}
                >
                  <h3 className={cn(
                    "text-sm font-semibold transition-colors duration-300",
                    isDark ? "text-orange-300" : "text-orange-800"
                  )}>
                    {getRoundLabel(roundIndex, 'losers')}
                  </h3>
                </div>

                {/* Matches */}
                {roundMatches.map((match, matchIndex) => {
                  const pos = getLosersMatchPosition(roundIndex, matchIndex);
                  return (
                    <div
                      key={match.id}
                      className="absolute"
                      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                    >
                      <TournamentMatchCard
                        match={match}
                        onMatchClick={onMatchClick}
                        showSeeds={false}
                        bracketType="losers"
                        fixedHeight={true}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Finals */}
          {finalMatches.length > 0 && (
            <div className="absolute">
              {/* Finals Header */}
              <div 
                className="text-center mb-4"
                style={{ 
                  left: `${winnerRounds.length * (MATCH_WIDTH + COLUMN_GAP)}px`,
                  top: `${WINNERS_TOP_OFFSET - 50}px`,
                  width: `${MATCH_WIDTH}px`
                }}
              >
                <h3 className={cn(
                  "text-sm font-semibold transition-colors duration-300",
                  isDark ? "text-purple-300" : "text-purple-800"
                )}>
                  Finals
                </h3>
              </div>

              {/* Finals Matches */}
              {finalMatches.map((match, matchIndex) => {
                const pos = getFinalsPosition(matchIndex);
                return (
                  <div
                    key={match.id}
                    className="absolute"
                    style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
                  >
                    <TournamentMatchCard
                      match={match}
                      onMatchClick={onMatchClick}
                      showSeeds={false}
                      bracketType="finals"
                      fixedHeight={true}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* SVG overlay for all connector lines */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 1 }}
          >
            {/* Winners bracket connectors */}
            {createWinnersConnectors()}
            
            {/* Losers bracket connectors */}
            {createLosersConnectors()}
            
            {/* Cross-bracket connections */}
            {createCrossConnectors()}
            
            {/* Finals connectors */}
            {createFinalsConnectors()}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default DoubleEliminationBracket;
