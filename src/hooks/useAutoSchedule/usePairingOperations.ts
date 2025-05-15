
import { useCallback } from 'react';
import { usePairingGenerator } from '../usePairingGenerator';
import { useSchedulePreview } from '../useSchedulePreview';
import { useToast } from '@/hooks/use-toast';
import { AlgorithmConfig, TimeBlockTeamsMap, TeamPairingMap } from '@/types/autoSchedule';
import { analyzeMatchQuality } from '@/utils/autoSchedule/scheduleUtils';

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

  // Handle applying schedule
  const handleApplySchedule = useCallback((
    generatedPairings: TeamPairingMap | null,
    selectedDate: Date | null,
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
      // Convert pairings to matches
      const matches = convertPairingsToMatches(generatedPairings, selectedDate);
      setGeneratedMatches(matches);
      
      // Analyze match quality
      const qualityMetrics = analyzeMatchQuality(generatedPairings);
      setMatchQualityMetrics(qualityMetrics);
      
      // Show the export tab with the created matches
      setActiveTab("export");
      
      toast({
        title: "Schedule created",
        description: `${matches.length} matches ready for export`
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
