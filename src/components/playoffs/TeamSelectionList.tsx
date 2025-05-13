
import React from "react";
import { FormMessage } from "@/components/ui/form";
import { Team } from "@/types";

interface TeamSelectionListProps {
  teams: Team[];
  selectedTeams: string[];
  selectedTeamIds?: string[]; // Added this prop for compatibility
  onTeamToggle: (teamId: string) => void;
  onChange?: (selectedIds: string[]) => void; // Added this prop for compatibility
  isLoading?: boolean;
  maxTeams?: number; // Added maxTeams prop
}

const TeamSelectionList: React.FC<TeamSelectionListProps> = ({
  teams,
  selectedTeams,
  selectedTeamIds,
  onTeamToggle,
  onChange,
  isLoading = false,
  maxTeams
}) => {
  // Use either selectedTeamIds or selectedTeams
  const selectedIds = selectedTeamIds || selectedTeams;
  
  // Check if a team is selected
  const isTeamSelected = (teamId: string) => selectedIds.includes(teamId);
  
  // Handle team toggle with either callback style
  const handleToggle = (teamId: string) => {
    if (onChange) {
      const newSelection = isTeamSelected(teamId)
        ? selectedIds.filter(id => id !== teamId)
        : [...selectedIds, teamId];
      
      // If maxTeams is defined, enforce the limit
      if (maxTeams && !isTeamSelected(teamId) && selectedIds.length >= maxTeams) {
        return; // Don't add more teams if at max
      }
      
      onChange(newSelection);
    } else {
      onTeamToggle(teamId);
    }
  };

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
                onClick={() => handleToggle(team.id)}
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
        Selected: {selectedIds.length} teams
        {maxTeams && ` (max: ${maxTeams})`}
      </div>
      <FormMessage />
    </>
  );
};

export default TeamSelectionList;
