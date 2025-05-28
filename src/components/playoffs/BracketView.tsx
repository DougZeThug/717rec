
import React from "react";
import { PlayoffBracket, Team } from "@/types/playoffs";
import { ChallongeMatch, ChallongeParticipant } from "@/services/challonge/types";
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
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Tournament Bracket</h2>
          <div className="text-sm text-gray-500">
            Challonge Tournament
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <p>Challonge bracket rendering will be implemented here</p>
          <p>Matches: {matches.length}</p>
          <p>Participants: {participants.length}</p>
        </div>
      </div>
    );
  }

  // Handle local bracket display
  if (!bracket) {
    return <div>No bracket data available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{bracket.name || "Tournament Bracket"}</h2>
        <div className="text-sm text-gray-500">
          {bracket.format} • {bracket.state}
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
