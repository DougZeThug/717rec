
import React from "react";
import { SimpleBracketData } from "@/hooks/brackets/useBracketData";
import TournamentBracket from "./TournamentBracket";
import DoubleEliminationBracket from "./DoubleEliminationBracket";

interface SimpleBracketProps {
  bracket: SimpleBracketData;
  onMatchClick?: (matchId: string) => void;
}

const SimpleBracket: React.FC<SimpleBracketProps> = ({ bracket, onMatchClick }) => {
  console.log('SimpleBracket rendering with bracket:', {
    bracketExists: !!bracket,
    bracketId: bracket?.id,
    bracketName: bracket?.title || bracket?.name,
    matchesCount: bracket?.matches?.length,
    teamsCount: bracket?.teams?.length || 0
  });

  // Enhanced matches validation
  if (!bracket) {
    console.error('No bracket prop provided to SimpleBracket!');
    return (
      <div className="text-center p-8">
        <p className="text-red-500">Error: No bracket data provided</p>
      </div>
    );
  }

  if (!bracket.matches) {
    console.error('bracket.matches is null/undefined!', {
      bracket,
      matchesProperty: bracket.matches
    });
    return (
      <div className="text-center p-8">
        <h3 className="text-xl font-semibold mb-2">{bracket.title || bracket.name}</h3>
        <p className="text-red-500">Error: Matches property is missing</p>
        <div className="text-sm text-gray-400 mt-2">
          Bracket ID: {bracket.id} | State: {bracket.state || 'unknown'}
        </div>
      </div>
    );
  }

  if (!Array.isArray(bracket.matches)) {
    console.error('bracket.matches is not an array!', {
      bracket,
      matchesProperty: bracket.matches,
      matchesType: typeof bracket.matches
    });
    return (
      <div className="text-center p-8">
        <h3 className="text-xl font-semibold mb-2">{bracket.title || bracket.name}</h3>
        <p className="text-red-500">Error: Matches data is not an array</p>
        <div className="text-sm text-gray-400 mt-2">
          Bracket ID: {bracket.id} | Type: {typeof bracket.matches}
        </div>
      </div>
    );
  }

  // Detect if this is a double elimination bracket
  const hasWinnersMatches = bracket.matches.some(match => 
    match.matchType === 'winners' || match.matchType === 'winner'
  );
  const hasLosersMatches = bracket.matches.some(match => 
    match.matchType === 'losers' || match.matchType === 'loser'
  );
  
  const isDoubleElimination = hasWinnersMatches || hasLosersMatches || 
    bracket.format?.toLowerCase().includes('double');

  console.log('SimpleBracket bracket type detection:', {
    hasWinnersMatches,
    hasLosersMatches,
    format: bracket.format,
    isDoubleElimination
  });

  console.log('SimpleBracket matches validation passed, rendering bracket component');

  return (
    <div className="overflow-x-auto">
      {isDoubleElimination ? (
        <DoubleEliminationBracket bracket={bracket} onMatchClick={onMatchClick} />
      ) : (
        <TournamentBracket bracket={bracket} onMatchClick={onMatchClick} />
      )}
    </div>
  );
};

export default SimpleBracket;
