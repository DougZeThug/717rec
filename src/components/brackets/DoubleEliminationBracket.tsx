
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

// Exact Challonge layout dimensions
const MATCH_WIDTH = 180;
const MATCH_HEIGHT = 70;
const COLUMN_WIDTH = 220;
const WINNERS_START_Y = 80;
const LOSERS_START_Y = 400;

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

  // Hardcoded Challonge layout structure
  const getChallongeLayout = () => {
    const layout = {
      winners: [
        // Round 1 - 4 matches
        { matches: [], x: 0, y: WINNERS_START_Y, title: "Round 1", spacing: 90 },
        // Round 2 - 2 matches  
        { matches: [], x: COLUMN_WIDTH, y: WINNERS_START_Y + 45, title: "Semifinals", spacing: 180 },
        // Round 3 - 1 match
        { matches: [], x: COLUMN_WIDTH * 2, y: WINNERS_START_Y + 90, title: "Winners Final", spacing: 0 },
      ],
      losers: [
        // Losers Round 1 - 2 matches
        { matches: [], x: 0, y: LOSERS_START_Y, title: "LR1", spacing: 180 },
        // Losers Round 2 - 2 matches
        { matches: [], x: COLUMN_WIDTH, y: LOSERS_START_Y - 45, title: "LR2", spacing: 180 },
        // Losers Round 3 - 1 match
        { matches: [], x: COLUMN_WIDTH * 2, y: LOSERS_START_Y, title: "LR3", spacing: 0 },
        // Losers Final
        { matches: [], x: COLUMN_WIDTH * 3, y: LOSERS_START_Y - 45, title: "Losers Final", spacing: 0 },
      ],
      finals: {
        x: COLUMN_WIDTH * 4,
        y: WINNERS_START_Y + 135,
        title: "Grand Final"
      }
    };

    // Map winner matches to layout positions
    const sortedWinners = winnerMatches.sort((a, b) => a.round - b.round || a.position - b.position);
    let winnerIndex = 0;
    
    // Round 1: 4 matches
    for (let i = 0; i < 4 && winnerIndex < sortedWinners.length; i++) {
      if (sortedWinners[winnerIndex]) {
        layout.winners[0].matches.push({
          match: sortedWinners[winnerIndex],
          x: 0,
          y: WINNERS_START_Y + (i * 90)
        });
        winnerIndex++;
      }
    }
    
    // Round 2: 2 matches
    for (let i = 0; i < 2 && winnerIndex < sortedWinners.length; i++) {
      if (sortedWinners[winnerIndex]) {
        layout.winners[1].matches.push({
          match: sortedWinners[winnerIndex],
          x: COLUMN_WIDTH,
          y: WINNERS_START_Y + 45 + (i * 180)
        });
        winnerIndex++;
      }
    }
    
    // Round 3: 1 match
    if (winnerIndex < sortedWinners.length && sortedWinners[winnerIndex]) {
      layout.winners[2].matches.push({
        match: sortedWinners[winnerIndex],
        x: COLUMN_WIDTH * 2,
        y: WINNERS_START_Y + 90
      });
    }

    // Map loser matches to layout positions
    const sortedLosers = loserMatches.sort((a, b) => a.round - b.round || a.position - b.position);
    let loserIndex = 0;
    
    // Losers Round 1: 2 matches
    for (let i = 0; i < 2 && loserIndex < sortedLosers.length; i++) {
      if (sortedLosers[loserIndex]) {
        layout.losers[0].matches.push({
          match: sortedLosers[loserIndex],
          x: 0,
          y: LOSERS_START_Y + (i * 180)
        });
        loserIndex++;
      }
    }
    
    // Continue mapping remaining loser rounds...
    const loserRounds = [
      { roundIndex: 1, count: 2, yOffset: -45 },
      { roundIndex: 2, count: 1, yOffset: 0 },
      { roundIndex: 3, count: 1, yOffset: -45 }
    ];
    
    loserRounds.forEach(({ roundIndex, count, yOffset }) => {
      for (let i = 0; i < count && loserIndex < sortedLosers.length; i++) {
        if (sortedLosers[loserIndex]) {
          layout.losers[roundIndex].matches.push({
            match: sortedLosers[loserIndex],
            x: COLUMN_WIDTH * roundIndex,
            y: LOSERS_START_Y + yOffset + (i * 180)
          });
          loserIndex++;
        }
      }
    });

    return layout;
  };

  const layout = getChallongeLayout();

  return (
    <div className={cn(
      "w-full min-h-screen p-6 transition-colors duration-300",
      "bg-gray-900 text-white" // Challonge dark theme
    )}>
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">
          {bracket.name}
        </h2>
        <p className="text-gray-400 text-sm">
          {bracket.format} • {bracket.state}
        </p>
      </div>

      {/* Bracket Container */}
      <div className="relative" style={{ 
        width: `${COLUMN_WIDTH * 5}px`, 
        height: '600px',
        minWidth: 'max-content'
      }}>
        
        {/* Winners Bracket */}
        {layout.winners.map((round, roundIndex) => (
          <div key={`winners-${roundIndex}`}>
            {/* Round Header */}
            <div
              className="absolute text-sm font-semibold text-white text-center"
              style={{
                left: `${round.x}px`,
                top: `${round.y - 30}px`,
                width: `${MATCH_WIDTH}px`
              }}
            >
              {round.title}
            </div>
            
            {/* Matches */}
            {round.matches.map(({ match, x, y }, matchIndex) => (
              <div
                key={match.id}
                className="absolute"
                style={{ 
                  left: `${x}px`, 
                  top: `${y}px`,
                  width: `${MATCH_WIDTH}px`,
                  height: `${MATCH_HEIGHT}px`
                }}
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
        {layout.losers.map((round, roundIndex) => (
          <div key={`losers-${roundIndex}`}>
            {/* Round Header */}
            <div
              className="absolute text-sm font-semibold text-orange-400 text-center"
              style={{
                left: `${round.x}px`,
                top: `${round.y - 30}px`,
                width: `${MATCH_WIDTH}px`
              }}
            >
              {round.title}
            </div>
            
            {/* Matches */}
            {round.matches.map(({ match, x, y }, matchIndex) => (
              <div
                key={match.id}
                className="absolute"
                style={{ 
                  left: `${x}px`, 
                  top: `${y}px`,
                  width: `${MATCH_WIDTH}px`,
                  height: `${MATCH_HEIGHT}px`
                }}
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
        {finalMatches.length > 0 && (
          <div>
            <div
              className="absolute text-sm font-semibold text-purple-400 text-center"
              style={{
                left: `${layout.finals.x}px`,
                top: `${layout.finals.y - 30}px`,
                width: `${MATCH_WIDTH}px`
              }}
            >
              {layout.finals.title}
            </div>
            
            <div
              className="absolute"
              style={{ 
                left: `${layout.finals.x}px`, 
                top: `${layout.finals.y}px`,
                width: `${MATCH_WIDTH}px`,
                height: `${MATCH_HEIGHT}px`
              }}
            >
              <TournamentMatchCard
                match={transformMatch(finalMatches[0])}
                onMatchClick={onMatchClick}
                showSeeds={true}
                bracketType="finals"
                fixedHeight={true}
              />
            </div>
          </div>
        )}

        {/* Simple L-shaped connectors */}
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ overflow: 'visible' }}
        >
          {/* Winners bracket connectors */}
          {/* Round 1 to Round 2 */}
          <g stroke="#6b7280" strokeWidth="2" fill="none">
            {/* Match 1&2 to Semi 1 */}
            <path d={`M ${MATCH_WIDTH} ${WINNERS_START_Y + 35} L ${COLUMN_WIDTH - 20} ${WINNERS_START_Y + 35} L ${COLUMN_WIDTH - 20} ${WINNERS_START_Y + 80} L ${COLUMN_WIDTH} ${WINNERS_START_Y + 80}`} />
            <path d={`M ${MATCH_WIDTH} ${WINNERS_START_Y + 125} L ${COLUMN_WIDTH - 20} ${WINNERS_START_Y + 125} L ${COLUMN_WIDTH - 20} ${WINNERS_START_Y + 80} L ${COLUMN_WIDTH} ${WINNERS_START_Y + 80}`} />
            
            {/* Match 3&4 to Semi 2 */}
            <path d={`M ${MATCH_WIDTH} ${WINNERS_START_Y + 215} L ${COLUMN_WIDTH - 20} ${WINNERS_START_Y + 215} L ${COLUMN_WIDTH - 20} ${WINNERS_START_Y + 260} L ${COLUMN_WIDTH} ${WINNERS_START_Y + 260}`} />
            <path d={`M ${MATCH_WIDTH} ${WINNERS_START_Y + 305} L ${COLUMN_WIDTH - 20} ${WINNERS_START_Y + 305} L ${COLUMN_WIDTH - 20} ${WINNERS_START_Y + 260} L ${COLUMN_WIDTH} ${WINNERS_START_Y + 260}`} />
            
            {/* Semis to Final */}
            <path d={`M ${COLUMN_WIDTH + MATCH_WIDTH} ${WINNERS_START_Y + 80} L ${COLUMN_WIDTH * 2 - 20} ${WINNERS_START_Y + 80} L ${COLUMN_WIDTH * 2 - 20} ${WINNERS_START_Y + 125} L ${COLUMN_WIDTH * 2} ${WINNERS_START_Y + 125}`} />
            <path d={`M ${COLUMN_WIDTH + MATCH_WIDTH} ${WINNERS_START_Y + 260} L ${COLUMN_WIDTH * 2 - 20} ${WINNERS_START_Y + 260} L ${COLUMN_WIDTH * 2 - 20} ${WINNERS_START_Y + 125} L ${COLUMN_WIDTH * 2} ${WINNERS_START_Y + 125}`} />
          </g>
          
          {/* Losers bracket connectors */}
          <g stroke="#f97316" strokeWidth="2" fill="none">
            {/* Basic losers connections */}
            <path d={`M ${MATCH_WIDTH} ${LOSERS_START_Y + 35} L ${COLUMN_WIDTH} ${LOSERS_START_Y - 10}`} />
            <path d={`M ${MATCH_WIDTH} ${LOSERS_START_Y + 215} L ${COLUMN_WIDTH} ${LOSERS_START_Y + 170}`} />
          </g>
          
          {/* Finals connector */}
          <g stroke="#a855f7" strokeWidth="2" fill="none">
            <path d={`M ${COLUMN_WIDTH * 3 + MATCH_WIDTH} ${LOSERS_START_Y - 10} L ${COLUMN_WIDTH * 4} ${WINNERS_START_Y + 170}`} />
            <path d={`M ${COLUMN_WIDTH * 2 + MATCH_WIDTH} ${WINNERS_START_Y + 125} L ${COLUMN_WIDTH * 4} ${WINNERS_START_Y + 170}`} />
          </g>
        </svg>
      </div>
    </div>
  );
};

export default DoubleEliminationBracket;
