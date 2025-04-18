
import React from "react";
import MatchRow from "./MatchRow";
import { Team } from "@/types";

interface MatchPair {
  id: string;
  team1Id: string | null;
  team2Id: null;
  timeslot: string | null;
}

interface MatchPairsListProps {
  pairs: MatchPair[];
  teams: Team[];
  onUpdate: (id: string, updates: Partial<MatchPair>) => void;
  onRemove: (id: string) => void;
}

const MatchPairsList = ({ pairs, teams, onUpdate, onRemove }: MatchPairsListProps) => {
  return (
    <div className="space-y-4">
      {pairs.map((pair) => (
        <MatchRow
          key={pair.id}
          pair={pair}
          teams={teams}
          onUpdate={(updates) => onUpdate(pair.id, updates)}
          onRemove={() => onRemove(pair.id)}
        />
      ))}
    </div>
  );
};

export default MatchPairsList;
