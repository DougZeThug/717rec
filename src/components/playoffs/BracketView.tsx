
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
  // Handle Challonge bracket display
  if (matches && participants) {
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
    return <div>No bracket data available</div>;
  }

  // Debug logging to see what data we have
  console.log('BracketView: bracket data:', bracket);
  console.log('BracketView: bracket matches:', bracket.matches);
  console.log('BracketView: teams data:', teams);

  // Check if bracket has matches
  if (!bracket.matches || bracket.matches.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{bracket.name || "Tournament Bracket"}</h2>
          <div className="text-sm text-gray-500">
            {bracket.format} • {bracket.state}
          </div>
        </div>
        <div className="text-center p-8 text-gray-500">
          No matches found for this bracket. The bracket structure may still be generating.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{bracket.name || "Tournament Bracket"}</h2>
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
