
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { UseFormReturn } from "react-hook-form";
import { BracketFormValues } from "./BracketFormSchema";
import { Team } from "@/types";
import { validateTeamSelection } from "@/utils/bracketValidation";
import { isValidUUID } from "@/utils/validation";
import { useTeamRankings } from "@/hooks/useTeamRankings";

interface BracketFormTeamsProps {
  form: UseFormReturn<BracketFormValues>;
  teams?: Team[] | undefined; // Make teams optional since we'll fetch our own
}

export const BracketFormTeams: React.FC<BracketFormTeamsProps> = ({ form }) => {
  // Minimum team requirement
  const minTeams = 2;
  const maxTeams = 16;
  
  // Fetch our own teams data with power scores - don't rely on the prop
  const { rankings, isLoading: rankingsLoading } = useTeamRankings();
  
  console.log("BracketFormTeams: Fresh rankings data with power scores:", rankings.slice(0, 3).map(r => ({
    team: r.teamName,
    powerScore: r.powerScore,
    wins: r.wins,
    losses: r.losses,
    divisionName: r.divisionName
  })));
  
  // Convert rankings to team format with seed numbers - these teams have proper power scores
  const rankedTeams = rankings.map((ranking, index) => ({
    id: ranking.teamId,
    name: ranking.teamName,
    logoUrl: ranking.imageUrl,
    imageUrl: ranking.imageUrl,
    seed: index + 1,
    powerScore: ranking.powerScore,
    wins: ranking.wins,
    losses: ranking.losses,
    division_id: null, // Will be populated from division filtering
    divisionName: ranking.divisionName,
    players: [],
    created_at: new Date().toISOString(),
    game_wins: ranking.gamesWon,
    game_losses: ranking.gamesLost,
    sos: ranking.sos,
    power_score: ranking.powerScore,
    win_percentage: ranking.winPercentage,
    game_win_percentage: ranking.gameWinPercentage,
    close_match_losses: ranking.closeMatchLosses || 0
  }));
  
  console.log("BracketFormTeams: Available teams with divisions:", rankedTeams.map(t => ({
    name: t.name,
    divisionName: t.divisionName,
    powerScore: t.powerScore
  })));
  
  // Filter by selected division if needed
  const selectedDivisionId = form.watch('divisionId');
  const selectedDivisionName = form.watch('divisionName'); // Get division name for filtering
  
  console.log("BracketFormTeams: Selected division:", { selectedDivisionId, selectedDivisionName });
  
  // Filter teams by division name since that's what we have in rankings
  const filteredTeams = selectedDivisionName 
    ? rankedTeams.filter(team => team.divisionName === selectedDivisionName)
    : rankedTeams;
  
  console.log("BracketFormTeams: Filtered teams for division:", filteredTeams.map(t => ({
    name: t.name,
    divisionName: t.divisionName,
    powerScore: t.powerScore
  })));
  
  // Verify teams and filter out invalid teams
  const validTeams = Array.isArray(filteredTeams) ? filteredTeams.filter(team => 
    team && 
    team.id && 
    isValidUUID(team.id) && 
    team.name && 
    typeof team.name === 'string'
  ) : [];
  
  // Get current selection to show count
  const selectedTeams = form.watch('teams') || [];
  const teamCount = selectedTeams.length;

  // Handle team selection with validation
  const handleTeamToggle = (teamId: string) => {
    if (!teamId || !isValidUUID(teamId)) {
      console.warn('Attempted to toggle invalid team ID:', teamId);
      return;
    }

    const currentTeams = form.getValues('teams') || [];
    const isSelected = currentTeams.includes(teamId);
    
    let newSelection: string[];
    if (isSelected) {
      newSelection = currentTeams.filter(id => id !== teamId);
    } else {
      if (currentTeams.length >= maxTeams) {
        return; // Don't add more teams if at max
      }
      newSelection = [...currentTeams, teamId];
    }
    
    // Validate selection before updating
    const validation = validateTeamSelection(newSelection);
    if (validation.isValid || newSelection.length === 0) {
      form.setValue('teams', newSelection, { shouldValidate: true });
    }
  };

  if (rankingsLoading) {
    return (
      <FormField
        control={form.control}
        name="teams"
        render={() => (
          <FormItem>
            <FormLabel>Select Teams (Min {minTeams}, Max {maxTeams})</FormLabel>
            <FormDescription className="text-xs">
              Loading team rankings and seeding order...
            </FormDescription>
            <FormControl>
              <Card className="p-4 text-center text-gray-500">
                Loading teams...
              </Card>
            </FormControl>
          </FormItem>
        )}
      />
    );
  }

  return (
    <FormField
      control={form.control}
      name="teams"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Select Teams (Min {minTeams}, Max {maxTeams})</FormLabel>
          <FormDescription className="text-xs">
            Selected {teamCount} of {maxTeams} maximum teams
            {validTeams.length > 0 && ` from ${validTeams.length} available`}
            <br />
            <span className="text-blue-600">Teams are ordered by current standings (seeding order)</span>
          </FormDescription>
          <FormControl>
            <Card className="p-2 max-h-64 overflow-y-auto">
              {validTeams.length > 0 ? (
                <div className="space-y-2">
                  {validTeams.map((team) => {
                    const isSelected = selectedTeams.includes(team.id);
                    const canSelect = !isSelected || selectedTeams.length < maxTeams;
                    
                    return (
                      <div 
                        key={team.id} 
                        className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-cornhole-green/20 border border-cornhole-green' 
                            : canSelect
                              ? 'hover:bg-gray-100'
                              : 'opacity-50 cursor-not-allowed'
                        }`}
                        onClick={() => canSelect && handleTeamToggle(team.id)}
                      >
                        <div className="mr-3 flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full text-xs font-bold text-blue-800">
                          {team.seed}
                        </div>
                        <div className="mr-2">
                          {team.logoUrl || team.imageUrl ? (
                            <img 
                              src={team.logoUrl || team.imageUrl} 
                              alt={team.name} 
                              className="w-8 h-8 rounded object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs">
                              {team.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{team.name}</div>
                          <div className="text-xs text-gray-500">
                            Power: {team.powerScore > 0 ? team.powerScore.toFixed(1) : 'TBD'}
                          </div>
                        </div>
                        <span className="ml-auto text-xs text-gray-500">
                          {team.wins}-{team.losses}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">
                  {selectedDivisionName ? `No teams found in ${selectedDivisionName} division` : 'No teams available. Please select a division first.'}
                </p>
              )}
            </Card>
          </FormControl>
          <FormMessage />
          {teamCount > 0 && teamCount < minTeams && (
            <p className="text-xs text-amber-500 mt-1">
              Please select at least {minTeams} teams to create a bracket
            </p>
          )}
          {teamCount >= maxTeams && (
            <p className="text-xs text-blue-500 mt-1">
              Maximum team limit reached
            </p>
          )}
        </FormItem>
      )}
    />
  );
};
