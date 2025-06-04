
import React from "react";
import { SimpleBracketData } from "@/hooks/brackets/useBracketData";
import TournamentBracket from "./TournamentBracket";
import DoubleEliminationBracket from "./DoubleEliminationBracket";

interface SimpleBracketProps {
  bracket: SimpleBracketData;
  onMatchClick?: (matchId: string) => void;
}

const SimpleBracket: React.FC<SimpleBracketProps> = ({ bracket, onMatchClick }) => {
  console.log('🏆 DEBUG: SimpleBracket rendering with bracket:', {
    bracketExists: !!bracket,
    bracketId: bracket?.id,
    bracketName: bracket?.name,
    bracketFormat: bracket?.format,
    bracketState: bracket?.state,
    matchesCount: bracket?.matches?.length,
    matchesIsArray: Array.isArray(bracket?.matches),
    teamsCount: bracket?.teams?.length,
    timestamp: new Date().toISOString()
  });

  // Enhanced matches validation
  if (!bracket) {
    console.error('🚨 DEBUG: No bracket prop provided to SimpleBracket!');
    return (
      <div className="text-center p-8">
        <p className="text-red-500">Error: No bracket data provided</p>
      </div>
    );
  }

  if (!bracket.matches) {
    console.error('🚨 DEBUG: bracket.matches is null/undefined!', {
      bracket,
      matchesProperty: bracket.matches,
      bracketKeys: Object.keys(bracket)
    });
    return (
      <div className="text-center p-8">
        <h3 className="text-xl font-semibold mb-2">{bracket.name}</h3>
        <p className="text-red-500">Error: Matches property is missing</p>
        <div className="text-sm text-gray-400 mt-2">
          Bracket ID: {bracket.id} | State: {bracket.state}
        </div>
      </div>
    );
  }

  if (!Array.isArray(bracket.matches)) {
    console.error('🚨 DEBUG: bracket.matches is not an array!', {
      bracket,
      matchesProperty: bracket.matches,
      matchesType: typeof bracket.matches
    });
    return (
      <div className="text-center p-8">
        <h3 className="text-xl font-semibold mb-2">{bracket.name}</h3>
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

  console.log('🏆 DEBUG: SimpleBracket bracket type detection:', {
    hasWinnersMatches,
    hasLosersMatches,
    format: bracket.format,
    isDoubleElimination,
    matchTypeBreakdown: {
      winners: bracket.matches.filter(m => m.matchType === 'winners' || m.matchType === 'winner').length,
      losers: bracket.matches.filter(m => m.matchType === 'losers' || m.matchType === 'loser').length,
      finals: bracket.matches.filter(m => m.matchType === 'finals' || m.matchType === 'final').length
    }
  });

  console.log('🏆 DEBUG: SimpleBracket matches validation passed, rendering bracket component');

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
