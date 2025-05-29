
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { UseFormReturn } from "react-hook-form";
import { BracketFormValues } from "./BracketFormSchema";
import { useTeamRankings } from "@/hooks/useTeamRankings";
import { useFilteredTeams, useTeamSelection, useTeamSeeding } from "@/hooks/playoffs";
import SimpleTeamSelectionList from "../SimpleTeamSelectionList";
import TeamSelectionSummary from "../TeamSelectionSummary";

interface BracketFormTeamsProps {
  form: UseFormReturn<BracketFormValues>;
}

export const BracketFormTeams: React.FC<BracketFormTeamsProps> = ({ form }) => {
  // Minimum team requirement
  const minTeams = 2;
  const maxTeams = 16;
  
  // Fetch our own teams data with power scores - don't rely on props
  const { rankings, isLoading: rankingsLoading } = useTeamRankings();
  
  // Convert rankings to team format with seed numbers - these teams have proper power scores
  const rankedTeams = React.useMemo(() => 
    rankings.map((ranking, index) => ({
      id: ranking.teamId,
      name: ranking.teamName,
      logoUrl: ranking.imageUrl,
      imageUrl: ranking.imageUrl,
      seed: index + 1, // This is the correct seed based on rankings
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
    })), [rankings]);
  
  // Get division filtering
  const selectedDivisionName = form.watch('divisionName');
  
  // Filter teams by division using the new hook
  const filteredTeams = useFilteredTeams(rankedTeams, selectedDivisionName);
  
  // Apply seeding using the new hook
  const seededTeams = useTeamSeeding(filteredTeams);
  
  // Team selection using the new hook
  const currentSelection = form.watch('teams') || [];
  const { selected, toggle, setSelected } = useTeamSelection(currentSelection);
  
  // Sync form changes with team selection
  React.useEffect(() => {
    setSelected(currentSelection);
  }, [currentSelection, setSelected]);
  
  // Handle team toggle
  const handleTeamToggle = React.useCallback((teamId: string) => {
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
    
    form.setValue('teams', newSelection, { shouldValidate: true });
  }, [form, maxTeams]);

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
            Selected {currentSelection.length} of {maxTeams} maximum teams
            {seededTeams.length > 0 && ` from ${seededTeams.length} available`}
          </FormDescription>
          <FormControl>
            <SimpleTeamSelectionList
              teams={seededTeams}
              selected={selected}
              onToggle={handleTeamToggle}
              maxTeams={maxTeams}
            />
          </FormControl>
          <TeamSelectionSummary 
            count={currentSelection.length} 
            max={maxTeams}
            minTeams={minTeams}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
