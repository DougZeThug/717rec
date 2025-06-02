
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

// Challonge layout constants - exact pixel values
const MATCH_WIDTH = 190;
const MATCH_HEIGHT = 80;
const COLUMN_GAP = 140;
const ROW_GAP = 20;
const ROUND_HEADER_HEIGHT = 40;

const DoubleEliminationBracket: React.FC<DoubleEliminationBracketProps> = ({ 
  bracket, 
  onMatchClick 
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

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

  // Separate matches by bracket type
  const winnerMatches = bracket.matches.filter(match => 
    match.matchType === 'winners' || match.matchType === 'winner'
  );
  const loserMatches = bracket.matches.filter(match => 
    match.matchType === 'losers' || match.matchType === 'loser'
  );
  const finalMatches = bracket.matches.filter(match => 
    match.matchType === 'finals' || match.matchType === 'final'
  );

  // Group by rounds - simple structure
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

  // Calculate positions using Challonge's mathematical centering
  const calculateWinnersPositions = () => {
    const positions: Array<{
      round: number;
      title: string;
      x: number;
      matches: Array<{ match: any; y: number }>;
    }> = [];

    winnerRounds.forEach((round, roundIndex) => {
      const matches = winnersByRound[round].sort((a, b) => a.position - b.position);
      const x = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
      
      // Perfect mathematical centering - each round has half the matches of the previous
      const totalMatches = matches.length;
      const baseSpacing = MATCH_HEIGHT + ROW_GAP;
      const roundSpacing = baseSpacing * Math.pow(2, roundIndex);
      
      // Center the entire column vertically
      const startY = 100 - ((totalMatches - 1) * roundSpacing) / 2;
      
      const matchPositions = matches.map((match, index) => ({
        match,
        y: startY + index * roundSpacing
      }));

      positions.push({
        round,
        title: getRoundTitle(roundIndex, winnerRounds.length, 'winners'),
        x,
        matches: matchPositions
      });
    });

    return positions;
  };

  const calculateLosersPositions = () => {
    const positions: Array<{
      round: number;
      title: string;
      x: number;
      matches: Array<{ match: any; y: number }>;
    }> = [];

    const losersStartY = 350; // Positioned below winners bracket

    loserRounds.forEach((round, roundIndex) => {
      const matches = losersByRound[round].sort((a, b) => a.position - b.position);
      const x = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
      
      // Losers bracket has more consistent spacing
      const totalMatches = matches.length;
      const spacing = MATCH_HEIGHT + ROW_GAP + 40; // Slightly more spacing for clarity
      const startY = losersStartY - ((totalMatches - 1) * spacing) / 2;
      
      const matchPositions = matches.map((match, index) => ({
        match,
        y: startY + index * spacing
      }));

      positions.push({
        round,
        title: getRoundTitle(roundIndex, loserRounds.length, 'losers'),
        x,
        matches: matchPositions
      });
    });

    return positions;
  };

  const calculateFinalsPosition = () => {
    if (finalMatches.length === 0) return null;
    
    const maxRounds = Math.max(winnerRounds.length, loserRounds.length);
    const x = maxRounds * (MATCH_WIDTH + COLUMN_GAP);
    const y = 225; // Centered between winners and losers
    
    return {
      match: finalMatches[0],
      x,
      y,
      title: 'Grand Finals'
    };
  };

  // Round title helper
  const getRoundTitle = (roundIndex: number, totalRounds: number, type: string) => {
    if (type === 'winners') {
      if (roundIndex === totalRounds - 1) return 'Finals';
      if (roundIndex === totalRounds - 2) return 'Semifinals';
      return `Round ${roundIndex + 1}`;
    } else {
      if (roundIndex === totalRounds - 1) return 'LB Finals';
      if (roundIndex === totalRounds - 2) return 'LB Semifinals';
      return `LB Round ${roundIndex + 1}`;
    }
  };

  // Create simple L-shaped connectors
  const createConnectors = (rounds: any[]) => {
    const connectors = [];
    const lineColor = isDark ? "#6b7280" : "#9ca3af";

    for (let i = 0; i < rounds.length - 1; i++) {
      const currentRound = rounds[i];
      const nextRound = rounds[i + 1];
      
      for (let j = 0; j < currentRound.matches.length; j += 2) {
        if (j + 1 < currentRound.matches.length && j / 2 < nextRound.matches.length) {
          const match1 = currentRound.matches[j];
          const match2 = currentRound.matches[j + 1];
          const targetMatch = nextRound.matches[j / 2];
          
          const sourceX = currentRound.x + MATCH_WIDTH;
          const targetX = nextRound.x;
          const midX = sourceX + COLUMN_GAP / 2;
          
          const match1Y = match1.y + MATCH_HEIGHT / 2;
          const match2Y = match2.y + MATCH_HEIGHT / 2;
          const targetY = targetMatch.y + MATCH_HEIGHT / 2;
          
          connectors.push(
            <g key={`connector-${i}-${j}`}>
              {/* Lines from matches to midpoint */}
              <line
                x1={sourceX}
                y1={match1Y}
                x2={midX}
                y2={match1Y}
                stroke={lineColor}
                strokeWidth="2"
              />
              <line
                x1={sourceX}
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
                x2={targetX}
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

  const winnersPositions = calculateWinnersPositions();
  const losersPositions = calculateLosersPositions();
  const finalsPosition = calculateFinalsPosition();
  
  const winnersConnectors = createConnectors(winnersPositions);
  const losersConnectors = createConnectors(losersPositions);

  // Calculate total dimensions
  const totalWidth = Math.max(
    winnersPositions.length > 0 ? winnersPositions[winnersPositions.length - 1].x + MATCH_WIDTH : 0,
    losersPositions.length > 0 ? losersPositions[losersPositions.length - 1].x + MATCH_WIDTH : 0,
    finalsPosition ? finalsPosition.x + MATCH_WIDTH : 0
  ) + 100;
  
  const totalHeight = 600;

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
          {/* Winners Bracket */}
          {winnersPositions.map((round) => (
            <div key={`winners-${round.round}`}>
              {/* Round Header */}
              <div
                className={cn(
                  "absolute text-sm font-semibold text-center",
                  isDark ? "text-blue-300" : "text-blue-800"
                )}
                style={{
                  left: `${round.x}px`,
                  top: '20px',
                  width: `${MATCH_WIDTH}px`
                }}
              >
                {round.title}
              </div>
              
              {/* Matches */}
              {round.matches.map(({ match, y }) => (
                <div
                  key={match.id}
                  className="absolute"
                  style={{ left: `${round.x}px`, top: `${y}px` }}
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
            </div>
          ))}

          {/* Losers Bracket */}
          {losersPositions.map((round) => (
            <div key={`losers-${round.round}`}>
              {/* Round Header */}
              <div
                className={cn(
                  "absolute text-sm font-semibold text-center",
                  isDark ? "text-orange-300" : "text-orange-800"
                )}
                style={{
                  left: `${round.x}px`,
                  top: '280px',
                  width: `${MATCH_WIDTH}px`
                }}
              >
                {round.title}
              </div>
              
              {/* Matches */}
              {round.matches.map(({ match, y }) => (
                <div
                  key={match.id}
                  className="absolute"
                  style={{ left: `${round.x}px`, top: `${y}px` }}
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
            </div>
          ))}

          {/* Finals */}
          {finalsPosition && (
            <div>
              <div
                className={cn(
                  "absolute text-sm font-semibold text-center",
                  isDark ? "text-purple-300" : "text-purple-800"
                )}
                style={{
                  left: `${finalsPosition.x}px`,
                  top: '175px',
                  width: `${MATCH_WIDTH}px`
                }}
              >
                {finalsPosition.title}
              </div>
              
              <div
                className="absolute"
                style={{ left: `${finalsPosition.x}px`, top: `${finalsPosition.y}px` }}
              >
                <TournamentMatchCard
                  match={transformMatch(finalsPosition.match)}
                  onMatchClick={onMatchClick}
                  showSeeds={true}
                  bracketType="finals"
                  fixedHeight={true}
                />
              </div>
            </div>
          )}

          {/* SVG Connectors */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ overflow: 'visible' }}
          >
            {winnersConnectors}
            {losersConnectors}
            
            {/* Finals connectors */}
            {finalsPosition && winnersPositions.length > 0 && (
              <line
                x1={winnersPositions[winnersPositions.length - 1].x + MATCH_WIDTH}
                y1={winnersPositions[winnersPositions.length - 1].matches[0]?.y + MATCH_HEIGHT / 2}
                x2={finalsPosition.x}
                y2={finalsPosition.y + MATCH_HEIGHT / 2}
                stroke={isDark ? "#6b7280" : "#9ca3af"}
                strokeWidth="2"
              />
            )}
            
            {finalsPosition && losersPositions.length > 0 && (
              <line
                x1={losersPositions[losersPositions.length - 1].x + MATCH_WIDTH}
                y1={losersPositions[losersPositions.length - 1].matches[0]?.y + MATCH_HEIGHT / 2}
                x2={finalsPosition.x}
                y2={finalsPosition.y + MATCH_HEIGHT / 2}
                stroke={isDark ? "#6b7280" : "#9ca3af"}
                strokeWidth="2"
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default DoubleEliminationBracket;
