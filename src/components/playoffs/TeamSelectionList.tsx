
import React from "react";
import { FormMessage } from "@/components/ui/form";
import { Team } from "@/types";
import { TeamLogo } from "@/components/ui/team";
import { useTeamRankings } from "@/hooks/useTeamRankings";

interface TeamSelectionListProps {
  teams: Team[] | undefined;
  selectedTeams: string[];
  selectedTeamIds?: string[];
  onTeamToggle: (teamId: string) => void;
  onChange?: (selectedIds: string[]) => void;
  isLoading?: boolean;
  maxTeams?: number;
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
  // Get properly ranked teams using the ranking system
  const { rankings, isLoading: rankingsLoading } = useTeamRankings(teams);
  
  // Convert rankings back to team format with seed numbers
  const rankedTeams = rankings.map((ranking, index) => {
    const team = teams?.find(t => t.id === ranking.teamId);
    if (!team) return null;
    
    return {
      ...team,
      seed: index + 1, // Add seed number based on ranking position
      powerScore: ranking.powerScore,
      wins: ranking.wins,
      losses: ranking.losses
    };
  }).filter(Boolean) as (Team & { seed: number; powerScore: number })[];
  
  // Use either selectedTeamIds or selectedTeams
  const selectedIds = selectedTeamIds || selectedTeams || [];
  
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
    } else if (onTeamToggle) {
      onTeamToggle(teamId);
    }
  };

  const isLoadingData = isLoading || rankingsLoading;

  return (
    <>
      <div className="border rounded-md p-2 h-[200px] overflow-y-auto">
        {isLoadingData ? (
          <p className="text-center py-4 text-gray-500">Loading teams...</p>
        ) : rankedTeams.length > 0 ? (
          <div className="space-y-2">
            {rankedTeams.map((team) => {
              // Skip rendering invalid teams
              if (!team || !team.id) return null;
              
              return (
                <div 
                  key={team.id} 
                  className={`flex items-center p-2 rounded cursor-pointer ${
                    isTeamSelected(team.id) 
                      ? 'bg-cornhole-green/20 border border-cornhole-green' 
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => handleToggle(team.id)}
                >
                  <div className="mr-3 flex items-center justify-center w-6 h-6 bg-blue-100 rounded-full text-xs font-bold text-blue-800">
                    {team.seed}
                  </div>
                  <div className="mr-2">
                    <TeamLogo 
                      imageUrl={team.logoUrl || team.imageUrl} 
                      teamName={team.name || 'Unnamed Team'} 
                      size="sm"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{team.name || 'Unnamed Team'}</div>
                    <div className="text-xs text-gray-500">
                      Power: {team.powerScore.toFixed(1)}
                    </div>
                  </div>
                  <span className="ml-auto text-xs">
                    {team.wins || 0}-{team.losses || 0}
                  </span>
                </div>
              );
            })}
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
        <br />
        <span className="text-blue-600">Teams ordered by current standings</span>
      </div>
      <FormMessage />
    </>
  );
};

export default TeamSelectionList;
