
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

  // Layout constants
  const MATCH_WIDTH = 200;
  const MATCH_HEIGHT = 80;
  const COLUMN_GAP = 100;
  const VERTICAL_SPACING = 120;
  const WINNERS_LOSERS_GAP = 300;

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

  // Group by rounds and sort
  const winnersByRound = winnerMatches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, typeof winnerMatches>);

  const losersByRound = loserMatches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, typeof loserMatches>);

  const winnerRounds = Object.keys(winnersByRound).map(Number).sort((a, b) => a - b);
  const loserRounds = Object.keys(losersByRound).map(Number).sort((a, b) => a - b);

  // Transform match to tournament format
  const transformMatch = (match: any): TournamentMatch => ({
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
  });

  // Calculate winners bracket positions using proper centering
  const calculateWinnersPositions = () => {
    const positions: Array<{match: any, x: number, y: number}> = [];
    
    winnerRounds.forEach((round, roundIndex) => {
      const roundMatches = winnersByRound[round].sort((a, b) => a.position - b.position);
      const x = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
      
      // Calculate vertical spacing - each round should be centered between its source matches
      const baseY = 100;
      const matchSpacing = VERTICAL_SPACING * Math.pow(2, roundIndex);
      
      roundMatches.forEach((match, matchIndex) => {
        const y = baseY + matchIndex * matchSpacing;
        positions.push({ match, x, y });
      });
    });
    
    return positions;
  };

  // Calculate losers bracket positions with proper interwoven structure
  const calculateLosersPositions = () => {
    const positions: Array<{match: any, x: number, y: number}> = [];
    const losersStartY = 400 + WINNERS_LOSERS_GAP;
    
    loserRounds.forEach((round, roundIndex) => {
      const roundMatches = losersByRound[round].sort((a, b) => a.position - b.position);
      const x = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
      
      // Losers bracket has tighter spacing and alternating pattern
      const isEvenRound = roundIndex % 2 === 0;
      const baseSpacing = VERTICAL_SPACING * 0.7;
      
      roundMatches.forEach((match, matchIndex) => {
        const y = losersStartY + matchIndex * baseSpacing;
        positions.push({ match, x, y });
      });
    });
    
    return positions;
  };

  // Calculate finals position
  const calculateFinalsPosition = () => {
    if (finalMatches.length === 0) return null;
    
    const finalsX = Math.max(winnerRounds.length, loserRounds.length) * (MATCH_WIDTH + COLUMN_GAP);
    const finalsY = 250; // Centered between winners and losers
    
    return { match: finalMatches[0], x: finalsX, y: finalsY };
  };

  // Create clean L-shaped connectors
  const createConnectors = () => {
    const connectors = [];
    const lineColor = isDark ? "#6b7280" : "#9ca3af";
    
    // Winners bracket connectors
    for (let roundIndex = 0; roundIndex < winnerRounds.length - 1; roundIndex++) {
      const currentRound = winnerRounds[roundIndex];
      const nextRound = winnerRounds[roundIndex + 1];
      
      const currentMatches = winnersByRound[currentRound].sort((a, b) => a.position - b.position);
      const nextMatches = winnersByRound[nextRound].sort((a, b) => a.position - b.position);
      
      const currentX = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
      const nextX = (roundIndex + 1) * (MATCH_WIDTH + COLUMN_GAP);
      const midX = currentX + MATCH_WIDTH + COLUMN_GAP / 2;
      
      // Connect pairs of matches to their destination
      for (let i = 0; i < currentMatches.length; i += 2) {
        if (i + 1 < currentMatches.length && i / 2 < nextMatches.length) {
          const match1Y = 100 + i * VERTICAL_SPACING * Math.pow(2, roundIndex) + MATCH_HEIGHT / 2;
          const match2Y = 100 + (i + 1) * VERTICAL_SPACING * Math.pow(2, roundIndex) + MATCH_HEIGHT / 2;
          const targetY = 100 + (i / 2) * VERTICAL_SPACING * Math.pow(2, roundIndex + 1) + MATCH_HEIGHT / 2;
          
          connectors.push(
            <g key={`winners-${roundIndex}-${i}`}>
              {/* Horizontal lines from matches */}
              <line
                x1={currentX + MATCH_WIDTH}
                y1={match1Y}
                x2={midX}
                y2={match1Y}
                stroke={lineColor}
                strokeWidth="2"
              />
              <line
                x1={currentX + MATCH_WIDTH}
                y1={match2Y}
                x2={midX}
                y2={match2Y}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Vertical connector */}
              <line
                x1={midX}
                y1={Math.min(match1Y, match2Y)}
                x2={midX}
                y2={Math.max(match1Y, match2Y)}
                stroke={lineColor}
                strokeWidth="2"
              />
              {/* Line to target */}
              <line
                x1={midX}
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
    const losersStartY = 400 + WINNERS_LOSERS_GAP;
    for (let roundIndex = 0; roundIndex < loserRounds.length - 1; roundIndex++) {
      const currentRound = loserRounds[roundIndex];
      const nextRound = loserRounds[roundIndex + 1];
      
      const currentMatches = losersByRound[currentRound].sort((a, b) => a.position - b.position);
      const nextMatches = losersByRound[nextRound].sort((a, b) => a.position - b.position);
      
      const currentX = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
      const nextX = (roundIndex + 1) * (MATCH_WIDTH + COLUMN_GAP);
      const midX = currentX + MATCH_WIDTH + COLUMN_GAP / 2;
      
      for (let i = 0; i < currentMatches.length; i += 2) {
        if (i + 1 < currentMatches.length && i / 2 < nextMatches.length) {
          const baseSpacing = VERTICAL_SPACING * 0.7;
          const match1Y = losersStartY + i * baseSpacing + MATCH_HEIGHT / 2;
          const match2Y = losersStartY + (i + 1) * baseSpacing + MATCH_HEIGHT / 2;
          const targetY = losersStartY + (i / 2) * baseSpacing + MATCH_HEIGHT / 2;
          
          connectors.push(
            <g key={`losers-${roundIndex}-${i}`}>
              <line
                x1={currentX + MATCH_WIDTH}
                y1={match1Y}
                x2={midX}
                y2={match1Y}
                stroke={lineColor}
                strokeWidth="2"
              />
              <line
                x1={currentX + MATCH_WIDTH}
                y1={match2Y}
                x2={midX}
                y2={match2Y}
                stroke={lineColor}
                strokeWidth="2"
              />
              <line
                x1={midX}
                y1={Math.min(match1Y, match2Y)}
                x2={midX}
                y2={Math.max(match1Y, match2Y)}
                stroke={lineColor}
                strokeWidth="2"
              />
              <line
                x1={midX}
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
      const finalsX = Math.max(winnerRounds.length, loserRounds.length) * (MATCH_WIDTH + COLUMN_GAP);
      const finalsY = 250 + MATCH_HEIGHT / 2;
      
      // From winners final
      if (winnerRounds.length > 0) {
        const winnersLastX = (winnerRounds.length - 1) * (MATCH_WIDTH + COLUMN_GAP);
        const winnersLastY = 100 + MATCH_HEIGHT / 2;
        
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
      
      // From losers final
      if (loserRounds.length > 0) {
        const losersLastX = (loserRounds.length - 1) * (MATCH_WIDTH + COLUMN_GAP);
        const losersLastY = losersStartY + MATCH_HEIGHT / 2;
        
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
    loserRounds.length * (MATCH_WIDTH + COLUMN_GAP) + MATCH_WIDTH,
    finalsPosition ? finalsPosition.x + MATCH_WIDTH : 0
  ) + 100;
  
  const totalHeight = 800;

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
          {/* Section Labels */}
          <div 
            className={cn(
              "absolute text-lg font-semibold",
              isDark ? "text-blue-300" : "text-blue-800"
            )}
            style={{ left: '20px', top: '20px' }}
          >
            Winners Bracket
          </div>
          
          <div 
            className={cn(
              "text-lg font-semibold absolute",
              isDark ? "text-orange-300" : "text-orange-800"
            )}
            style={{ left: '20px', top: `${400 + WINNERS_LOSERS_GAP - 30}px` }}
          >
            Losers Bracket
          </div>

          {/* Winners Bracket Matches */}
          {winnersPositions.map(({ match, x, y }) => (
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
          {losersPositions.map(({ match, x, y }) => (
            <div
              key={`losers-${match.id}`}
              className="absolute"
              style={{ left: `${x}px`, top: `${y}px` }}
            >
              <TournamentMatchCard
                match={transformMatch(match)}
                onMatchClick={onMatchClick}
                showSeeds={true}
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
                showSeeds={true}
                bracketType="finals"
                fixedHeight={true}
              />
            </div>
          )}

          {/* SVG Connectors */}
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
