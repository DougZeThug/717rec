
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
  teams: Team[] | undefined;
}

export const BracketFormTeams: React.FC<BracketFormTeamsProps> = ({ form, teams }) => {
  // Minimum team requirement
  const minTeams = 2;
  const maxTeams = 16;
  
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
  
  // Filter by selected division if needed
  const selectedDivisionId = form.watch('divisionId');
  const filteredTeams = selectedDivisionId 
    ? rankedTeams.filter(team => team.division_id === selectedDivisionId)
    : rankedTeams;
  
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
              {rankingsLoading ? (
                <div className="text-center py-4 text-gray-500">
                  Loading team rankings...
                </div>
              ) : validTeams.length > 0 ? (
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
                            Power: {team.powerScore.toFixed(1)}
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
                  No teams found in this division
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
