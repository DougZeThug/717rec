import React, { useMemo, useState } from "react";
import type { PlayoffBracket, Team } from "@/types";
import RoundColumn from "./RoundColumn";
import { getBracketConnectorPaths, getVerticalSpacing, getNextMatch } from "./BracketUtils";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { blueAmber } from "@/styles/design-system";
import ChampionDisplay from "./celebration/ChampionDisplay";
import { usePlayoffBracketData, BracketMatchesByType } from "@/hooks/usePlayoffBracketData";
import DoubleElimBracket from "./DoubleElimBracket";
import { BRACKET_FORMATS } from "@/constants/brackets";

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
  const { bracketMatchesByType } = usePlayoffBracketData(bracket.id);

  // Check if we should use the double elimination layout
  const isDoubleElimination = bracket.format === BRACKET_FORMATS.DOUBLE;
  
  // If we have a double elimination bracket and the data is organized by type,
  // use the specialized double elimination component
  if (isDoubleElimination && bracketMatchesByType) {
    return (
      <DoubleElimBracket
        winners={bracketMatchesByType.winners}
        losers={bracketMatchesByType.losers}
        finals={bracketMatchesByType.finals}
        bracket={bracket}
        teams={teams}
        onEditMatch={onEditMatch}
      />
    );
  }

  // Group matches by round and type (for backward compatibility with single elimination)
  const matchesByRoundAndType = useMemo(() => {
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
  }, [bracket.matches]);

  // Get unique rounds and types (for backward compatibility with single elimination)
  const roundsAndTypes = useMemo(() => {
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
  }, [matchesByRoundAndType]);

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
