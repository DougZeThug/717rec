
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
  divisions?: { id: string; name: string }[]; // Add divisions prop for mapping
}

export const BracketFormTeams: React.FC<BracketFormTeamsProps> = ({ 
  divisionId, 
  maxTeams, 
  onChange,
  divisions = []
}) => {
  // Minimum team requirement
  const minTeams = 2;
  
  // Fetch our own teams data with power scores
  const { rankings, isLoading: rankingsLoading } = useTeamRankings();
  
  // Create a lookup map for division name to division ID
  const divisionNameToIdMap = React.useMemo(() => {
    const map = new Map<string, string>();
    divisions.forEach(division => {
      map.set(division.name, division.id);
    });
    console.log("BracketFormTeams: Division lookup map:", Object.fromEntries(map));
    return map;
  }, [divisions]);
  
  // Convert rankings to team format with seed numbers - these teams have proper power scores
  const rankedTeams = React.useMemo(() => {
    if (!rankings || !Array.isArray(rankings)) {
      console.log("BracketFormTeams: No rankings data available");
      return [];
    }

    try {
      return rankings.map((ranking, index) => {
        // Map division name to proper division ID UUID
        const divisionId = ranking.divisionName ? divisionNameToIdMap.get(ranking.divisionName) : null;
        
        console.log("BracketFormTeams: Mapping team", {
          teamName: ranking.teamName,
          divisionName: ranking.divisionName,
          mappedDivisionId: divisionId
        });

        return {
          id: ranking.teamId,
          name: ranking.teamName,
          logoUrl: ranking.imageUrl,
          imageUrl: ranking.imageUrl,
          seed: index + 1, // This is the correct seed based on rankings
          powerScore: ranking.powerScore,
          wins: ranking.wins,
          losses: ranking.losses,
          division_id: divisionId, // Use properly mapped division UUID
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
        };
      });
    } catch (error) {
      console.error("BracketFormTeams: Error converting rankings to teams:", error);
      return [];
    }
  }, [rankings, divisionNameToIdMap]);
  
  // Filter teams by division using the new hook
  const filteredTeams = useFilteredTeams(rankedTeams, divisionId);
  
  console.log("BracketFormTeams: Filtering results", {
    totalTeams: rankedTeams.length,
    filteredTeams: filteredTeams.length,
    selectedDivisionId: divisionId,
    sampleTeam: rankedTeams[0] ? {
      name: rankedTeams[0].name,
      division_id: rankedTeams[0].division_id,
      divisionName: rankedTeams[0].divisionName
    } : null
  });
  
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

  // Detect error state - if not loading but no rankings available
  const hasError = !rankingsLoading && (!rankings || rankings.length === 0);

  // Show error state if rankings failed to load
  if (hasError) {
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
                Failed to load teams. Please refresh and try again.
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
