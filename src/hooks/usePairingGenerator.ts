import { useState, useCallback } from 'react';
import { TeamPairingMap, TimeBlockTeamsMap, AlgorithmConfig, PairingResult, DualBlockConfig } from '@/types/autoSchedule';
import { generatePairingsWithConfig } from '@/utils/autoSchedule/pairingAlgorithm';
import { calculateConfigurableCompatibility } from '@/utils/autoSchedule/compatibilityUtils';
import { useTeamFetching } from './useTeamFetching';
import { useToast } from '@/hooks/use-toast';
import { normalizeDate } from '@/utils/dateNormalization';
import { haveTeamsPlayedBefore } from '@/utils/autoSchedule/matchHistoryService';
import { generateDualBlockPairings } from '@/utils/autoSchedule/dualBlock'; // Updated import

/**
 * Hook to generate and manage team pairings for scheduling
 */
export const usePairingGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPairings, setGeneratedPairings] = useState<TeamPairingMap>({});
  const [unmatchedTeamIds, setUnmatchedTeamIds] = useState<string[]>([]);
  const { teams } = useTeamFetching();
  const { toast } = useToast();

  /**
   * Generate pairings for all time blocks
   * Enhanced with dual block mode
   */
  const generateMatchPairings = useCallback(async (
    date: Date,
    timeBlockTeams: TimeBlockTeamsMap,
    config: AlgorithmConfig = {}
  ): Promise<PairingResult | null> => {
    setIsGenerating(true);
    
    try {
      console.log("Generating match pairings for:", {
        date: normalizeDate(date, 'generateMatchPairings'),
        teamCount: Object.values(timeBlockTeams).reduce((sum, teams) => sum + teams.length, 0),
        config
      });
      
      const pairings: TeamPairingMap = {};
      let allUnmatchedTeamIds: string[] = [];
      
      // Handle dual match mode specifically
      if (config.dualMatchMode) {
        // For dual match mode, we need to ensure each team plays in both
        // the early and late blocks with different opponents
        const dualBlockConfig: DualBlockConfig = {
          ...config,
          // Add any dual-specific config here
        };
        
        const dualBlockPairingResult = await generateDualBlockPairings(
          timeBlockTeams,
          dualBlockConfig,
          toast // Pass the toast function for notifications
        );
        
        if (dualBlockPairingResult) {
          Object.assign(pairings, dualBlockPairingResult.pairings);
          allUnmatchedTeamIds = dualBlockPairingResult.unmatchedTeamIds;
        }
      } else {
        // Standard single-block pairing algorithm
        for (const [block, teams] of Object.entries(timeBlockTeams)) {
          // Skip empty blocks
          if (!teams || teams.length < 2) {
            console.log(`Skipping empty block: ${block}`);
            continue;
          }
          
          // Skip blocks with odd number of teams (warn the user)
          if (teams.length % 2 !== 0) {
            console.warn(`Block ${block} has odd number of teams (${teams.length}). One team will be unmatched.`);
          }
          
          // Generate pairings for this time block
          console.log(`Generating pairings for ${block} block with ${teams.length} teams`);
          const blockPairings = await generatePairingsWithConfig(teams, {
            avoidRematches: config.avoidRematches,
            haveTeamsPlayedFn: haveTeamsPlayedBefore,
            getCompatibilityScoreFn: (team1, team2) => calculateConfigurableCompatibility(team1, team2, config.weights)
          });
          
          // Store pairings for this block
          pairings[block] = blockPairings;
          
          // Find unmatched teams
          const pairedTeamIds = new Set<string>();
          blockPairings.forEach(pair => {
            pairedTeamIds.add(pair.team1.id);
            pairedTeamIds.add(pair.team2.id);
          });
          
          const blockUnmatchedTeams = teams
            .filter(team => !pairedTeamIds.has(team.id))
            .map(team => team.id);
          
          allUnmatchedTeamIds = [...allUnmatchedTeamIds, ...blockUnmatchedTeams];
        }
      }

      // Store the generated pairings and unmatched teams
      setGeneratedPairings(pairings);
      setUnmatchedTeamIds(allUnmatchedTeamIds);
      
      // Return the generated pairings and unmatched team IDs
      return {
        pairings,
        unmatchedTeamIds: allUnmatchedTeamIds
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
  }, [toast]);

  return {
    isGenerating,
    generatedPairings,
    unmatchedTeamIds,
    generateMatchPairings
  };
};
