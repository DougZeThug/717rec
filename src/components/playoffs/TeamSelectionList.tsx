
import React from "react";
import { FormMessage } from "@/components/ui/form";
import { Team } from "@/types";

interface TeamSelectionListProps {
  teams: Team[];
  selectedTeams: string[];
  onTeamToggle: (teamId: string) => void;
  isLoading?: boolean;
}

const TeamSelectionList: React.FC<TeamSelectionListProps> = ({
  teams,
  selectedTeams,
  onTeamToggle,
  isLoading = false
}) => {
  // Check if a team is selected
  const isTeamSelected = (teamId: string) => selectedTeams.includes(teamId);

  return (
    <>
      <div className="border rounded-md p-2 h-[200px] overflow-y-auto">
        {isLoading ? (
          <p className="text-center py-4 text-gray-500">Loading teams...</p>
        ) : teams.length > 0 ? (
          <div className="space-y-2">
            {teams.map((team) => (
              <div 
                key={team.id} 
                className={`flex items-center p-2 rounded cursor-pointer ${
                  isTeamSelected(team.id) 
                    ? 'bg-cornhole-green/20 border border-cornhole-green' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => onTeamToggle(team.id)}
              >
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                  {team.logoUrl && (
                    <img 
                      src={team.logoUrl} 
                      alt={team.name} 
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <span>{team.name}</span>
                <span className="ml-auto text-xs">
                  {team.wins}-{team.losses}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-4 text-gray-500">
            No teams found in this division
          </p>
        )}
      </div>
      <div className="text-xs text-gray-500">
        Selected: {selectedTeams.length} teams
      </div>
      <FormMessage />
    </>
  );
};

export default TeamSelectionList;
