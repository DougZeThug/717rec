
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

// Exact Challonge layout constants
const MATCH_WIDTH = 190;
const MATCH_HEIGHT = 80;
const HORIZONTAL_GAP = 140;
const VERTICAL_BASE_GAP = 100;

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

  // Group matches by round
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

  // Define exact Challonge layout positions
  const generateChallongeLayout = () => {
    const winnerRounds = Object.keys(winnersByRound).map(Number).sort();
    const loserRounds = Object.keys(losersByRound).map(Number).sort();
    
    const layout = {
      winners: [] as Array<{
        round: number;
        title: string;
        x: number;
        y: number;
        matches: Array<{ match: any; x: number; y: number }>;
      }>,
      losers: [] as Array<{
        round: number;
        title: string;
        x: number;
        y: number;
        matches: Array<{ match: any; x: number; y: number }>;
      }>,
      finals: null as { match: any; x: number; y: number; title: string } | null,
      connectors: [] as Array<{ x1: number; y1: number; x2: number; y2: number; midX?: number; midY?: number }>
    };

    // Calculate winners bracket positions (Challonge style)
    winnerRounds.forEach((round, roundIndex) => {
      const matches = winnersByRound[round].sort((a, b) => a.position - b.position);
      const x = roundIndex * (MATCH_WIDTH + HORIZONTAL_GAP);
      
      // Challonge vertical spacing - each round doubles the gap
      const verticalGap = VERTICAL_BASE_GAP * Math.pow(2, roundIndex);
      const totalHeight = (matches.length - 1) * verticalGap;
      const startY = 50 - totalHeight / 2; // Center vertically at y=50
      
      const roundMatches = matches.map((match, index) => ({
        match,
        x,
        y: startY + index * verticalGap
      }));

      layout.winners.push({
        round,
        title: getRoundTitle(roundIndex, winnerRounds.length, 'winners'),
        x,
        y: 10, // Header position
        matches: roundMatches
      });
    });

    // Calculate losers bracket positions (below winners)
    const losersStartY = 300;
    loserRounds.forEach((round, roundIndex) => {
      const matches = losersByRound[round].sort((a, b) => a.position - b.position);
      const x = roundIndex * (MATCH_WIDTH + HORIZONTAL_GAP);
      
      // Losers bracket has tighter spacing
      const verticalGap = 120;
      const totalHeight = (matches.length - 1) * verticalGap;
      const startY = losersStartY - totalHeight / 2;
      
      const roundMatches = matches.map((match, index) => ({
        match,
        x,
        y: startY + index * verticalGap
      }));

      layout.losers.push({
        round,
        title: getRoundTitle(roundIndex, loserRounds.length, 'losers'),
        x,
        y: 260, // Header position
        matches: roundMatches
      });
    });

    // Finals position (center between brackets)
    if (finalMatches.length > 0) {
      const maxRounds = Math.max(winnerRounds.length, loserRounds.length);
      layout.finals = {
        match: finalMatches[0],
        x: maxRounds * (MATCH_WIDTH + HORIZONTAL_GAP),
        y: 175, // Centered between winners and losers
        title: 'Grand Finals'
      };
    }

    // Generate simple L-shaped connectors
    layout.winners.forEach((round, roundIndex) => {
      if (roundIndex < layout.winners.length - 1) {
        const nextRound = layout.winners[roundIndex + 1];
        
        for (let i = 0; i < round.matches.length; i += 2) {
          if (i + 1 < round.matches.length && Math.floor(i / 2) < nextRound.matches.length) {
            const match1 = round.matches[i];
            const match2 = round.matches[i + 1];
            const targetMatch = nextRound.matches[Math.floor(i / 2)];
            
            const sourceX = match1.x + MATCH_WIDTH;
            const targetX = targetMatch.x;
            const midX = sourceX + HORIZONTAL_GAP / 2;
            
            // Horizontal lines from both matches
            layout.connectors.push(
              { x1: sourceX, y1: match1.y + MATCH_HEIGHT / 2, x2: midX, y2: match1.y + MATCH_HEIGHT / 2 },
              { x1: sourceX, y1: match2.y + MATCH_HEIGHT / 2, x2: midX, y2: match2.y + MATCH_HEIGHT / 2 }
            );
            
            // Vertical connector
            layout.connectors.push({
              x1: midX, y1: match1.y + MATCH_HEIGHT / 2,
              x2: midX, y2: match2.y + MATCH_HEIGHT / 2
            });
            
            // Line to target
            layout.connectors.push({
              x1: midX, y1: targetMatch.y + MATCH_HEIGHT / 2,
              x2: targetX, y2: targetMatch.y + MATCH_HEIGHT / 2
            });
          }
        }
      }
    });

    // Similar connectors for losers bracket
    layout.losers.forEach((round, roundIndex) => {
      if (roundIndex < layout.losers.length - 1) {
        const nextRound = layout.losers[roundIndex + 1];
        
        for (let i = 0; i < round.matches.length; i += 2) {
          if (i + 1 < round.matches.length && Math.floor(i / 2) < nextRound.matches.length) {
            const match1 = round.matches[i];
            const match2 = round.matches[i + 1];
            const targetMatch = nextRound.matches[Math.floor(i / 2)];
            
            const sourceX = match1.x + MATCH_WIDTH;
            const targetX = targetMatch.x;
            const midX = sourceX + HORIZONTAL_GAP / 2;
            
            layout.connectors.push(
              { x1: sourceX, y1: match1.y + MATCH_HEIGHT / 2, x2: midX, y2: match1.y + MATCH_HEIGHT / 2 },
              { x1: sourceX, y1: match2.y + MATCH_HEIGHT / 2, x2: midX, y2: match2.y + MATCH_HEIGHT / 2 },
              { x1: midX, y1: match1.y + MATCH_HEIGHT / 2, x2: midX, y2: match2.y + MATCH_HEIGHT / 2 },
              { x1: midX, y1: targetMatch.y + MATCH_HEIGHT / 2, x2: targetX, y2: targetMatch.y + MATCH_HEIGHT / 2 }
            );
          }
        }
      }
    });

    return layout;
  };

  // Round title helper
  const getRoundTitle = (roundIndex: number, totalRounds: number, type: string) => {
    if (type === 'winners') {
      if (roundIndex === totalRounds - 1) return 'Winners Finals';
      if (roundIndex === totalRounds - 2) return 'Winners Semis';
      return `WB Round ${roundIndex + 1}`;
    } else {
      if (roundIndex === totalRounds - 1) return 'Losers Finals';
      if (roundIndex === totalRounds - 2) return 'Losers Semis';
      return `LB Round ${roundIndex + 1}`;
    }
  };

  const layout = generateChallongeLayout();
  const lineColor = isDark ? "#6b7280" : "#9ca3af";

  // Calculate total dimensions
  const allXPositions = [
    ...layout.winners.flatMap(round => round.matches.map(m => m.x)),
    ...layout.losers.flatMap(round => round.matches.map(m => m.x)),
    ...(layout.finals ? [layout.finals.x] : [])
  ];
  const totalWidth = Math.max(...allXPositions, 0) + MATCH_WIDTH + 100;
  const totalHeight = 500;

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
          {layout.winners.map((round) => (
            <div key={`winners-${round.round}`}>
              {/* Round Header */}
              <div
                className={cn(
                  "absolute text-sm font-semibold text-center",
                  isDark ? "text-blue-300" : "text-blue-800"
                )}
                style={{
                  left: `${round.x}px`,
                  top: `${round.y}px`,
                  width: `${MATCH_WIDTH}px`
                }}
              >
                {round.title}
              </div>
              
              {/* Matches */}
              {round.matches.map(({ match, x, y }) => (
                <div
                  key={match.id}
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
            </div>
          ))}

          {/* Losers Bracket */}
          {layout.losers.map((round) => (
            <div key={`losers-${round.round}`}>
              {/* Round Header */}
              <div
                className={cn(
                  "absolute text-sm font-semibold text-center",
                  isDark ? "text-orange-300" : "text-orange-800"
                )}
                style={{
                  left: `${round.x}px`,
                  top: `${round.y}px`,
                  width: `${MATCH_WIDTH}px`
                }}
              >
                {round.title}
              </div>
              
              {/* Matches */}
              {round.matches.map(({ match, x, y }) => (
                <div
                  key={match.id}
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
            </div>
          ))}

          {/* Finals */}
          {layout.finals && (
            <div>
              <div
                className={cn(
                  "absolute text-sm font-semibold text-center",
                  isDark ? "text-purple-300" : "text-purple-800"
                )}
                style={{
                  left: `${layout.finals.x}px`,
                  top: `135px`,
                  width: `${MATCH_WIDTH}px`
                }}
              >
                {layout.finals.title}
              </div>
              
              <div
                className="absolute"
                style={{ left: `${layout.finals.x}px`, top: `${layout.finals.y}px` }}
              >
                <TournamentMatchCard
                  match={transformMatch(layout.finals.match)}
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
            {layout.connectors.map((connector, index) => (
              <line
                key={index}
                x1={connector.x1}
                y1={connector.y1}
                x2={connector.x2}
                y2={connector.y2}
                stroke={lineColor}
                strokeWidth="2"
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default DoubleEliminationBracket;
