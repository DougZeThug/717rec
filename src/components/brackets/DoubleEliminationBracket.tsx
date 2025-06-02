
import React from "react";
import { SimpleBracketData } from "@/hooks/brackets/useBracketData";
import TournamentMatchCard from "./TournamentMatchCard";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

interface DoubleEliminationBracketProps {
  bracket: SimpleBracketData;
  onMatchClick?: (matchId: string) => void;
}

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

const DoubleEliminationBracket: React.FC<DoubleEliminationBracketProps> = ({ 
  bracket, 
  onMatchClick 
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Layout constants for mathematical positioning
  const MATCH_WIDTH = 192;
  const MATCH_HEIGHT = 80;
  const COLUMN_GAP = 80;
  const ROW_GAP = 24;
  const HEADER_HEIGHT = 60;

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

  // Transform bracket match to tournament match format
  const transformMatch = (match: any): TournamentMatch => {
    return {
      id: match.id,
      team1Name: match.team1Name || 'TBD',
      team2Name: match.team2Name || 'TBD',
      team1Logo: match.team1Logo,
      team2Logo: match.team2Logo,
      team1Score: match.team1Score,
      team2Score: match.team2Score,
      team1Seed: match.team1Seed,
      team2Seed: match.team2Seed,
      winnerId: match.winnerId,
      team1Id: match.team1Id,
      team2Id: match.team2Id,
      status: match.status || 'pending'
    };
  };

  // Calculate positions for winners bracket
  const calculateWinnersPositions = () => {
    const positions: Array<{match: any, x: number, y: number}> = [];
    
    winnerRounds.forEach((round, roundIndex) => {
      const roundMatches = winnersByRound[round].sort((a, b) => a.position - b.position);
      const x = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
      
      // Calculate vertical spacing - each round doubles the spacing
      const baseSpacing = MATCH_HEIGHT + ROW_GAP;
      const roundSpacing = Math.pow(2, roundIndex) * baseSpacing;
      
      roundMatches.forEach((match, matchIndex) => {
        const y = HEADER_HEIGHT + matchIndex * roundSpacing;
        positions.push({ match, x, y });
      });
    });
    
    return positions;
  };

  // Calculate positions for losers bracket
  const calculateLosersPositions = () => {
    const positions: Array<{match: any, x: number, y: number}> = [];
    const losersStartY = 400; // Position below winners bracket
    
    loserRounds.forEach((round, roundIndex) => {
      const roundMatches = losersByRound[round].sort((a, b) => a.position - b.position);
      const x = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
      
      // Tighter spacing for losers bracket
      const spacing = MATCH_HEIGHT + ROW_GAP / 2;
      
      roundMatches.forEach((match, matchIndex) => {
        const y = losersStartY + HEADER_HEIGHT + matchIndex * spacing;
        positions.push({ match, x, y });
      });
    });
    
    return positions;
  };

  // Calculate position for finals
  const calculateFinalsPosition = () => {
    if (finalMatches.length === 0) return null;
    
    const x = winnerRounds.length * (MATCH_WIDTH + COLUMN_GAP);
    const y = HEADER_HEIGHT + MATCH_HEIGHT + ROW_GAP; // Position between winners and losers
    
    return { match: finalMatches[0], x, y };
  };

  // Create connector lines
  const createConnectors = () => {
    const connectors = [];
    const lineColor = isDark ? "#6b7280" : "#9ca3af";
    
    // Winners bracket connectors
    for (let roundIndex = 0; roundIndex < winnerRounds.length - 1; roundIndex++) {
      const currentRound = winnerRounds[roundIndex];
      const currentMatches = winnersByRound[currentRound].sort((a, b) => a.position - b.position);
      
      const currentX = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
      const nextX = (roundIndex + 1) * (MATCH_WIDTH + COLUMN_GAP);
      
      const baseSpacing = MATCH_HEIGHT + ROW_GAP;
      const currentSpacing = Math.pow(2, roundIndex) * baseSpacing;
      const nextSpacing = Math.pow(2, roundIndex + 1) * baseSpacing;
      
      for (let i = 0; i < currentMatches.length; i += 2) {
        if (i + 1 < currentMatches.length) {
          const match1Y = HEADER_HEIGHT + i * currentSpacing + MATCH_HEIGHT / 2;
          const match2Y = HEADER_HEIGHT + (i + 1) * currentSpacing + MATCH_HEIGHT / 2;
          const targetY = HEADER_HEIGHT + (i / 2) * nextSpacing + MATCH_HEIGHT / 2;
          
          // L-shaped connector
          connectors.push(
            <g key={`winners-${roundIndex}-${i}`}>
              {/* Line from first match */}
              <line
                x1={currentX + MATCH_WIDTH}
                y1={match1Y}
                x2={currentX + MATCH_WIDTH + COLUMN_GAP / 2}
                y2={match1Y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Line from second match */}
              <line
                x1={currentX + MATCH_WIDTH}
                y1={match2Y}
                x2={currentX + MATCH_WIDTH + COLUMN_GAP / 2}
                y2={match2Y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Vertical connector */}
              <line
                x1={currentX + MATCH_WIDTH + COLUMN_GAP / 2}
                y1={match1Y}
                x2={currentX + MATCH_WIDTH + COLUMN_GAP / 2}
                y2={match2Y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Line to target match */}
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
    
    // Losers bracket connectors
    const losersStartY = 400;
    for (let roundIndex = 0; roundIndex < loserRounds.length - 1; roundIndex++) {
      const currentRound = loserRounds[roundIndex];
      const currentMatches = losersByRound[currentRound].sort((a, b) => a.position - b.position);
      
      const currentX = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
      const nextX = (roundIndex + 1) * (MATCH_WIDTH + COLUMN_GAP);
      const spacing = MATCH_HEIGHT + ROW_GAP / 2;
      
      for (let i = 0; i < currentMatches.length; i += 2) {
        if (i + 1 < currentMatches.length) {
          const match1Y = losersStartY + HEADER_HEIGHT + i * spacing + MATCH_HEIGHT / 2;
          const match2Y = losersStartY + HEADER_HEIGHT + (i + 1) * spacing + MATCH_HEIGHT / 2;
          const targetY = losersStartY + HEADER_HEIGHT + (i / 2) * spacing * 2 + MATCH_HEIGHT / 2;
          
          connectors.push(
            <g key={`losers-${roundIndex}-${i}`}>
              <line
                x1={currentX + MATCH_WIDTH}
                y1={match1Y}
                x2={currentX + MATCH_WIDTH + COLUMN_GAP / 2}
                y2={match1Y}
                stroke={lineColor}
                strokeWidth="2"
              />
              <line
                x1={currentX + MATCH_WIDTH}
                y1={match2Y}
                x2={currentX + MATCH_WIDTH + COLUMN_GAP / 2}
                y2={match2Y}
                stroke={lineColor}
                strokeWidth="2"
              />
              <line
                x1={currentX + MATCH_WIDTH + COLUMN_GAP / 2}
                y1={match1Y}
                x2={currentX + MATCH_WIDTH + COLUMN_GAP / 2}
                y2={match2Y}
                stroke={lineColor}
                strokeWidth="2"
              />
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
    
    // Finals connectors
    if (finalMatches.length > 0) {
      const finalsX = winnerRounds.length * (MATCH_WIDTH + COLUMN_GAP);
      const finalsY = HEADER_HEIGHT + MATCH_HEIGHT + ROW_GAP + MATCH_HEIGHT / 2;
      
      // From winners semifinal to finals
      if (winnerRounds.length > 0) {
        const winnersLastX = (winnerRounds.length - 1) * (MATCH_WIDTH + COLUMN_GAP);
        const winnersLastY = HEADER_HEIGHT + MATCH_HEIGHT / 2;
        
        connectors.push(
          <line
            key="winners-to-finals"
            x1={winnersLastX + MATCH_WIDTH}
            y1={winnersLastY}
            x2={finalsX}
            y2={finalsY}
            stroke={lineColor}
            strokeWidth="2"
          />
        );
      }
      
      // From losers final to finals
      if (loserRounds.length > 0) {
        const losersLastX = (loserRounds.length - 1) * (MATCH_WIDTH + COLUMN_GAP);
        const losersLastY = losersStartY + HEADER_HEIGHT + MATCH_HEIGHT / 2;
        
        connectors.push(
          <line
            key="losers-to-finals"
            x1={losersLastX + MATCH_WIDTH}
            y1={losersLastY}
            x2={finalsX}
            y2={finalsY}
            stroke={lineColor}
            strokeWidth="2"
          />
        );
      }
    }
    
    return connectors;
  };

  const winnersPositions = calculateWinnersPositions();
  const losersPositions = calculateLosersPositions();
  const finalsPosition = calculateFinalsPosition();
  const connectors = createConnectors();

  // Calculate total dimensions
  const totalWidth = Math.max(
    winnerRounds.length * (MATCH_WIDTH + COLUMN_GAP) + MATCH_WIDTH,
    finalMatches.length > 0 ? (winnerRounds.length + 1) * (MATCH_WIDTH + COLUMN_GAP) : 0
  );
  const totalHeight = 600; // Fixed height to accommodate both brackets

  return (
    <div 
      className={cn(
        "w-full rounded-lg p-6 transition-colors duration-300",
        isDark 
          ? "bg-gray-900 border border-gray-700" 
          : "bg-white border border-gray-200"
      )}
    >
      <div className="mb-6">
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

      <div className="overflow-auto">
        <div 
          className="relative"
          style={{ 
            width: `${totalWidth}px`, 
            height: `${totalHeight}px`,
            minWidth: 'max-content'
          }}
        >
          {/* Section Headers */}
          <div className="absolute top-0 left-0">
            <h3 className={cn(
              "text-lg font-semibold",
              isDark ? "text-blue-300" : "text-blue-800"
            )}>
              Winners Bracket
            </h3>
          </div>
          
          <div className="absolute top-80 left-0">
            <h3 className={cn(
              "text-lg font-semibold",
              isDark ? "text-orange-300" : "text-orange-800"
            )}>
              Losers Bracket
            </h3>
          </div>

          {/* Winners Bracket Matches */}
          {winnersPositions.map(({ match, x, y }, index) => (
            <div
              key={`winners-${match.id}`}
              className="absolute"
              style={{ left: `${x}px`, top: `${y}px` }}
            >
              <TournamentMatchCard
                match={transformMatch(match)}
                onMatchClick={onMatchClick}
                showSeeds={true}
                bracketType="winners"
                fixedHeight={true}
              />
            </div>
          ))}

          {/* Losers Bracket Matches */}
          {losersPositions.map(({ match, x, y }, index) => (
            <div
              key={`losers-${match.id}`}
              className="absolute"
              style={{ left: `${x}px`, top: `${y}px` }}
            >
              <TournamentMatchCard
                match={transformMatch(match)}
                onMatchClick={onMatchClick}
                showSeeds={false}
                bracketType="losers"
                fixedHeight={true}
              />
            </div>
          ))}

          {/* Finals Match */}
          {finalsPosition && (
            <div
              className="absolute"
              style={{ left: `${finalsPosition.x}px`, top: `${finalsPosition.y}px` }}
            >
              <div className="mb-2">
                <h3 className={cn(
                  "text-lg font-semibold text-center",
                  isDark ? "text-purple-300" : "text-purple-800"
                )}>
                  Finals
                </h3>
              </div>
              <TournamentMatchCard
                match={transformMatch(finalsPosition.match)}
                onMatchClick={onMatchClick}
                showSeeds={false}
                bracketType="finals"
                fixedHeight={true}
              />
            </div>
          )}

          {/* Connector Lines */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ overflow: 'visible' }}
          >
            {connectors}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default DoubleEliminationBracket;
