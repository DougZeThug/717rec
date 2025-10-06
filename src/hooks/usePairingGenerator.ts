import { useState, useCallback } from 'react';
import { TeamPairingMap, TimeBlockTeamsMap, AlgorithmConfig, PairingResult, DualBlockConfig, TeamPairing, Team } from '@/types/autoSchedule';
import { generatePairingsWithBlossom } from '@/utils/autoSchedule/blossomPairingAlgorithm';
import { calculateDivisionOnlyCompatibility } from '@/utils/autoSchedule/compatibilityUtils';
import { useTeamFetching } from './useTeamFetching';
import { useToast } from '@/hooks/use-toast';
import { normalizeDate } from '@/utils/dateNormalization';
import { haveTeamsPlayedBefore, fetchSeasonHistoryForTeams } from '@/utils/autoSchedule/matchHistoryService';
import { generateDualBlockPairings } from '@/utils/autoSchedule/dualBlock';
import { generateScheduleGreedy } from '@/utils/scheduling/greedyBackToBackScheduler';
import { getPairConfig } from '@/utils/autoSchedule/constants';

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
   * Generate match pairings for teams
   * 
   * Two modes:
   * 1. Dual Match Mode (config.dualMatchMode = true):
   *    Uses greedy back-to-back scheduler for consecutive timeslots (S1, S2, optional S3)
   *    - Faster and deterministic
   *    - Prioritizes same-division, no rematches
   *    - Handles odd teams by creating a third slot
   *    - Quality optimization not applicable
   * 
   * 2. Standard Mode (config.dualMatchMode = false):
   *    Uses Edmonds' Blossom algorithm for optimal quality matching
   *    - Maximizes compatibility scores
   *    - Supports quality optimization weights
   *    - Each time block scheduled independently
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
      
      // Handle dual match mode with greedy back-to-back scheduler
      if (config.dualMatchMode) {
        console.log("Using greedy back-to-back scheduler for dual match mode");
        
        // Find the first pair with teams
        const pairsWithTeams = Object.keys(timeBlockTeams).filter(
          pairName => timeBlockTeams[pairName]?.length > 0
        );
        
        if (pairsWithTeams.length === 0) {
          toast({
            title: "No Teams Found",
            description: "Please load teams for a specific date first.",
            variant: "destructive"
          });
          return null;
        }
        
        if (pairsWithTeams.length > 1) {
          console.warn(`Multiple pairs have teams: ${pairsWithTeams.join(', ')}. Using first pair: ${pairsWithTeams[0]}`);
          toast({
            title: "Multiple Time Blocks Detected",
            description: `Using ${pairsWithTeams[0]} pair for scheduling. Other pairs will be ignored.`,
            variant: "default"
          });
        }
        
        const firstPairName = pairsWithTeams[0];
        const pairConfig = getPairConfig(firstPairName);
        
        if (!pairConfig) {
          toast({
            title: "Invalid Configuration",
            description: `Could not find configuration for pair: ${firstPairName}`,
            variant: "destructive"
          });
          return null;
        }
        
        // Get actual timeslot times from the pair configuration
        const slots: [string, string] = [pairConfig.primary, pairConfig.secondary];
        const thirdSlot = pairConfig.secondary; // No third slot in back-to-back pairs
        
        console.log(`Using actual timeslots for greedy scheduler: ${slots[0]} and ${slots[1]}`);
        
        // Flatten all teams from time blocks
        const allTeams: Team[] = [];
        const timeBlocks = Object.keys(timeBlockTeams).sort();
        
        for (const block of timeBlocks) {
          const blockTeams = timeBlockTeams[block];
          if (blockTeams && blockTeams.length > 0) {
            allTeams.push(...blockTeams);
          }
        }
        
        // Remove duplicates (a team might be in multiple blocks)
        const uniqueTeams = Array.from(
          new Map(allTeams.map(t => [t.id, t])).values()
        );
        
        console.log(`Flattened ${uniqueTeams.length} unique teams from time blocks`);
        
        // Fetch season history for all teams
        const teamIds = uniqueTeams.map(t => t.id);
        const historyPairs = await fetchSeasonHistoryForTeams(teamIds);
        
        console.log(`📊 Season History Loaded: ${historyPairs.length} pairs`);
        if (historyPairs.length > 0) {
          console.log(`Sample history pairs:`, historyPairs.slice(0, 5));
        }
        
        // Log team tier assignments
        console.log(`📊 Team Tier Assignments:`);
        uniqueTeams.forEach(team => {
          const divisionName = (team.divisionName || '').toLowerCase();
          let tier = 2; // default
          if (divisionName.includes('competitive')) tier = 1;
          if (divisionName.includes('intermediate')) tier = 2;
          if (divisionName.includes('recreational')) tier = 3;
          console.log(`  - ${team.name}: "${team.divisionName}" → Tier ${tier}`);
        });
        
        // Generate schedule with greedy algorithm
        const scheduledMatches = generateScheduleGreedy({
          teams: uniqueTeams,
          historyPairs,
          slots,
          thirdSlot,
          config: {
            maxTierGap: 1,
            byeStrategy: 'last'
          }
        });
        
        console.log(`Greedy scheduler generated ${scheduledMatches.length} matches`);
        
        // Convert scheduled matches back to TeamPairingMap format
        const slotMap = new Map<string, TeamPairing[]>();
        
        for (const match of scheduledMatches) {
          const team1 = uniqueTeams.find(t => t.id === match.teamAId);
          const team2 = uniqueTeams.find(t => t.id === match.teamBId);
          
          if (!team1 || !team2) {
            console.warn(`Could not find teams for match: ${match.teamAId} vs ${match.teamBId}`);
            continue;
          }
          
          const pairing: TeamPairing = {
            team1,
            team2,
            compatibilityScore: match.tierA === match.tierB ? 1.0 : 0.5,
            hasPlayedBefore: false
          };
          
          if (!slotMap.has(match.slot)) {
            slotMap.set(match.slot, []);
          }
          slotMap.get(match.slot)!.push(pairing);
        }
        
        // Convert map to pairings object
        for (const [slot, pairs] of slotMap.entries()) {
          pairings[slot] = pairs;
        }
        
        // Find unmatched teams (should be none with greedy algorithm)
        const pairedTeamIds = new Set<string>();
        scheduledMatches.forEach(match => {
          pairedTeamIds.add(match.teamAId);
          pairedTeamIds.add(match.teamBId);
        });
        
        allUnmatchedTeamIds = uniqueTeams
          .filter(team => !pairedTeamIds.has(team.id))
          .map(team => team.id);
        
        if (allUnmatchedTeamIds.length > 0) {
          console.warn(`Warning: ${allUnmatchedTeamIds.length} teams were not matched`);
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
          const blockPairings = await generatePairingsWithBlossom(teams, {
            avoidRematches: config.avoidRematches,
            haveTeamsPlayedFn: haveTeamsPlayedBefore,
            getCompatibilityScoreFn: calculateDivisionOnlyCompatibility,
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
  }, [toast]);

  return {
    isGenerating,
    generatedPairings,
    unmatchedTeamIds,
    generateMatchPairings
  };
};
