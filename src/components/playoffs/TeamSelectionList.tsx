
import React from "react";
import { FormMessage } from "@/components/ui/form";
import { Team } from "@/types";
import { TeamLogo } from "@/components/ui/team";
import { useTeamRankings } from "@/hooks/useTeamRankings";

interface TeamSelectionListProps {
  teams?: Team[] | undefined; // Make teams optional
  selectedTeams: string[];
  selectedTeamIds?: string[];
  onTeamToggle: (teamId: string) => void;
  onChange?: (selectedIds: string[]) => void;
  isLoading?: boolean;
  maxTeams?: number;
  divisionName?: string; // Add division filtering
}

const TeamSelectionList: React.FC<TeamSelectionListProps> = ({
  selectedTeams,
  selectedTeamIds,
  onTeamToggle,
  onChange,
  isLoading = false,
  maxTeams,
  divisionName
}) => {
  // Fetch our own teams data with power scores - don't rely on the teams prop
  const { rankings, isLoading: rankingsLoading } = useTeamRankings();
  
  console.log("TeamSelectionList: Fresh rankings data:", rankings.slice(0, 3).map(r => ({
    team: r.teamName,
    powerScore: r.powerScore,
    wins: r.wins,
    losses: r.losses,
    divisionName: r.divisionName
  })));
  
  // Convert rankings to team format with seed numbers
  const rankedTeams = rankings.map((ranking, index) => ({
    id: ranking.teamId,
    name: ranking.teamName,
    logoUrl: ranking.imageUrl,
    imageUrl: ranking.imageUrl,
    seed: index + 1,
    powerScore: ranking.powerScore,
    wins: ranking.wins,
    losses: ranking.losses,
    divisionName: ranking.divisionName,
    players: [],
    created_at: new Date().toISOString(),
    division_id: null,
    division: null,
    game_wins: ranking.gamesWon,
    game_losses: ranking.gamesLost,
    sos: ranking.sos,
    power_score: ranking.powerScore,
    win_percentage: ranking.winPercentage,
    game_win_percentage: ranking.gameWinPercentage,
    close_match_losses: ranking.closeMatchLosses || 0
  }));
  
  // Filter by division if specified
  const filteredTeams = divisionName 
    ? rankedTeams.filter(team => team.divisionName === divisionName)
    : rankedTeams;
  
  console.log("TeamSelectionList: Filtered teams for division:", filteredTeams.map(t => ({
    name: t.name,
    divisionName: t.divisionName,
    powerScore: t.powerScore
  })));
  
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
          <p className="text-center py-4 text-gray-500">Loading teams and calculating rankings...</p>
        ) : filteredTeams.length > 0 ? (
          <div className="space-y-2">
            {filteredTeams.map((team) => {
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
                      Power: {team.powerScore > 0 ? team.powerScore.toFixed(1) : 'TBD'}
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
            {divisionName ? `No teams found in ${divisionName} division` : 'No teams available'}
          </p>
        )}
      </div>
      <div className="text-xs text-gray-500">
        Selected: {selectedIds.length} teams
        {maxTeams && ` (max: ${maxTeams})`}
        <br />
        <span className="text-blue-600">Teams ordered by current standings (seed order)</span>
      </div>
      <FormMessage />
    </>
  );
};

export default TeamSelectionList;
