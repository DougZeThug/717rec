
import React from "react";
import type { PlayoffBracket, Team } from "@/types";
import RoundColumn from "./RoundColumn";
import { getVerticalSpacing, getNextMatch } from "./BracketUtils";

interface BracketViewProps {
  bracket: PlayoffBracket;
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
}

const BracketView: React.FC<BracketViewProps> = ({ bracket, teams, onEditMatch }) => {
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

  return (
    <div className="overflow-auto">
      <div className="flex flex-col space-y-6 min-w-max p-4">
        <div className="flex space-x-16 relative">
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
        </div>
      </div>
    </div>
  );
};

export default BracketView;
