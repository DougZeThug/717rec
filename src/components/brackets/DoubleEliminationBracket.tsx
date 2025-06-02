
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

  // Challonge layout constants - exact measurements
  const MATCH_WIDTH = 200;
  const MATCH_HEIGHT = 80;
  const COLUMN_GAP = 120;
  const ROUND_HEADER_HEIGHT = 40;
  const BRACKET_SPACING = 80; // Space between WB and LB
  
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

  // Organize by rounds
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

  // Challonge-style positioning: mathematical centering
  const calculateWinnersLayout = () => {
    const rounds: Array<{
      roundNumber: number;
      title: string;
      matches: Array<{ match: any; y: number }>;
      x: number;
    }> = [];

    winnerRounds.forEach((roundNum, roundIndex) => {
      const roundMatches = winnersByRound[roundNum].sort((a, b) => a.position - b.position);
      const x = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
      
      // Calculate Y positions with perfect centering
      const totalMatches = roundMatches.length;
      const spacing = 160; // Base spacing between matches
      const groupSpacing = spacing * Math.pow(2, roundIndex); // Exponential spacing growth
      const startY = 100 - ((totalMatches - 1) * groupSpacing) / 2;
      
      const matches = roundMatches.map((match, matchIndex) => ({
        match,
        y: startY + matchIndex * groupSpacing
      }));

      rounds.push({
        roundNumber: roundNum,
        title: getRoundTitle(roundIndex, winnerRounds.length, 'winners'),
        matches,
        x
      });
    });

    return rounds;
  };

  const calculateLosersLayout = () => {
    const rounds: Array<{
      roundNumber: number;
      title: string;
      matches: Array<{ match: any; y: number }>;
      x: number;
    }> = [];

    const losersStartY = 400;

    loserRounds.forEach((roundNum, roundIndex) => {
      const roundMatches = losersByRound[roundNum].sort((a, b) => a.position - b.position);
      const x = roundIndex * (MATCH_WIDTH + COLUMN_GAP);
      
      // Losers bracket has tighter, consistent spacing
      const totalMatches = roundMatches.length;
      const spacing = 120;
      const startY = losersStartY - ((totalMatches - 1) * spacing) / 2;
      
      const matches = roundMatches.map((match, matchIndex) => ({
        match,
        y: startY + matchIndex * spacing
      }));

      rounds.push({
        roundNumber: roundNum,
        title: getRoundTitle(roundIndex, loserRounds.length, 'losers'),
        matches,
        x
      });
    });

    return rounds;
  };

  const calculateFinalsLayout = () => {
    if (finalMatches.length === 0) return null;
    
    const finalsX = Math.max(winnerRounds.length, loserRounds.length) * (MATCH_WIDTH + COLUMN_GAP);
    const finalsY = 250; // Centered between winners and losers brackets
    
    return {
      match: finalMatches[0],
      x: finalsX,
      y: finalsY,
      title: 'Grand Finals'
    };
  };

  // Get round titles like Challonge
  const getRoundTitle = (roundIndex: number, totalRounds: number, bracketType: string) => {
    if (bracketType === 'winners') {
      if (roundIndex === totalRounds - 1) return 'Winners Final';
      if (roundIndex === totalRounds - 2) return 'Winners Semis';
      return `Round ${roundIndex + 1}`;
    } else {
      if (roundIndex === totalRounds - 1) return 'Losers Final';
      if (roundIndex === totalRounds - 2) return 'Losers Semis';
      return `LB Round ${roundIndex + 1}`;
    }
  };

  // Create simple L-shaped connectors
  const createConnectors = (rounds: any[], startY: number = 0) => {
    const connectors = [];
    const lineColor = isDark ? "#6b7280" : "#9ca3af";

    for (let roundIndex = 0; roundIndex < rounds.length - 1; roundIndex++) {
      const currentRound = rounds[roundIndex];
      const nextRound = rounds[roundIndex + 1];
      
      const currentMatches = currentRound.matches;
      const nextMatches = nextRound.matches;
      
      // Connect pairs of matches to their destination
      for (let i = 0; i < currentMatches.length; i += 2) {
        if (i + 1 < currentMatches.length && i / 2 < nextMatches.length) {
          const match1 = currentMatches[i];
          const match2 = currentMatches[i + 1];
          const targetMatch = nextMatches[i / 2];
          
          const sourceX = currentRound.x + MATCH_WIDTH;
          const targetX = nextRound.x;
          const midX = sourceX + COLUMN_GAP / 2;
          
          const match1Y = match1.y + MATCH_HEIGHT / 2;
          const match2Y = match2.y + MATCH_HEIGHT / 2;
          const targetY = targetMatch.y + MATCH_HEIGHT / 2;
          
          connectors.push(
            <g key={`connector-${roundIndex}-${i}`}>
              {/* Horizontal lines from matches */}
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

  const winnersLayout = calculateWinnersLayout();
  const losersLayout = calculateLosersLayout();
  const finalsLayout = calculateFinalsLayout();
  
  const winnersConnectors = createConnectors(winnersLayout);
  const losersConnectors = createConnectors(losersLayout);

  // Calculate total dimensions
  const totalWidth = Math.max(
    winnersLayout.length > 0 ? winnersLayout[winnersLayout.length - 1].x + MATCH_WIDTH : 0,
    losersLayout.length > 0 ? losersLayout[losersLayout.length - 1].x + MATCH_WIDTH : 0,
    finalsLayout ? finalsLayout.x + MATCH_WIDTH : 0
  ) + 100;
  
  const totalHeight = 700;

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
          {winnersLayout.map((round) => (
            <div key={`winners-round-${round.roundNumber}`}>
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
              
              {/* Round Matches */}
              {round.matches.map(({ match, y }) => (
                <div
                  key={`winners-${match.id}`}
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
          {losersLayout.map((round) => (
            <div key={`losers-round-${round.roundNumber}`}>
              {/* Round Header */}
              <div
                className={cn(
                  "absolute text-sm font-semibold text-center",
                  isDark ? "text-orange-300" : "text-orange-800"
                )}
                style={{
                  left: `${round.x}px`,
                  top: '350px',
                  width: `${MATCH_WIDTH}px`
                }}
              >
                {round.title}
              </div>
              
              {/* Round Matches */}
              {round.matches.map(({ match, y }) => (
                <div
                  key={`losers-${match.id}`}
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
          {finalsLayout && (
            <div>
              <div
                className={cn(
                  "absolute text-sm font-semibold text-center",
                  isDark ? "text-purple-300" : "text-purple-800"
                )}
                style={{
                  left: `${finalsLayout.x}px`,
                  top: '200px',
                  width: `${MATCH_WIDTH}px`
                }}
              >
                {finalsLayout.title}
              </div>
              
              <div
                className="absolute"
                style={{ left: `${finalsLayout.x}px`, top: `${finalsLayout.y}px` }}
              >
                <TournamentMatchCard
                  match={transformMatch(finalsLayout.match)}
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
            {finalsLayout && winnersLayout.length > 0 && (
              <line
                x1={winnersLayout[winnersLayout.length - 1].x + MATCH_WIDTH}
                y1={winnersLayout[winnersLayout.length - 1].matches[0]?.y + MATCH_HEIGHT / 2}
                x2={finalsLayout.x}
                y2={finalsLayout.y + MATCH_HEIGHT / 2}
                stroke={isDark ? "#6b7280" : "#9ca3af"}
                strokeWidth="2"
              />
            )}
            
            {finalsLayout && losersLayout.length > 0 && (
              <line
                x1={losersLayout[losersLayout.length - 1].x + MATCH_WIDTH}
                y1={losersLayout[losersLayout.length - 1].matches[0]?.y + MATCH_HEIGHT / 2}
                x2={finalsLayout.x}
                y2={finalsLayout.y + MATCH_HEIGHT / 2}
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
