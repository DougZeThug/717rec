import { useState, useCallback } from 'react';
import { TeamPairingMap, TimeBlockTeamsMap, AlgorithmConfig, PairingResult } from '@/types/autoSchedule';
import { generatePairingsWithConfig } from '@/utils/autoSchedule/pairingAlgorithm';
import { getCompatibilityScore } from '@/utils/autoSchedule/compatibilityUtils';
import { useTeamFetching } from './useTeamFetching';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { normalizeDate } from '@/utils/dateNormalization';

export const usePairingGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPairings, setGeneratedPairings] = useState<TeamPairingMap>({});
  const [unmatchedTeamIds, setUnmatchedTeamIds] = useState<string[]>([]);
  const { teams } = useTeamFetching();
  const { toast } = useToast();

  /**
   * Check whether two teams have played each other before
   */
  const haveTeamsPlayedBefore = useCallback(async (team1Id: string, team2Id: string): Promise<boolean> => {
    try {
      // Query the matches table to find if these teams have played against each other
      const { count, error } = await supabase
        .from('matches')
        .select('id', { count: 'exact', head: true })
        .or(`team1_id.eq.${team1Id},team2_id.eq.${team1Id}`)
        .or(`team1_id.eq.${team2Id},team2_id.eq.${team2Id}`)
        .eq('iscompleted', true);
      
      if (error) {
        console.error('Error checking match history:', error);
        return false;
      }
      
      return count !== null && count > 0;
    } catch (error) {
      console.error('Error checking if teams played before:', error);
      return false;
    }
  }, []);

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
        
        // Implement dual match pairing logic for Early/Late blocks
        // This would generate pairings that ensure teams play in both time blocks
        const dualBlockPairingResult = await generateDualBlockPairings(
          timeBlockTeams,
          config,
          haveTeamsPlayedBefore
        );
        
        if (dualBlockPairingResult) {
          Object.assign(pairings, dualBlockPairingResult.pairings);
          allUnmatchedTeamIds = dualBlockPairingResult.unmatchedTeamIds;
        }
      } else {
        // Standard single-block pairing algorithm (original logic)
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
            getCompatibilityScoreFn: (team1, team2) => getCompatibilityScore(team1, team2, config.weights),
            weights: config.weights
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
  }, [haveTeamsPlayedBefore, toast]);

  /**
   * Generate pairings that ensure each team plays in both Early and Late blocks
   * with different opponents in each block
   */
  const generateDualBlockPairings = async (
    timeBlockTeams: TimeBlockTeamsMap,
    config: AlgorithmConfig,
    haveTeamsPlayedFn: (team1Id: string, team2Id: string) => Promise<boolean>
  ): Promise<PairingResult | null> => {
    try {
      // For dual match mode, we focus on the Early and Late blocks
      const earlyTeams = timeBlockTeams['Early'] || [];
      const lateTeams = timeBlockTeams['Late'] || [];
      
      // Ensure we have the same teams in both blocks
      if (earlyTeams.length === 0 || lateTeams.length === 0) {
        toast({
          title: "Error",
          description: "Dual match mode requires teams in both Early and Late blocks",
          variant: "destructive"
        });
        return null;
      }
      
      // Check if we have an equal number of teams in both blocks
      const combinedTeams = [...earlyTeams];
      
      // Check if we have an odd number of teams
      const hasOddTeams = combinedTeams.length % 2 !== 0;
      let unmatchedTeamId = '';
      
      if (hasOddTeams) {
        // Remove one team randomly to make it even
        const randomIndex = Math.floor(Math.random() * combinedTeams.length);
        const removedTeam = combinedTeams.splice(randomIndex, 1)[0];
        unmatchedTeamId = removedTeam.id;
        
        toast({
          title: "Warning",
          description: `Odd number of teams. Team "${removedTeam.name}" will not be scheduled.`,
          variant: "default"
        });
      }
      
      // First generate pairings for the early block
      const earlyPairings = await generatePairingsWithConfig(combinedTeams, {
        avoidRematches: config.avoidRematches,
        haveTeamsPlayedFn,
        getCompatibilityScoreFn: (team1, team2) => getCompatibilityScore(team1, team2, config.weights),
        weights: config.weights
      });
      
      // Create a map of team ID to opponent team ID in the early block
      const earlyOpponents = new Map<string, string>();
      earlyPairings.forEach(pair => {
        earlyOpponents.set(pair.team1.id, pair.team2.id);
        earlyOpponents.set(pair.team2.id, pair.team1.id);
      });
      
      // Now generate pairings for the late block, ensuring different opponents
      // To do this, we need to create a new custom compatibility function that 
      // heavily penalizes matching teams that played each other in the early block
      const latePairings = await generatePairingsWithConfig(combinedTeams, {
        avoidRematches: config.avoidRematches,
        haveTeamsPlayedFn,
        getCompatibilityScoreFn: (team1, team2) => {
          // Heavily penalize matching teams that played each other in the early block
          if (earlyOpponents.get(team1.id) === team2.id) {
            return -100; // Strong negative score to avoid matching
          }
          
          // Otherwise, use normal compatibility scoring
          return getCompatibilityScore(team1, team2, config.weights);
        },
        weights: config.weights
      });
      
      // Return the pairings for both blocks
      return {
        pairings: {
          'Early': earlyPairings,
          'Late': latePairings
        },
        unmatchedTeamIds: hasOddTeams ? [unmatchedTeamId] : []
      };
      
    } catch (error) {
      console.error('Error generating dual block pairings:', error);
      return null;
    }
  };

  return {
    isGenerating,
    generatedPairings,
    unmatchedTeamIds,
    generateMatchPairings
  };
};
