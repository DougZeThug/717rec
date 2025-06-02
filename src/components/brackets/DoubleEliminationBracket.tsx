
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

  // Helper function to get exact position for winners matches
  const getWinnersPosition = (round: number, position: number) => {
    const roundIndex = winnerRounds.indexOf(round);
    let top: string;
    let left: string;

    if (roundIndex === 0) {
      // Round 1: positions at exact intervals
      top = `calc((var(--match-height) + var(--match-gap)) * ${position})`;
      left = "0px";
    } else if (roundIndex === winnerRounds.length - 1) {
      // Finals: centered between semifinals
      top = `calc((var(--match-height) + var(--match-gap)) * 1.5 - var(--match-height) / 2 + var(--match-gap) / 2)`;
      left = `calc(var(--col-width) * 2)`;
    } else {
      // Semifinals: halfway between round 1 pairs
      if (position === 0) {
        top = `calc((var(--match-height) + var(--match-gap)) * 0.5 - var(--match-height) / 2 + var(--match-gap) / 2)`;
      } else {
        top = `calc((var(--match-height) + var(--match-gap)) * 2.5 - var(--match-height) / 2 + var(--match-gap) / 2)`;
      }
      left = `var(--col-width)`;
    }

    return { top, left };
  };

  // Helper function to get exact position for losers matches
  const getLosersPosition = (round: number, position: number) => {
    const roundIndex = loserRounds.indexOf(round);
    let top: string;
    let left: string;

    if (roundIndex === 0) {
      // Losers Round 1: between winner round 1 slots
      top = `calc((var(--match-height) + var(--match-gap)) * ${position} + var(--match-height) / 2 + var(--match-gap) / 2)`;
      left = `calc(var(--col-width) * 3)`;
    } else if (roundIndex === 1) {
      // Losers Round 2: midpoint between losers R1 pairs
      if (position === 0) {
        top = `calc((var(--match-height) + var(--match-gap)) * 0.5)`;
      } else {
        top = `calc((var(--match-height) + var(--match-gap)) * 2.5)`;
      }
      left = `calc(var(--col-width) * 4)`;
    } else if (roundIndex === 2) {
      // Losers Round 3: center between losers R2
      top = `calc((var(--match-height) + var(--match-gap)) * 1.5 - var(--match-height) / 2)`;
      left = `calc(var(--col-width) * 5)`;
    } else {
      // Losers Round 4: final losers bracket
      top = `calc((var(--match-height) + var(--match-gap)) * 1.5 - var(--match-height) / 2)`;
      left = `calc(var(--col-width) * 6)`;
    }

    return { top, left };
  };

  // Helper function to create precise connector lines
  const createConnectorLines = () => {
    const connectors = [];
    
    // Calculate position from CSS calc values
    const getPositionFromCalc = (topCalc: string, leftCalc: string) => {
      // For simplicity, we'll use approximate pixel values for SVG positioning
      // In a real implementation, you'd parse the calc() expressions
      const MATCH_HEIGHT = 100;
      const MATCH_GAP = 40;
      const COL_WIDTH = 300;
      const MATCH_WIDTH = 260;
      
      // Parse basic calc expressions for positioning
      let x = 0;
      let y = 0;
      
      if (leftCalc === "0px") x = 0;
      else if (leftCalc === "var(--col-width)") x = COL_WIDTH;
      else if (leftCalc === "calc(var(--col-width) * 2)") x = COL_WIDTH * 2;
      else if (leftCalc === "calc(var(--col-width) * 3)") x = COL_WIDTH * 3;
      else if (leftCalc === "calc(var(--col-width) * 4)") x = COL_WIDTH * 4;
      else if (leftCalc === "calc(var(--col-width) * 5)") x = COL_WIDTH * 5;
      else if (leftCalc === "calc(var(--col-width) * 6)") x = COL_WIDTH * 6;
      
      // Approximate y calculations based on common patterns
      if (topCalc.includes("* 0)")) y = 0 + MATCH_HEIGHT / 2;
      else if (topCalc.includes("* 1)")) y = (MATCH_HEIGHT + MATCH_GAP) + MATCH_HEIGHT / 2;
      else if (topCalc.includes("* 2)")) y = (MATCH_HEIGHT + MATCH_GAP) * 2 + MATCH_HEIGHT / 2;
      else if (topCalc.includes("* 3)")) y = (MATCH_HEIGHT + MATCH_GAP) * 3 + MATCH_HEIGHT / 2;
      else if (topCalc.includes("0.5")) y = (MATCH_HEIGHT + MATCH_GAP) * 0.5;
      else if (topCalc.includes("1.5")) y = (MATCH_HEIGHT + MATCH_GAP) * 1.5;
      else if (topCalc.includes("2.5")) y = (MATCH_HEIGHT + MATCH_GAP) * 2.5;
      
      return { x: x + MATCH_WIDTH / 2, y };
    };

    // Winners bracket connectors
    for (let roundIndex = 0; roundIndex < winnerRounds.length - 1; roundIndex++) {
      const currentRound = winnerRounds[roundIndex];
      const currentMatches = winnersByRound[currentRound].sort((a, b) => a.position - b.position);
      
      for (let i = 0; i < currentMatches.length; i += 2) {
        if (i + 1 < currentMatches.length) {
          const match1 = currentMatches[i];
          const match2 = currentMatches[i + 1];
          
          const pos1 = getWinnersPosition(currentRound, i);
          const pos2 = getWinnersPosition(currentRound, i + 1);
          const targetPos = getWinnersPosition(winnerRounds[roundIndex + 1], Math.floor(i / 2));
          
          const start1 = getPositionFromCalc(pos1.top, pos1.left);
          const start2 = getPositionFromCalc(pos2.top, pos2.left);
          const target = getPositionFromCalc(targetPos.top, targetPos.left);
          
          const midX = start1.x + 100;
          const midY = (start1.y + start2.y) / 2;
          
          connectors.push(
            <g key={`winners-connector-${roundIndex}-${i}`}>
              {/* Horizontal line from first match */}
              <line
                x1={start1.x + 130}
                y1={start1.y}
                x2={midX}
                y2={start1.y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Horizontal line from second match */}
              <line
                x1={start2.x + 130}
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
                x2={target.x - 130}
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
        '--match-height': '100px',
        '--match-gap': '40px',
        '--col-width': '300px'
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
        <div 
          className="bracket-container relative"
          style={{
            width: '1800px',
            height: 'calc(7 * var(--match-height) + 6 * var(--match-gap))',
            minHeight: '700px'
          }}
        >
          {/* Winners Bracket Matches */}
          {winnerRounds.map((round, roundIndex) => {
            const roundMatches = winnersByRound[round].sort((a, b) => a.position - b.position);
            return roundMatches.map((match, matchIndex) => {
              const { top, left } = getWinnersPosition(round, matchIndex);
              return (
                <div 
                  key={match.id}
                  className="match-card absolute"
                  style={{
                    top,
                    left,
                    width: '260px',
                    height: 'var(--match-height)',
                    boxSizing: 'border-box'
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
          {finalMatches.map((match, index) => {
            const { top, left } = getWinnersPosition(winnerRounds[winnerRounds.length - 1], 0);
            return (
              <div 
                key={match.id}
                className="match-card absolute"
                style={{
                  top,
                  left,
                  width: '260px',
                  height: 'var(--match-height)',
                  boxSizing: 'border-box'
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
            );
          })}

          {/* Losers Bracket Matches */}
          {loserRounds.map((round) => {
            const roundMatches = losersByRound[round].sort((a, b) => a.position - b.position);
            return roundMatches.map((match, matchIndex) => {
              const { top, left } = getLosersPosition(round, matchIndex);
              return (
                <div 
                  key={match.id}
                  className="match-card absolute"
                  style={{
                    top,
                    left,
                    width: '260px',
                    height: 'var(--match-height)',
                    boxSizing: 'border-box'
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

          {/* Round Headers - Positioned Absolutely */}
          <div 
            className="absolute text-center"
            style={{ 
              top: '-30px', 
              left: '0px', 
              width: '260px' 
            }}
          >
            <h3 className={cn(
              "text-sm font-semibold transition-colors duration-300",
              isDark ? "text-blue-300" : "text-blue-800"
            )}>
              Round 1
            </h3>
          </div>
          
          <div 
            className="absolute text-center"
            style={{ 
              top: '-30px', 
              left: 'var(--col-width)', 
              width: '260px' 
            }}
          >
            <h3 className={cn(
              "text-sm font-semibold transition-colors duration-300",
              isDark ? "text-blue-300" : "text-blue-800"
            )}>
              Semifinals
            </h3>
          </div>
          
          <div 
            className="absolute text-center"
            style={{ 
              top: '-30px', 
              left: 'calc(var(--col-width) * 2)', 
              width: '260px' 
            }}
          >
            <h3 className={cn(
              "text-sm font-semibold transition-colors duration-300",
              isDark ? "text-purple-300" : "text-purple-800"
            )}>
              Finals
            </h3>
          </div>

          {/* Losers Headers */}
          {loserRounds.map((round, index) => (
            <div 
              key={round}
              className="absolute text-center"
              style={{ 
                top: '-30px', 
                left: `calc(var(--col-width) * ${3 + index})`, 
                width: '260px' 
              }}
            >
              <h3 className={cn(
                "text-sm font-semibold transition-colors duration-300",
                isDark ? "text-orange-300" : "text-orange-800"
              )}>
                Losers Round {round}
              </h3>
            </div>
          ))}

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
