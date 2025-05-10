
import { useState } from "react";
import { Team } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { 
  calculateTeamCompatibility, 
  haveTeamsPlayed 
} from "@/utils/autoSchedule/compatibilityUtils";
import { TimeBlockTeamsMap, TeamPairingMap } from "@/types/autoSchedule";

export const usePairingGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPairings, setGeneratedPairings] = useState<TeamPairingMap>({});
  const { toast } = useToast();

  const generateMatchPairings = async (
    date: Date,
    timeBlockTeams: TimeBlockTeamsMap
  ): Promise<TeamPairingMap | null> => {
    try {
      setIsGenerating(true);
      
      // Reset previously generated pairings
      setGeneratedPairings({});
      
      if (!timeBlockTeams) return null;
      
      // Generate pairings for each block
      const pairings: TeamPairingMap = {};
      
      for (const [block, teams] of Object.entries(timeBlockTeams)) {
        // Skip blocks with odd number of teams for now
        if (teams.length % 2 !== 0) {
          console.log(`Block ${block} has odd number of teams (${teams.length}), skipping for now`);
          pairings[block] = [];
          continue;
        }
        
        // Simple algorithm: sort by compatibility and match teams
        const blockPairings = await generatePairingsForBlock(teams);
        pairings[block] = blockPairings;
        
        console.log(`Generated ${blockPairings.length} pairings for ${block} block`);
      }
      
      // Store generated pairings
      setGeneratedPairings(pairings);
      
      return pairings;
    } catch (error) {
      console.error('Error generating match pairings:', error);
      toast({
        title: "Error",
        description: "Failed to generate match pairings. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  // Helper function to generate pairings for a specific block
  const generatePairingsForBlock = async (teams: Team[]) => {
    const blockPairings = [];
    const availableTeams = [...teams];
    
    while (availableTeams.length >= 2) {
      // Get first team
      const team1 = availableTeams.shift()!;
      
      // Find best match for team1
      let bestMatch = { team: availableTeams[0], score: -1, index: 0 };
      
      for (let i = 0; i < availableTeams.length; i++) {
        const team2 = availableTeams[i];
        const score = calculateTeamCompatibility(team1, team2);
        
        if (score > bestMatch.score) {
          bestMatch = { team: team2, score, index: i };
        }
      }
      
      // Remove the matched team from available teams
      availableTeams.splice(bestMatch.index, 1);
      
      // Check if teams have played before
      const hasPlayedBefore = await haveTeamsPlayed(team1.id, bestMatch.team.id);
      
      // Add pairing
      blockPairings.push({
        team1,
        team2: bestMatch.team,
        compatibilityScore: bestMatch.score,
        hasPlayedBefore
      });
    }
    
    return blockPairings;
  };

  return {
    isGenerating,
    generatedPairings,
    generateMatchPairings
  };
};
