
import { useState } from "react";
import { Team } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { 
  getCompatibilityScore, 
  haveTeamsPlayed 
} from "@/utils/autoSchedule/compatibilityUtils";
import { 
  clearCompatibilityCache, 
  clearMatchHistoryCache 
} from "@/utils/autoSchedule/cachingUtils";
import { 
  handleOddTeams, 
  validateTeamCounts 
} from "@/utils/autoSchedule/edgeCaseUtils";
import { TimeBlockTeamsMap, TeamPairingMap } from "@/types/autoSchedule";
import { generatePairingsWithConfig } from "@/utils/autoSchedule/pairingAlgorithm";

export const usePairingGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPairings, setGeneratedPairings] = useState<TeamPairingMap>({});
  const [unmatchedTeamIds, setUnmatchedTeamIds] = useState<string[]>([]);
  const { toast } = useToast();

  const generateMatchPairings = async (
    date: Date,
    timeBlockTeams: TimeBlockTeamsMap,
    config: {
      avoidRematches?: boolean;
      maxCompatibilityScore?: number;
      weights?: {
        powerScoreWeight?: number;
        sosWeight?: number;
        recordWeight?: number;
        gameRecordWeight?: number;
      }
    } = {}
  ): Promise<TeamPairingMap | null> => {
    try {
      setIsGenerating(true);
      
      // Reset previously generated pairings
      setGeneratedPairings({});
      setUnmatchedTeamIds([]);
      
      // Clear caches for fresh calculation
      clearCompatibilityCache();
      clearMatchHistoryCache();
      
      if (!timeBlockTeams) return null;
      
      // Validate team counts
      const { isValid, insufficientBlocks } = validateTeamCounts(timeBlockTeams);
      if (!isValid && insufficientBlocks.length === Object.keys(timeBlockTeams).length) {
        toast({
          title: "Error",
          description: "No time blocks have sufficient teams to create matches.",
          variant: "destructive"
        });
        return null;
      }
      
      // Handle odd numbers of teams
      const { adjustedTeams, unmatchedTeamIds: newUnmatchedTeamIds } = handleOddTeams(timeBlockTeams);
      
      // Store unmatched team IDs
      setUnmatchedTeamIds(newUnmatchedTeamIds);
      
      // Generate pairings for each block
      const pairings: TeamPairingMap = {};
      
      // Process each time block sequentially to avoid UI freezing
      for (const [block, teams] of Object.entries(adjustedTeams)) {
        // Skip blocks with insufficient teams
        if (teams.length < 2) {
          pairings[block] = [];
          continue;
        }
        
        // Generate pairings for this block with provided config
        const blockPairings = await generatePairingsWithConfig(teams, {
          avoidRematches: config.avoidRematches ?? true,
          haveTeamsPlayedFn: haveTeamsPlayed,
          getCompatibilityScoreFn: getCompatibilityScore,
          maxScore: config.maxCompatibilityScore ?? 10,
          weights: config.weights || {
            powerScoreWeight: 4,
            sosWeight: 2,
            recordWeight: 2.5,
            gameRecordWeight: 1.5
          }
        });
        
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

  return {
    isGenerating,
    generatedPairings,
    unmatchedTeamIds,
    generateMatchPairings
  };
};
