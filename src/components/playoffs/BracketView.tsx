
import React from "react";
import { PlayoffBracket, Team } from "@/types/playoffs";
import { ChallongeMatch, ChallongeParticipant } from "@/services/challonge/types";
import { SingleEliminationBracket, Match } from "@g-loot/react-tournament-brackets";
import { adaptChallongeMatches } from "@/utils/adaptChallongeMatches";
import GlootBracket from "./GlootBracket";

export interface Participant { 
  id: number; 
  name: string; 
}

interface BracketViewProps {
  bracket?: PlayoffBracket;
  teams?: Team[];
  matches?: ChallongeMatch[];
  participants?: ChallongeParticipant[];
  onEditMatch?: (matchId: string) => void;
}

/**
 * Main bracket view component that uses @g-loot bracket renderer
 */
const BracketView: React.FC<BracketViewProps> = ({
  bracket,
  teams,
  matches,
  participants,
  onEditMatch
}) => {
  console.log('🎯 BracketView rendered with props:');
  console.log('  - bracket:', bracket);
  console.log('  - bracket.matches:', bracket?.matches);
  console.log('  - bracket.matches.length:', bracket?.matches?.length);
  console.log('  - teams:', teams);
  console.log('  - teams.length:', teams?.length);
  console.log('  - challonge matches:', matches);
  console.log('  - challonge participants:', participants);

  // Handle Challonge bracket display
  if (matches && participants) {
    console.log('🎯 BracketView: Rendering Challonge bracket');
    const playerMap = Object.fromEntries(
      participants.map(p => [p.id, p.name])
    );
    const adapted = adaptChallongeMatches(matches, playerMap);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Tournament Bracket</h2>
          <div className="text-sm text-gray-500">
            Challonge Tournament
          </div>
        </div>
        
        <div className="w-full overflow-auto">
          <div className="min-w-max p-4">
            <SingleEliminationBracket
              matches={adapted}
              matchComponent={Match}
            />
          </div>
        </div>
      </div>
    );
  }

  // Handle local bracket display
  if (!bracket) {
    console.log('🎯 BracketView: No bracket data available');
    return <div>No bracket data available</div>;
  }

  console.log('🎯 BracketView: Processing local bracket');
  console.log('🎯 BracketView: Bracket matches check:', {
    hasMatches: !!bracket.matches,
    isArray: Array.isArray(bracket.matches),
    length: bracket.matches?.length || 0,
    matches: bracket.matches
  });

  // Check if bracket has matches
  if (!bracket.matches || !Array.isArray(bracket.matches) || bracket.matches.length === 0) {
    console.log('🎯 BracketView: No matches found in bracket');
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{bracket.name || bracket.title || "Tournament Bracket"}</h2>
          <div className="text-sm text-gray-500">
            {bracket.format} • {bracket.state}
          </div>
        </div>
        <div className="text-center p-8 text-gray-500">
          <p>No matches found for this bracket. The bracket structure may still be generating.</p>
          <p className="text-xs mt-2">Debug: Bracket has {bracket.matches?.length || 0} matches</p>
        </div>
      </div>
    );
  }

  console.log('🎯 BracketView: Rendering GlootBracket with', bracket.matches.length, 'matches');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{bracket.name || bracket.title || "Tournament Bracket"}</h2>
        <div className="text-sm text-gray-500">
          {bracket.format} • {bracket.state} • {bracket.matches.length} matches
        </div>
      </div>
      
      <GlootBracket 
        bracket={bracket}
        teams={teams || []}
        onEditMatch={onEditMatch}
      />
    </div>
  );
};

export default BracketView;
