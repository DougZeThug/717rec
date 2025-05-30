
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
  const { rankings, isLoading: rankingsLoading, error: rankingsError } = useTeamRankings();
  
  // Convert rankings to team format with seed numbers - these teams have proper power scores
  const rankedTeams = React.useMemo(() => {
    if (!rankings || !Array.isArray(rankings)) {
      console.log("BracketFormTeams: No rankings data available");
      return [];
    }

    try {
      return rankings.map((ranking, index) => ({
        id: ranking.teamId,
        name: ranking.teamName,
        logoUrl: ranking.imageUrl,
        imageUrl: ranking.imageUrl,
        seed: index + 1, // This is the correct seed based on rankings
        powerScore: ranking.powerScore,
        wins: ranking.wins,
        losses: ranking.losses,
        division_id: ranking.divisionId || null, // Use divisionId from rankings
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
    } catch (error) {
      console.error("BracketFormTeams: Error converting rankings to teams:", error);
      return [];
    }
  }, [rankings]);
  
  // Filter teams by division using the new hook
  const filteredTeams = useFilteredTeams(rankedTeams, divisionId);
  
  // Apply seeding using the new hook
  const seededTeams = useTeamSeeding(filteredTeams);
  
  // Team selection using the new hook
  const { selected, toggle, setSelected } = useTeamSelection([]);
  
  // Sync with parent through onChange callback
  React.useEffect(() => {
    try {
      onChange(Array.from(selected));
    } catch (error) {
      console.error("BracketFormTeams: Error in onChange callback:", error);
    }
  }, [selected, onChange]);
  
  // Handle team toggle
  const handleTeamToggle = React.useCallback((teamId: string) => {
    try {
      toggle(teamId, maxTeams);
    } catch (error) {
      console.error("BracketFormTeams: Error toggling team:", error);
    }
  }, [toggle, maxTeams]);

  // Show error state if rankings failed to load
  if (rankingsError) {
    return (
      <FormField
        name="teams"
        render={() => (
          <FormItem>
            <FormLabel>Select Teams (Min {minTeams}, Max {maxTeams})</FormLabel>
            <FormDescription className="text-xs text-red-600">
              Error loading team data. Please try refreshing the page.
            </FormDescription>
            <FormControl>
              <Card className="p-4 text-center text-red-500 border-red-300">
                Failed to load teams: {rankingsError.message || "Unknown error"}
              </Card>
            </FormControl>
          </FormItem>
        )}
      />
    );
  }

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

  // Show message if no teams available for selected division
  if (divisionId && filteredTeams.length === 0) {
    return (
      <FormField
        name="teams"
        render={() => (
          <FormItem>
            <FormLabel>Select Teams (Min {minTeams}, Max {maxTeams})</FormLabel>
            <FormDescription className="text-xs">
              No teams found for the selected division.
            </FormDescription>
            <FormControl>
              <Card className="p-4 text-center text-gray-500">
                No teams available in this division
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
