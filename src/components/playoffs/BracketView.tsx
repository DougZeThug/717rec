
import React, { useMemo, useState } from "react";
import type { PlayoffBracket, Team } from "@/types";
import RoundColumn from "./RoundColumn";
import { getBracketConnectorPaths, getVerticalSpacing, getNextMatch } from "./BracketUtils";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { blueAmber } from "@/styles/design-system";
import ChampionDisplay from "./celebration/ChampionDisplay";
import { usePlayoffBracketData, BracketMatchesByType } from "@/hooks/usePlayoffBracketData";

interface BracketViewProps {
  bracket: PlayoffBracket;
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
}

const BracketView: React.FC<BracketViewProps> = ({ bracket, teams, onEditMatch }) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const [showChampion, setShowChampion] = useState(true);
  
  // Get organized bracket data by match type (winners, losers, finals)
  const bracketMatchesByType = useMemo(() => {
    if (bracket.format === "Double Elimination") {
      // Filter and group matches by type for double elimination
      const winnersMatches = bracket.matches.filter(m => m.matchType === 'winners');
      const losersMatches = bracket.matches.filter(m => m.matchType === 'losers');
      const finalsMatches = bracket.matches.filter(m => m.matchType === 'finals');
      
      // Group matches by round for winners and losers brackets
      const groupMatchesByRound = (matches: typeof bracket.matches) => {
        const roundsMap: Record<number, typeof bracket.matches> = {};
        
        // Group by round
        matches.forEach(match => {
          if (!roundsMap[match.round]) {
            roundsMap[match.round] = [];
          }
          roundsMap[match.round].push(match);
        });
        
        // Convert object to array of arrays, sorted by round number
        return Object.keys(roundsMap)
          .map(Number)
          .sort((a, b) => a - b)
          .map(roundNum => roundsMap[roundNum].sort((a, b) => a.position - b.position));
      };
      
      return {
        winners: groupMatchesByRound(winnersMatches),
        losers: groupMatchesByRound(losersMatches),
        finals: finalsMatches
      };
    } else {
      // For other formats, continue using the existing logic
      return null;
    }
  }, [bracket]);

  // Group matches by round and type (for backward compatibility with single elimination)
  const matchesByRoundAndType = useMemo(() => {
    // If we're using the new double elimination structure, don't use the old grouping method
    if (bracket.format === "Double Elimination" && bracketMatchesByType) {
      return {};
    }
    
    const grouped: Record<string, typeof bracket.matches> = {};
    
    bracket.matches.forEach(match => {
      const key = `${match.round}-${match.matchType}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(match);
    });
    
    // Sort each group by position
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => a.position - b.position);
    });
    
    return grouped;
  }, [bracket.matches, bracket.format, bracketMatchesByType]);

  // Get unique rounds and types (for backward compatibility with single elimination)
  const roundsAndTypes = useMemo(() => {
    // If we're using the new double elimination structure, don't use the old grouping method
    if (bracket.format === "Double Elimination" && bracketMatchesByType) {
      return [];
    }
    
    const keys = Object.keys(matchesByRoundAndType);
    return keys.sort((a, b) => {
      const [roundA, typeA] = a.split('-');
      const [roundB, typeB] = b.split('-');
      
      // Play-in round should come first
      if (typeA === 'play-in') return -1;
      if (typeB === 'play-in') return 1;
      
      if (parseInt(roundA) === parseInt(roundB)) {
        // Winners bracket comes first, then losers, then finals
        if (typeA === 'finals') return 1;
        if (typeB === 'finals') return -1;
        return typeA === 'winners' ? -1 : 1;
      }
      return parseInt(roundA) - parseInt(roundB);
    });
  }, [matchesByRoundAndType, bracket.format, bracketMatchesByType]);

  // Find the champion if the tournament is complete
  const champion = useMemo(() => {
    const finalsMatches = bracket.matches.filter(m => m.matchType === 'finals');
    
    // If we have a finals match with a winner
    if (finalsMatches.length > 0) {
      const lastFinals = finalsMatches[finalsMatches.length - 1];
      
      if (lastFinals.winnerId) {
        return teams.find(team => team.id === lastFinals.winnerId) || null;
      }
    }
    
    return null;
  }, [bracket.matches, teams]);

  // Calculate bracket visualization paths for connectors
  const connectorPaths = getBracketConnectorPaths(bracket.matches);

  // Render double elimination bracket with separate columns for winners and losers
  if (bracket.format === "Double Elimination" && bracketMatchesByType) {
    return (
      <div className="overflow-auto my-4 relative">
        <div className={cn(
          "flex flex-col space-y-6 min-w-max p-6 rounded-lg",
          isLight 
            ? "bg-gradient-to-br from-white to-blue-50/10" 
            : "bg-gradient-to-br from-gray-900/80 to-gray-800/80"
        )}>
          <div className="flex space-x-16 relative">
            {/* Background grid for visual structure */}
            <div className="absolute inset-0 grid grid-cols-1 opacity-10">
              <div className="border-r border-dashed border-gray-300 dark:border-gray-600 h-full"></div>
            </div>

            {/* Winners Bracket */}
            {bracketMatchesByType.winners.map((roundMatches, roundIndex) => (
              <RoundColumn
                key={`winners-${roundIndex}`}
                round={String(roundIndex + 1)}
                type="winners"
                matches={roundMatches}
                teams={teams}
                onEditMatch={onEditMatch}
                verticalSpacing={getVerticalSpacing(roundIndex)}
                roundIndex={roundIndex}
                getNextMatch={(match) => getNextMatch(match, bracket.matches)}
              />
            ))}

            {/* Losers Bracket */}
            {bracketMatchesByType.losers.map((roundMatches, roundIndex) => (
              <RoundColumn
                key={`losers-${roundIndex}`}
                round={String(roundIndex + 1)}
                type="losers"
                matches={roundMatches}
                teams={teams}
                onEditMatch={onEditMatch}
                verticalSpacing={getVerticalSpacing(roundIndex)}
                roundIndex={roundIndex}
                getNextMatch={(match) => getNextMatch(match, bracket.matches)}
              />
            ))}

            {/* Finals */}
            {bracketMatchesByType.finals.length > 0 && (
              <RoundColumn
                key="finals"
                round="Finals"
                type="finals"
                matches={bracketMatchesByType.finals}
                teams={teams}
                onEditMatch={onEditMatch}
                verticalSpacing={2}
                roundIndex={0}
                getNextMatch={(match) => getNextMatch(match, bracket.matches)}
              />
            )}

            {/* SVG layer for bracket connectors */}
            <svg 
              className="absolute inset-0 w-full h-full pointer-events-none z-0"
              style={{ 
                overflow: 'visible',
              }}
            >
              {connectorPaths.map((path, i) => (
                <path
                  key={`connector-${i}`}
                  d={path}
                  fill="none"
                  stroke={isLight ? "#9ca3af" : "#6b7280"}
                  strokeWidth="2"
                  strokeDasharray={path.includes('M') && path.includes('C') ? "0" : "0"}
                  className="transition-colors duration-300"
                />
              ))}
            </svg>
          </div>
        </div>
        
        {/* Champion display modal when tournament is complete */}
        {champion && showChampion && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <ChampionDisplay 
              champion={champion} 
              onClose={() => setShowChampion(false)} 
              showConfetti={true}
            />
          </div>
        )}
      </div>
    );
  }

  // Render single elimination bracket (original rendering logic)
  return (
    <div className="overflow-auto my-4 relative">
      <div className={cn(
        "flex flex-col space-y-6 min-w-max p-6 rounded-lg",
        isLight 
          ? "bg-gradient-to-br from-white to-blue-50/10" 
          : "bg-gradient-to-br from-gray-900/80 to-gray-800/80"
      )}>
        <div className="flex space-x-16 relative">
          {/* Background grid for visual structure */}
          <div className="absolute inset-0 grid grid-cols-1 opacity-10">
            <div className="border-r border-dashed border-gray-300 dark:border-gray-600 h-full"></div>
          </div>

          {/* Tournament bracket rounds */}
          {roundsAndTypes.map((key, roundIndex) => {
            const [round, type] = key.split('-');
            const roundMatches = matchesByRoundAndType[key];
            
            // Calculate vertical spacing between matches based on round
            const verticalSpacing = getVerticalSpacing(roundIndex);
            
            return (
              <RoundColumn
                key={key}
                round={round}
                type={type}
                matches={roundMatches}
                teams={teams}
                onEditMatch={onEditMatch}
                verticalSpacing={verticalSpacing}
                roundIndex={roundIndex}
                getNextMatch={(match) => getNextMatch(match, bracket.matches)}
              />
            );
          })}

          {/* SVG layer for bracket connectors */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            style={{ 
              overflow: 'visible',
            }}
          >
            {connectorPaths.map((path, i) => (
              <path
                key={`connector-${i}`}
                d={path}
                fill="none"
                stroke={isLight ? "#9ca3af" : "#6b7280"}
                strokeWidth="2"
                strokeDasharray={path.includes('M') && path.includes('C') ? "0" : "0"}
                className="transition-colors duration-300"
              />
            ))}
          </svg>
        </div>
      </div>
      
      {/* Champion display modal when tournament is complete */}
      {champion && showChampion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <ChampionDisplay 
            champion={champion} 
            onClose={() => setShowChampion(false)} 
            showConfetti={true}
          />
        </div>
      )}
    </div>
  );
};

export default BracketView;
