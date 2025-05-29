
import React from "react";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { useTeamRankings } from "@/hooks/useTeamRankings";
import { useFilteredTeams, useTeamSelection, useTeamSeeding } from "@/hooks/playoffs";
import SimpleTeamSelectionList from "../SimpleTeamSelectionList";
import TeamSelectionSummary from "../TeamSelectionSummary";

export interface BracketFormTeamsProps {
  divisionId: string | null;
  maxTeams: number;
  onChange: (ids: string[]) => void;
}

export const BracketFormTeams: React.FC<BracketFormTeamsProps> = ({ 
  divisionId, 
  maxTeams, 
  onChange 
}) => {
  // Minimum team requirement
  const minTeams = 2;
  
  // Fetch our own teams data with power scores
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
  
  // Filter teams by division using the new hook
  const filteredTeams = useFilteredTeams(rankedTeams, divisionId);
  
  // Apply seeding using the new hook
  const seededTeams = useTeamSeeding(filteredTeams);
  
  // Team selection using the new hook
  const { selected, toggle, setSelected } = useTeamSelection([]);
  
  // Sync with parent through onChange callback
  React.useEffect(() => {
    onChange(Array.from(selected));
  }, [selected, onChange]);
  
  // Handle team toggle
  const handleTeamToggle = React.useCallback((teamId: string) => {
    toggle(teamId, maxTeams);
  }, [toggle, maxTeams]);

  if (rankingsLoading) {
    return (
      <FormField
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
      name="teams"
      render={() => (
        <FormItem>
          <FormLabel>Select Teams (Min {minTeams}, Max {maxTeams})</FormLabel>
          <FormDescription className="text-xs">
            Selected {selected.size} of {maxTeams} maximum teams
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
            count={selected.size} 
            max={maxTeams}
            minTeams={minTeams}
          />
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
