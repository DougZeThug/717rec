
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
  validateTeamCounts,
  generateTeamDistributionSummary
} from "@/utils/autoSchedule/edgeCaseUtils";
import { TimeBlockTeamsMap, TeamPairingMap, PairingResult } from "@/types/autoSchedule";
import { generatePairingsWithConfig } from "@/utils/autoSchedule/pairingAlgorithm";

export const usePairingGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPairings, setGeneratedPairings] = useState<TeamPairingMap>({});
  const [unmatchedTeamIds, setUnmatchedTeamIds] = useState<string[]>([]);
  const [unmatchedTeamDetails, setUnmatchedTeamDetails] = useState<Array<{
    timeBlock: string;
    team: { id: string; name: string };
  }>>([]);
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
  ): Promise<PairingResult | null> => {
    try {
      setIsGenerating(true);
      
      // Reset previously generated pairings
      setGeneratedPairings({});
      setUnmatchedTeamIds([]);
      setUnmatchedTeamDetails([]);
      
      // Clear caches for fresh calculation
      clearCompatibilityCache();
      clearMatchHistoryCache();
      
      if (!timeBlockTeams) return null;
      
      // Get a summary of the teams distribution
      const summary = generateTeamDistributionSummary(timeBlockTeams);
      console.log('Team distribution summary:', summary);
      
      // Validate team counts
      const { isValid, insufficientBlocks, oddBlocks } = validateTeamCounts(timeBlockTeams);
      if (!isValid && insufficientBlocks.length === Object.keys(timeBlockTeams).length) {
        toast({
          title: "Error",
          description: "No time blocks have sufficient teams to create matches.",
          variant: "destructive"
        });
        return null;
      }
      
      // Handle odd numbers of teams
      const { 
        adjustedTeams, 
        unmatchedTeamIds: newUnmatchedTeamIds,
        unmatchedTeamDetails: newUnmatchedDetails
      } = handleOddTeams(timeBlockTeams);
      
      // Store unmatched team IDs and details
      setUnmatchedTeamIds(newUnmatchedTeamIds);
      setUnmatchedTeamDetails(newUnmatchedDetails);
      
      // If we have unmatched teams, show a warning toast but continue
      if (newUnmatchedTeamIds.length > 0) {
        toast({
          title: "Some teams will be unmatched",
          description: `${newUnmatchedTeamIds.length} team${newUnmatchedTeamIds.length === 1 ? '' : 's'} will not have a match due to odd team counts.`,
          variant: "default"
        });
        
        // Log the names of teams that will be unmatched
        console.log('Unmatched teams:', newUnmatchedDetails);
      }
      
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
      
      // Return pairings and unmatchedTeamIds as a PairingResult
      return {
        pairings,
        unmatchedTeamIds: newUnmatchedTeamIds
      };
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
    unmatchedTeamDetails,
    generateMatchPairings
  };
};
