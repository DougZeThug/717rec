
import { useCallback } from 'react';
import { usePairingGenerator } from '../usePairingGenerator';
import { useSchedulePreview } from '../useSchedulePreview';
import { useToast } from '@/hooks/use-toast';
import { AlgorithmConfig, TimeBlockTeamsMap, TeamPairingMap } from '@/types/autoSchedule';
import { analyzeMatchQuality } from '@/utils/autoSchedule/scheduleUtils';
import { validateDualBlockSchedule } from '@/utils/autoSchedule/dualBlock';

export const usePairingOperations = (setActiveTab: (tab: string) => void) => {
  const { 
    isGenerating, 
    generatedPairings, 
    unmatchedTeamIds, 
    generateMatchPairings 
  } = usePairingGenerator();
  
  const { convertPairingsToMatches } = useSchedulePreview();
  const { toast } = useToast();

  // Handle generating schedule
  const handleGenerateClick = useCallback(async (
    selectedDate: Date | null, 
    timeBlockTeams: TimeBlockTeamsMap, 
    avoidRematches: boolean,
    prioritizeQuality: boolean,
    dualMatchMode: boolean,
    setIsProcessing: (isProcessing: boolean) => void
  ) => {
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date first",
        variant: "destructive"
      });
      return null;
    }
    
    setIsProcessing(true);
    try {
      // Performance tracking
      const startTime = performance.now();
      
      // Configure algorithm based on settings
      const algorithmConfig: AlgorithmConfig = {
        avoidRematches,
        prioritizeQuality,
        dualMatchMode,
        weights: prioritizeQuality ? {
          powerScoreWeight: 5,
          recordWeight: 3.5
        } : undefined
      };
      
      // Generate pairings
      const result = await generateMatchPairings(selectedDate, timeBlockTeams, algorithmConfig);
      
      // Performance metrics
      const endTime = performance.now();
      console.log(`Schedule generation took ${(endTime - startTime).toFixed(2)}ms`);
      
      // Switch to matches tab to show results
      setActiveTab("matches");
      
      return result ? result.pairings : null;
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast({
        title: "Error",
        description: "Failed to generate schedule. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [generateMatchPairings, toast, setActiveTab]);

  // Handle applying schedule - Enhanced for dual match mode and validation
  const handleApplySchedule = useCallback((
    generatedPairings: TeamPairingMap | null,
    selectedDate: Date | null,
    dualMatchMode: boolean,
    setGeneratedMatches: (matches: any[]) => void,
    setMatchQualityMetrics: (metrics: any) => void
  ) => {
    if (!generatedPairings || !selectedDate) {
      toast({
        title: "Error",
        description: "No schedule generated",
        variant: "destructive"
      });
      return null;
    }
    
    try {
      // For dual match mode, run validation first
      if (dualMatchMode) {
        const blocks = Object.keys(generatedPairings);
        if (blocks.length >= 2) {
          const primaryBlockPairings = generatedPairings[blocks[0]] || [];
          const secondaryBlockPairings = generatedPairings[blocks[1]] || [];
          
          const validation = validateDualBlockSchedule(primaryBlockPairings, secondaryBlockPairings);
          
          // If validation has errors and overbookedTeams, show warning but still allow export
          if (validation.overbookedTeams.length > 0) {
            toast({
              title: "Warning",
              description: `${validation.overbookedTeams.length} team(s) are scheduled for overlapping time slots.`,
              variant: "destructive"
            });
          }
          
          // If validation found teams with duplicate opponents, show warning but still allow export
          if (validation.teamsWithDuplicateOpponents.length > 0) {
            toast({
              title: "Warning",
              description: `${validation.teamsWithDuplicateOpponents.length} team(s) will face the same opponent in both blocks.`,
              variant: "default"
            });
          }
        }
      }
      
      // Convert pairings to matches with dual match mode awareness
      const matches = convertPairingsToMatches(generatedPairings, selectedDate, { 
        dualMatchMode 
      });
      
      // Log match conversion results
      console.log(`Converted ${matches.length} matches ${dualMatchMode ? 'with dual match mode' : ''}`);
      
      // If in dual match mode, validate that teams have different opponents
      if (dualMatchMode) {
        // Check for teams with same opponent in both blocks
        const teamOpponents: Record<string, Set<string>> = {};
        
        matches.forEach(match => {
          // Track team1's opponents
          if (!teamOpponents[match.team1Id]) {
            teamOpponents[match.team1Id] = new Set();
          }
          teamOpponents[match.team1Id].add(match.team2Id);
          
          // Track team2's opponents
          if (!teamOpponents[match.team2Id]) {
            teamOpponents[match.team2Id] = new Set();
          }
          teamOpponents[match.team2Id].add(match.team1Id);
        });
        
        // Count teams with duplicate opponents and teams with matches in both blocks
        const teamsWithDuplicateOpponents = Object.entries(teamOpponents)
          .filter(([_, opponents]) => opponents.size < 2 && opponents.size > 0)
          .map(([teamId]) => teamId);
          
        const teamsWithBothMatches = Object.entries(teamOpponents)
          .filter(([_, opponents]) => opponents.size === 2)
          .length;
          
        if (teamsWithDuplicateOpponents.length > 0) {
          console.warn(`${teamsWithDuplicateOpponents.length} teams have the same opponent in both blocks`);
        }
        
        console.log(`${teamsWithBothMatches} teams have matches in both blocks`);
      }
      
      setGeneratedMatches(matches);
      
      // Analyze match quality
      const qualityMetrics = analyzeMatchQuality(generatedPairings);
      setMatchQualityMetrics(qualityMetrics);
      
      // Show the export tab with the created matches
      setActiveTab("export");
      
      toast({
        title: "Schedule created",
        description: `${matches.length} matches ready for export${dualMatchMode ? ' in dual match mode' : ''}`
      });
      
      return matches;
    } catch (error) {
      console.error("Error applying schedule:", error);
      toast({
        title: "Error",
        description: "Failed to create match schedule. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  }, [convertPairingsToMatches, toast, setActiveTab]);

  return {
    isGenerating,
    generatedPairings,
    unmatchedTeamIds,
    handleGenerateClick,
    handleApplySchedule
  };
};
