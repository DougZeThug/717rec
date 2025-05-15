
import { useState } from "react";
import { Team } from "@/types";
import { TimeBlockTeamsMap, TeamPairingMap, PreviewResult, PairingResult, PairedTimeBlockTeamsMap, DualBlockConfig } from "@/types/autoSchedule";
import { useTeamScheduleLoader } from "./useTeamScheduleLoader";
import { usePairingGenerator } from "./usePairingGenerator";
import { useToast } from "@/hooks/use-toast";
import { TIME_BLOCKS } from "@/utils/autoSchedule/constants";
import { validateTeamCounts } from "@/utils/autoSchedule/edgeCaseUtils";
import { normalizeDate } from "@/utils/dateNormalization";
import { createTimeBlockPairs, balanceTeamsBetweenBlocks } from "@/utils/autoSchedule/dualBlockUtils";

export type AutoScheduleStep = 'teams' | 'pairings';

export const useSchedulePreview = () => {
  const [autoScheduleStep, setAutoScheduleStep] = useState<AutoScheduleStep>('teams');
  const { isLoading, timeBlockTeams, loadTeamsForDate, getTeamCountStatus } = useTeamScheduleLoader();
  const { isGenerating, generatedPairings, unmatchedTeamIds, generateMatchPairings } = usePairingGenerator();
  const { toast } = useToast();
  const [pairedBlocks, setPairedBlocks] = useState<PairedTimeBlockTeamsMap>({});

  const previewSchedule = async (date: Date, dualBlockMode = false, blockConfig?: DualBlockConfig): Promise<PreviewResult | null> => {
    try {
      // Log the date being used
      console.log("useSchedulePreview - previewSchedule date:", {
        date,
        dateString: date.toString(),
        dateIso: date.toISOString(),
        simpleDateString: normalizeDate(date, 'useSchedulePreview'),
        dualBlockMode
      });
      
      // Load teams for each time block if not loaded yet
      const teamsData = timeBlockTeams && Object.keys(timeBlockTeams).length > 0 
        ? timeBlockTeams 
        : await loadTeamsForDate(date, dualBlockMode, blockConfig);
        
      if (!teamsData) return null;
      
      // Process for dual block mode if enabled
      if (dualBlockMode && blockConfig) {
        // Create paired blocks structure
        const pairs = createTimeBlockPairs(teamsData, blockConfig);
        setPairedBlocks(pairs);
        
        // Get primary and secondary block names
        const primaryBlock = blockConfig.primaryBlock || 'Early';
        const secondaryBlock = blockConfig.secondaryBlock || 'Late';
        
        // Check if both blocks have teams
        if (!teamsData[primaryBlock] || !teamsData[secondaryBlock]) {
          toast({
            title: "Warning",
            description: `Dual match mode requires teams in both ${primaryBlock} and ${secondaryBlock} blocks.`,
            variant: "default"
          });
        }
        
        // Balance team counts if needed
        const { balancedTeams, unmatchedTeamIds } = performTeamBalancing(teamsData, blockConfig);
        if (unmatchedTeamIds.length > 0) {
          toast({
            title: "Notice",
            description: `${unmatchedTeamIds.length} team(s) are unmatched due to odd number of teams.`,
            variant: "default"
          });
        }
      }
      
      // Validate team counts to identify insufficient and odd blocks
      const { isValid, insufficientBlocks } = validateTeamCounts(teamsData);
      
      // Check if we have even number of teams in each block
      const unmatchableBlocks: string[] = [];
      Object.entries(teamsData).forEach(([block, teams]) => {
        if (teams.length % 2 !== 0) {
          unmatchableBlocks.push(block);
        }
      });
      
      if (unmatchableBlocks.length > 0) {
        toast({
          title: "Warning",
          description: `Blocks with odd number of teams: ${unmatchableBlocks.join(', ')}. Some teams may not get matched.`,
          variant: "default"
        });
      }
      
      if (insufficientBlocks.length > 0) {
        toast({
          title: "Warning",
          description: `Blocks with insufficient teams: ${insufficientBlocks.join(', ')}. These blocks cannot create matches.`,
          variant: "default"
        });
      }
      
      return {
        date,
        timeBlocks: teamsData,
        unmatchableBlocks
      };
      
    } catch (error) {
      console.error('Error previewing schedule:', error);
      toast({
        title: "Error",
        description: "Failed to preview schedule. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };
  
  /**
   * Helper function to balance teams between blocks
   */
  const performTeamBalancing = (
    teamBlocks: TimeBlockTeamsMap,
    blockConfig: DualBlockConfig
  ): { balancedTeams: TimeBlockTeamsMap, unmatchedTeamIds: string[] } => {
    // Get primary and secondary block names from config or use defaults
    const primaryBlock = blockConfig.primaryBlock || 'Early';
    const secondaryBlock = blockConfig.secondaryBlock || 'Late';
    
    // Get teams from each block
    const primaryTeams = teamBlocks[primaryBlock] || [];
    const secondaryTeams = teamBlocks[secondaryBlock] || [];
    
    // Balance teams between blocks
    const { primaryAdjusted, secondaryAdjusted, unmatchedTeamIds } = 
      balanceTeamsBetweenBlocks(primaryTeams, secondaryTeams, blockConfig);
    
    // Create updated team blocks map
    const balancedTeams = { ...teamBlocks };
    balancedTeams[primaryBlock] = primaryAdjusted;
    balancedTeams[secondaryBlock] = secondaryAdjusted;
    
    return { balancedTeams, unmatchedTeamIds };
  };

  const handleGenerateSchedule = async (
    date: Date,
    options: {
      avoidRematches?: boolean;
      prioritizeQuality?: boolean;
      dualMatchMode?: boolean;
      weights?: {
        powerScoreWeight?: number;
        sosWeight?: number;
        recordWeight?: number;
        gameRecordWeight?: number;
      }
    } = {}
  ) => {
    if (!date) {
      toast({
        title: "Select Date",
        description: "Please select a date first.",
        variant: "destructive"
      });
      return null;
    }
    
    // Add performance tracking
    const startTime = performance.now();
    
    // Log the date being used
    console.log("useSchedulePreview - handleGenerateSchedule date:", {
      date,
      dateString: date.toString(),
      dateIso: date.toISOString(),
      simpleDateString: normalizeDate(date, 'handleGenerateSchedule'),
      dualMatchMode: options.dualMatchMode
    });
    
    // If in dual match mode, use the balanced teams
    let teamsToUse = timeBlockTeams;
    
    if (options.dualMatchMode) {
      // Create a dual block config from options
      const dualConfig: DualBlockConfig = {
        dualMatchMode: true,
        primaryBlock: 'Early',
        secondaryBlock: 'Late',
        unmatchedTeamStrategy: 'lowest-rank'
      };
      
      // Balance teams to ensure even counts
      const { balancedTeams } = performTeamBalancing(timeBlockTeams, dualConfig);
      teamsToUse = balancedTeams;
      
      console.log("Using balanced teams for dual match mode:", teamsToUse);
    }
    
    const result = await generateMatchPairings(date, teamsToUse, {
      avoidRematches: options.avoidRematches,
      dualMatchMode: options.dualMatchMode,
      weights: options.weights
    });
    
    // Log performance metrics
    const endTime = performance.now();
    console.log(`Schedule generation took ${(endTime - startTime).toFixed(2)}ms`);
    
    if (result) {
      const { pairings, unmatchedTeamIds } = result;
      
      // Count total matches generated
      const totalMatches = Object.values(pairings).reduce((sum, blockPairings) => 
        sum + blockPairings.length, 0);
        
      // Count any pairings that have played before
      const rematchCount = Object.values(pairings).reduce((sum, blockPairings) => 
        sum + blockPairings.filter(p => p.hasPlayedBefore).length, 0);
        
      let toastMessage = `${totalMatches} match pairings generated based on team compatibility.`;
      
      if (unmatchedTeamIds.length > 0) {
        toastMessage += ` ${unmatchedTeamIds.length} teams were left unmatched due to odd numbers.`;
      }
      
      if (rematchCount > 0) {
        toastMessage += ` ${rematchCount} pairings are rematches.`;
      }
      
      toast({
        title: "Schedule Generated",
        description: toastMessage,
      });
      
      setAutoScheduleStep('pairings');
      return pairings;
    }
    
    return null;
  };

  const convertPairingsToMatches = (
    pairings: TeamPairingMap,
    date: Date,
    options: { dualMatchMode?: boolean } = {}
  ): {
    id: string;
    team1Id: string;
    team2Id: string;
    timeslot: string;
    blockType?: 'primary' | 'secondary';
  }[] => {
    if (!pairings || !date) {
      console.warn("Missing pairings or date in convertPairingsToMatches");
      return [];
    }
    
    const matches = [];
    const blocks = Object.keys(pairings);
    
    // Special handling for dual match mode
    if (options.dualMatchMode && blocks.length >= 2) {
      const primaryBlock = blocks[0]; // Usually 'Early'
      const secondaryBlock = blocks[1]; // Usually 'Late'
      
      console.log(`Processing dual match mode with blocks: ${primaryBlock} and ${secondaryBlock}`);
      
      // Track teams and their opponents to ensure no duplicates
      const teamOpponents: Record<string, string[]> = {};
      
      // First handle primary block
      if (pairings[primaryBlock]?.length > 0) {
        pairings[primaryBlock].forEach((pairing, index) => {
          // Use primary block's main timeslot (typically 6:30 PM)
          const timeslot = TIME_BLOCKS[primaryBlock].main;
          
          // Initialize opponent tracking for both teams
          if (!teamOpponents[pairing.team1.id]) teamOpponents[pairing.team1.id] = [];
          if (!teamOpponents[pairing.team2.id]) teamOpponents[pairing.team2.id] = [];
          
          // Record opponents
          teamOpponents[pairing.team1.id].push(pairing.team2.id);
          teamOpponents[pairing.team2.id].push(pairing.team1.id);
          
          // Create match
          matches.push({
            id: Date.now().toString() + '-' + primaryBlock + '-' + index,
            team1Id: pairing.team1.id,
            team2Id: pairing.team2.id,
            timeslot,
            blockType: 'primary'
          });
        });
      }
      
      // Then handle secondary block
      if (pairings[secondaryBlock]?.length > 0) {
        pairings[secondaryBlock].forEach((pairing, index) => {
          // Use secondary block's secondary timeslot (typically 7:00 PM)
          const timeslot = TIME_BLOCKS[secondaryBlock].secondary;
          
          // Initialize opponent tracking for any new teams
          if (!teamOpponents[pairing.team1.id]) teamOpponents[pairing.team1.id] = [];
          if (!teamOpponents[pairing.team2.id]) teamOpponents[pairing.team2.id] = [];
          
          // Record opponents
          teamOpponents[pairing.team1.id].push(pairing.team2.id);
          teamOpponents[pairing.team2.id].push(pairing.team1.id);
          
          // Create match
          matches.push({
            id: Date.now().toString() + '-' + secondaryBlock + '-' + index,
            team1Id: pairing.team1.id,
            team2Id: pairing.team2.id,
            timeslot,
            blockType: 'secondary'
          });
        });
      }
      
      // Log any teams with duplicate opponents (playing the same team in both blocks)
      const teamsWithDuplicates = Object.entries(teamOpponents)
        .filter(([_, opponents]) => {
          const uniqueOpponents = new Set(opponents);
          return uniqueOpponents.size < opponents.length;
        })
        .map(([teamId]) => teamId);
        
      if (teamsWithDuplicates.length > 0) {
        console.warn(`Warning: ${teamsWithDuplicates.length} teams have duplicate opponents in dual blocks`);
      }
    } else {
      // Standard single-block processing
      Object.entries(pairings).forEach(([block, blockPairings]) => {
        // Ensure we can access the TIME_BLOCKS for this block
        if (!TIME_BLOCKS[block]) {
          console.error(`Missing time block data for ${block}`);
          return;
        }
        
        blockPairings.forEach((pairing, index) => {
          // In standard mode, alternate between main and secondary timeslots
          const timeslot = index % 2 === 0 
            ? TIME_BLOCKS[block].main 
            : TIME_BLOCKS[block].secondary;
          
          matches.push({
            id: Date.now().toString() + '-' + block + '-' + index,
            team1Id: pairing.team1.id,
            team2Id: pairing.team2.id,
            timeslot,
          });
        });
      });
    }
    
    return matches;
  };

  return {
    autoScheduleStep,
    setAutoScheduleStep,
    isLoading,
    isGenerating,
    timeBlockTeams,
    pairedBlocks,
    generatedPairings,
    unmatchedTeamIds,
    previewSchedule,
    handleGenerateSchedule,
    convertPairingsToMatches,
    getTeamCountStatus,
    performTeamBalancing
  };
};
