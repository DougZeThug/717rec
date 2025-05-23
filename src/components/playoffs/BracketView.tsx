
import React from "react";
import { PlayoffBracket, Team } from "@/types";
import GlootBracket from "./GlootBracket";
import ChallongeBracketView from "./ChallongeBracketView";

interface BracketViewProps {
  bracket: PlayoffBracket;
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
}

/**
 * Main bracket view component that delegates to appropriate bracket renderer
 */
const BracketView: React.FC<BracketViewProps> = ({
  bracket,
  teams,
  onEditMatch
}) => {
  // For Challonge brackets, use the existing Challonge view
  if (bracket.challonge_tournament_id) {
    return (
      <ChallongeBracketView 
        bracket={bracket} 
        teams={teams} 
        onEditMatch={onEditMatch} 
      />
    );
  }
  
  // For native brackets, use the new @g-loot component
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
        teams={teams}
        onEditMatch={onEditMatch}
      />
    </div>
  );
};

export default BracketView;
