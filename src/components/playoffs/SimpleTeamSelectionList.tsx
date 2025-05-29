
import React from "react";
import TeamCard from "./TeamCard";
import type { Team } from "@/types";

interface Props {
  teams: (Team & { seed?: number })[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  maxTeams?: number;
}

const SimpleTeamSelectionList: React.FC<Props> = ({ teams, selected, onToggle, maxTeams }) => (
  <div className="border rounded-md p-2 h-[200px] overflow-y-auto">
    {teams.length > 0 ? (
      <div className="space-y-2">
        {teams.map((team) => {
          const isSelected = selected.has(team.id);
          const canSelect = !isSelected || selected.size < (maxTeams || 16);
          
          return (
            <TeamCard
              key={team.id}
              team={team}
              selected={isSelected}
              onToggle={onToggle}
              disabled={!canSelect && !isSelected}
            />
          );
        })}
      </div>
    ) : (
      <p className="text-center py-4 text-gray-500">
        No teams available
      </p>
    )}
  </div>
);

export default SimpleTeamSelectionList;
