
import React from "react";
import { SingleEliminationBracket, Match } from "@g-loot/react-tournament-brackets";
import { ChallongeMatch, ChallongeParticipant } from "@/utils/playoffs/playoffTypes";
import { adaptChallongeMatches } from "@/utils/playoffs/playoffUtils";

interface ChallongeBracketRendererProps {
  matches: ChallongeMatch[];
  participants: ChallongeParticipant[];
}

export const ChallongeBracketRenderer: React.FC<ChallongeBracketRendererProps> = ({ 
  matches, 
  participants 
}) => {
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
};
