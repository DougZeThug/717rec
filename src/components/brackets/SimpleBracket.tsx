
import React from "react";
import { SimpleBracketData } from "@/hooks/brackets/useBracketData";
import TournamentBracket from "./TournamentBracket";

interface SimpleBracketProps {
  bracket: SimpleBracketData;
  onMatchClick?: (matchId: string) => void;
}

const SimpleBracket: React.FC<SimpleBracketProps> = ({ bracket, onMatchClick }) => {
  console.log('SimpleBracket rendering with bracket:', {
    bracketExists: !!bracket,
    bracketId: bracket?.id,
    bracketName: bracket?.name,
    matchesCount: bracket?.matches?.length,
    teamsCount: bracket?.teams?.length
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
        <h3 className="text-xl font-semibold mb-2">{bracket.name}</h3>
        <p className="text-red-500">Error: Matches property is missing</p>
        <div className="text-sm text-gray-400 mt-2">
          Bracket ID: {bracket.id} | State: {bracket.state}
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
        <h3 className="text-xl font-semibold mb-2">{bracket.name}</h3>
        <p className="text-red-500">Error: Matches data is not an array</p>
        <div className="text-sm text-gray-400 mt-2">
          Bracket ID: {bracket.id} | Type: {typeof bracket.matches}
        </div>
      </div>
    );
  }

  console.log('SimpleBracket matches validation passed, rendering TournamentBracket');

  return (
    <div className="overflow-x-auto">
      <TournamentBracket bracket={bracket} onMatchClick={onMatchClick} />
    </div>
  );
};

export default SimpleBracket;
