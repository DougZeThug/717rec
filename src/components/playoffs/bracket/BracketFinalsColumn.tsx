
import React from "react";
import { PlayoffMatch, Team } from "@/types";
import RoundColumn from "../RoundColumn";

interface BracketFinalsColumnProps {
  matches: PlayoffMatch[];
  teams: Team[];
  onEditMatch?: (matchId: string) => void;
  getNextMatch: (match: PlayoffMatch) => PlayoffMatch | null;
}

/**
 * Component for rendering the finals section of a bracket
 */
const BracketFinalsColumn: React.FC<BracketFinalsColumnProps> = ({
  matches,
  teams,
  onEditMatch,
  getNextMatch,
}) => {
  return (
    <div className="flex flex-col items-center justify-end relative">
      <h3 className="text-lg font-bold mb-4">Finals</h3>
      {matches.length > 0 && (
        <div className="flex justify-center relative mt-auto">
          <RoundColumn
            key="finals"
            round="Finals"
            type="finals"
            matches={matches}
            teams={teams}
            onEditMatch={onEditMatch}
            verticalSpacing={2}
            roundIndex={0}
            getNextMatch={getNextMatch}
          />
        </div>
      )}
    </div>
  );
};

export default BracketFinalsColumn;
