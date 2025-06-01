
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
  console.log('  - bracket.matches detailed:', JSON.stringify(bracket?.matches, null, 2));
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

  // Enhanced validation with better loading state handling
  const hasValidMatches = bracket.matches && 
                         Array.isArray(bracket.matches) && 
                         bracket.matches.length > 0;

  console.log('🎯 BracketView: hasValidMatches result:', hasValidMatches);

  if (!hasValidMatches) {
    console.log('🎯 BracketView: No valid matches found in bracket');
    console.log('🎯 BracketView: Debug info:', {
      bracketExists: !!bracket,
      matchesExists: !!bracket.matches,
      matchesIsArray: Array.isArray(bracket.matches),
      matchesLength: bracket.matches?.length || 0,
      rawMatches: bracket.matches,
      matchesType: typeof bracket.matches
    });
    
    if (bracket.matches) {
      console.log('🎯 BracketView: Matches exists but invalid format');
      console.log('🎯 BracketView: Matches content:', JSON.stringify(bracket.matches, null, 2));
    } else {
      console.log('🎯 BracketView: Matches property is null/undefined');
    }
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{bracket.name || "Tournament Bracket"}</h2>
          <div className="text-sm text-gray-500">
            {bracket.format} • {bracket.state}
          </div>
        </div>
        <div className="text-center p-8 text-gray-500">
          <div className="animate-pulse mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full mx-auto mb-2"></div>
            <p className="text-lg font-semibold">Loading bracket matches...</p>
          </div>
          <p className="text-sm">The bracket structure is being generated. This may take a few moments.</p>
          <div className="text-xs mt-4 space-y-1 bg-gray-100 dark:bg-gray-800 p-3 rounded">
            <p><strong>Bracket ID:</strong> {bracket.id}</p>
            <p><strong>Matches loaded:</strong> {bracket.matches?.length || 0}</p>
            <p><strong>Expected:</strong> Should have 15 matches for 8 teams</p>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  console.log('🎯 BracketView: Rendering GlootBracket with', bracket.matches.length, 'matches');
  console.log('🎯 BracketView: Sample matches data:', bracket.matches.slice(0, 2));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{bracket.name || "Tournament Bracket"}</h2>
        <div className="text-sm text-gray-500">
          {bracket.format} • {bracket.state} • {bracket.matches.length} matches loaded
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
