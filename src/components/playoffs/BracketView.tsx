
import React from "react";
import type { PlayoffBracket, Team } from "@/types";
import RoundColumn from "./RoundColumn";
import { getBracketConnectorPaths, getVerticalSpacing, getNextMatch } from "./BracketUtils";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { blueAmber } from "@/styles/design-system";

interface BracketViewProps {
  bracket: PlayoffBracket;
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
}

const BracketView: React.FC<BracketViewProps> = ({ bracket, teams, onEditMatch }) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  
  // Group matches by round and type
  const matchesByRoundAndType: Record<string, typeof bracket.matches> = {};
  
  bracket.matches.forEach(match => {
    const key = `${match.round}-${match.matchType || 'Winners'}`;
    if (!matchesByRoundAndType[key]) {
      matchesByRoundAndType[key] = [];
    }
    matchesByRoundAndType[key].push(match);
  });
  
  // Sort each group by position
  Object.keys(matchesByRoundAndType).forEach(key => {
    matchesByRoundAndType[key].sort((a, b) => a.position - b.position);
  });

  // Get unique rounds and types
  const roundsAndTypes = Object.keys(matchesByRoundAndType).sort((a, b) => {
    const [roundA, typeA] = a.split('-');
    const [roundB, typeB] = b.split('-');
    if (parseInt(roundA) === parseInt(roundB)) {
      // Winners bracket comes first, then losers, then finals
      if (typeA === 'Finals') return 1;
      if (typeB === 'Finals') return -1;
      return typeA === 'Winners' ? -1 : 1;
    }
    return parseInt(roundA) - parseInt(roundB);
  });

  // Calculate bracket visualization paths for connectors
  const connectorPaths = getBracketConnectorPaths(bracket.matches);

  return (
    <div className="overflow-auto my-4">
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
    </div>
  );
};

export default BracketView;
