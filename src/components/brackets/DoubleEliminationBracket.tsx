
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

  // Group matches by round for winners
  const winnersByRound = winnerMatches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, typeof winnerMatches>);

  // Group matches by round for losers
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

  // Helper function to get grid position for winners matches
  const getWinnersGridPosition = (round: number, position: number, totalRounds: number) => {
    const roundIndex = winnerRounds.indexOf(round);
    let gridRow: number;
    let gridColumn: number = roundIndex + 1;

    if (roundIndex === 0) {
      // Round 1: positions 1, 3, 5, 7
      gridRow = (position * 2) - 1;
    } else if (roundIndex === totalRounds - 1) {
      // Finals: position 4
      gridRow = 4;
      gridColumn = totalRounds + 1; // Finals column
    } else {
      // Semifinals: positions 2, 6
      gridRow = position === 0 ? 2 : 6;
    }

    return { gridRow, gridColumn };
  };

  // Helper function to get grid position for losers matches
  const getLosersGridPosition = (round: number, position: number, totalRounds: number) => {
    const roundIndex = loserRounds.indexOf(round);
    let gridRow: number;
    let gridColumn: number = roundIndex + 1;

    // Losers bracket has different positioning patterns
    if (roundIndex === 0) {
      // Losers Round 1: positions 1, 3
      gridRow = (position * 2) + 1;
    } else if (roundIndex === 1) {
      // Losers Round 2: positions 2, 4
      gridRow = (position * 2) + 2;
    } else if (roundIndex === 2) {
      // Losers Round 3: position 3 or 5
      gridRow = position === 0 ? 3 : 5;
    } else {
      // Losers Round 4: position 4
      gridRow = 4;
    }

    return { gridRow, gridColumn };
  };

  // Helper function to create connector lines
  const createConnectorLines = () => {
    const connectors = [];
    const MATCH_HEIGHT = 80;
    const MATCH_GAP = 16;
    const COLUMN_GAP = 40;
    const MATCH_WIDTH = 200;

    // Calculate position from grid coordinates
    const getPositionFromGrid = (gridRow: number, gridColumn: number) => {
      const x = (gridColumn - 1) * (MATCH_WIDTH + COLUMN_GAP);
      const y = (gridRow - 1) * (MATCH_HEIGHT + MATCH_GAP) + MATCH_HEIGHT / 2;
      return { x, y };
    };

    // Winners bracket connectors
    for (let roundIndex = 0; roundIndex < winnerRounds.length - 1; roundIndex++) {
      const currentRound = winnerRounds[roundIndex];
      const currentMatches = winnersByRound[currentRound].sort((a, b) => a.position - b.position);
      
      for (let i = 0; i < currentMatches.length; i += 2) {
        if (i + 1 < currentMatches.length) {
          const match1 = currentMatches[i];
          const match2 = currentMatches[i + 1];
          
          const pos1 = getWinnersGridPosition(currentRound, i, winnerRounds.length);
          const pos2 = getWinnersGridPosition(currentRound, i + 1, winnerRounds.length);
          const targetPos = getWinnersGridPosition(winnerRounds[roundIndex + 1], Math.floor(i / 2), winnerRounds.length);
          
          const start1 = getPositionFromGrid(pos1.gridRow, pos1.gridColumn);
          const start2 = getPositionFromGrid(pos2.gridRow, pos2.gridColumn);
          const target = getPositionFromGrid(targetPos.gridRow, targetPos.gridColumn);
          
          const midX = start1.x + MATCH_WIDTH + COLUMN_GAP / 2;
          const midY = (start1.y + start2.y) / 2;
          
          connectors.push(
            <g key={`winners-connector-${roundIndex}-${i}`}>
              {/* Horizontal line from first match */}
              <line
                x1={start1.x + MATCH_WIDTH}
                y1={start1.y}
                x2={midX}
                y2={start1.y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Horizontal line from second match */}
              <line
                x1={start2.x + MATCH_WIDTH}
                y1={start2.y}
                x2={midX}
                y2={start2.y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Vertical connecting line */}
              <line
                x1={midX}
                y1={start1.y}
                x2={midX}
                y2={start2.y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Horizontal line to next match */}
              <line
                x1={midX}
                y1={midY}
                x2={target.x}
                y2={target.y}
                stroke={lineColor}
                strokeWidth="2"
              />
            </g>
          );
        }
      }
    }

    // Losers bracket connectors
    for (let roundIndex = 0; roundIndex < loserRounds.length - 1; roundIndex++) {
      const currentRound = loserRounds[roundIndex];
      const currentMatches = losersByRound[currentRound].sort((a, b) => a.position - b.position);
      
      for (let i = 0; i < currentMatches.length; i += 2) {
        if (i + 1 < currentMatches.length) {
          const match1 = currentMatches[i];
          const match2 = currentMatches[i + 1];
          
          const pos1 = getLosersGridPosition(currentRound, i, loserRounds.length);
          const pos2 = getLosersGridPosition(currentRound, i + 1, loserRounds.length);
          const targetPos = getLosersGridPosition(loserRounds[roundIndex + 1], Math.floor(i / 2), loserRounds.length);
          
          const start1 = getPositionFromGrid(pos1.gridRow, pos1.gridColumn);
          const start2 = getPositionFromGrid(pos2.gridRow, pos2.gridColumn);
          const target = getPositionFromGrid(targetPos.gridRow, targetPos.gridColumn);
          
          const midX = start1.x + MATCH_WIDTH + COLUMN_GAP / 2;
          const midY = (start1.y + start2.y) / 2;
          
          connectors.push(
            <g key={`losers-connector-${roundIndex}-${i}`}>
              {/* Horizontal line from first match */}
              <line
                x1={start1.x + MATCH_WIDTH}
                y1={start1.y}
                x2={midX}
                y2={start1.y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Horizontal line from second match */}
              <line
                x1={start2.x + MATCH_WIDTH}
                y1={start2.y}
                x2={midX}
                y2={start2.y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Vertical connecting line */}
              <line
                x1={midX}
                y1={start1.y}
                x2={midX}
                y2={start2.y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Horizontal line to next match */}
              <line
                x1={midX}
                y1={midY}
                x2={target.x}
                y2={target.y}
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
        '--match-gap': '16px',
        '--column-gap': '40px',
        '--match-width': '200px'
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
              <div className="relative">
                {/* Round Headers */}
                <div className="winners-headers grid gap-[var(--column-gap)] mb-4" 
                     style={{
                       gridTemplateColumns: `repeat(${winnerRounds.length + 1}, var(--match-width))`,
                     }}>
                  {winnerRounds.map((round, roundIndex) => (
                    <div key={round} className="text-center">
                      <h3 className={cn(
                        "text-sm font-semibold transition-colors duration-300",
                        isDark ? "text-blue-300" : "text-blue-800"
                      )}>
                        {roundIndex === winnerRounds.length - 1 ? "Semifinals" : `Round ${round}`}
                      </h3>
                    </div>
                  ))}
                  {finalMatches.length > 0 && (
                    <div className="text-center">
                      <h3 className={cn(
                        "text-sm font-semibold transition-colors duration-300",
                        isDark ? "text-purple-300" : "text-purple-800"
                      )}>
                        Finals
                      </h3>
                    </div>
                  )}
                </div>

                {/* Winners Grid */}
                <div className="winners-bracket grid relative" 
                     style={{
                       gridTemplateColumns: `repeat(${winnerRounds.length + 1}, var(--match-width))`,
                       gridTemplateRows: 'repeat(7, var(--match-height))',
                       rowGap: 'var(--match-gap)',
                       columnGap: 'var(--column-gap)',
                     }}>
                  {winnerRounds.map((round, roundIndex) => {
                    const roundMatches = winnersByRound[round].sort((a, b) => a.position - b.position);
                    return roundMatches.map((match, matchIndex) => {
                      const { gridRow, gridColumn } = getWinnersGridPosition(round, matchIndex, winnerRounds.length);
                      return (
                        <div 
                          key={match.id}
                          className="match-wrapper"
                          style={{
                            gridRow: gridRow,
                            gridColumn: gridColumn,
                            width: 'var(--match-width)',
                            height: 'var(--match-height)',
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
                      );
                    });
                  })}
                  
                  {/* Finals matches */}
                  {finalMatches.map((match, index) => (
                    <div 
                      key={match.id}
                      className="match-wrapper"
                      style={{
                        gridRow: 4,
                        gridColumn: winnerRounds.length + 1,
                        width: 'var(--match-width)',
                        height: 'var(--match-height)',
                      }}
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
          )}

          {/* Losers Bracket */}
          {loserRounds.length > 0 && (
            <div style={{ marginTop: '80px' }}>
              <div className="relative">
                {/* Losers Headers */}
                <div className="losers-headers grid gap-[var(--column-gap)] mb-4" 
                     style={{
                       gridTemplateColumns: `repeat(${loserRounds.length}, var(--match-width))`,
                     }}>
                  {loserRounds.map((round) => (
                    <div key={round} className="text-center">
                      <h3 className={cn(
                        "text-sm font-semibold transition-colors duration-300",
                        isDark ? "text-orange-300" : "text-orange-800"
                      )}>
                        Losers Round {round}
                      </h3>
                    </div>
                  ))}
                </div>

                {/* Losers Grid */}
                <div className="losers-bracket grid relative" 
                     style={{
                       gridTemplateColumns: `repeat(${loserRounds.length}, var(--match-width))`,
                       gridTemplateRows: 'repeat(7, var(--match-height))',
                       rowGap: 'var(--match-gap)',
                       columnGap: 'var(--column-gap)',
                     }}>
                  {loserRounds.map((round) => {
                    const roundMatches = losersByRound[round].sort((a, b) => a.position - b.position);
                    return roundMatches.map((match, matchIndex) => {
                      const { gridRow, gridColumn } = getLosersGridPosition(round, matchIndex, loserRounds.length);
                      return (
                        <div 
                          key={match.id}
                          className="match-wrapper"
                          style={{
                            gridRow: gridRow,
                            gridColumn: gridColumn,
                            width: 'var(--match-width)',
                            height: 'var(--match-height)',
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
                      );
                    });
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Connector Lines SVG */}
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
            {createConnectorLines()}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default DoubleEliminationBracket;
