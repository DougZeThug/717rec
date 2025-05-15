
import { useState, useCallback, useMemo } from 'react';
import { useTeamScheduleLoader } from '../useTeamScheduleLoader';
import { usePairingGenerator } from '../usePairingGenerator';
import { useSchedulePreview } from '../useSchedulePreview';
import { useToast } from '@/hooks/use-toast';
import { 
  AlgorithmConfig, 
  TimeBlockTeamsMap, 
  TeamPairingMap,
  AutoScheduleMatch
} from '@/types/autoSchedule';
import { 
  getTimeBlocksStatistics,
  formatScheduleDate,
  analyzeMatchQuality
} from '@/utils/autoSchedule/scheduleUtils';
import { normalizeDate } from '@/utils/dateNormalization';

export function useAutoSchedule() {
  // Tab state
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [activeTab, setActiveTab] = useState<string>("teams");
  
  // Algorithm settings
  const [avoidRematches, setAvoidRematches] = useState(true);
  const [prioritizeQuality, setPrioritizeQuality] = useState(false);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Generated data
  const [generatedMatches, setGeneratedMatches] = useState<AutoScheduleMatch[]>([]);
  const [matchQualityMetrics, setMatchQualityMetrics] = useState<{
    totalMatches: number;
    rematchCount: number;
    averageCompatibilityScore: number;
    qualityRating: string;
  } | null>(null);
  
  // Use existing hooks
  const {
    isLoading,
    timeBlockTeams,
    loadTeamsForDate,
    getTeamCountStatus
  } = useTeamScheduleLoader();

  const {
    isGenerating,
    generatedPairings,
    unmatchedTeamIds,
    generateMatchPairings,
  } = usePairingGenerator();

  const {
    convertPairingsToMatches
  } = useSchedulePreview();

  const { toast } = useToast();

  // Combined loading state
  const isLoadingState = isLoading || isGenerating || isProcessing;

  // Handle loading teams for a date with additional logging
  const handleLoadTeams = useCallback(async () => {
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date first",
        variant: "destructive"
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      console.log('useAutoSchedule - handleLoadTeams - Before loadTeamsForDate', {
        selectedDate,
        selectedDateString: selectedDate.toString(),
        selectedDateIso: selectedDate.toISOString(),
        simpleDateString: normalizeDate(selectedDate, 'handleLoadTeams-before')
      });
      
      await loadTeamsForDate(selectedDate);
      
      const { total, odd } = getTeamCountStatus();
      
      console.log('useAutoSchedule - handleLoadTeams - After loadTeamsForDate', {
        teamsFound: total,
        oddBlocks: odd,
        simpleDateString: normalizeDate(selectedDate, 'handleLoadTeams-after')
      });
      
      if (total === 0) {
        toast({
          title: "No teams found",
          description: `No teams are scheduled for ${normalizeDate(selectedDate, 'toast')}`,
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Teams loaded",
        description: `Loaded ${total} teams${odd > 0 ? ` (${odd} blocks have odd team counts)` : ''}`,
      });
      
    } catch (error) {
      console.error("Error loading teams:", error);
      toast({
        title: "Error",
        description: "Failed to load teams. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedDate, loadTeamsForDate, toast, getTeamCountStatus]);

  // Handle generating schedule - Fixed to use the correct function
  const handleGenerateClick = useCallback(async () => {
    if (!selectedDate) {
      toast({
        title: "Error",
        description: "Please select a date first",
        variant: "destructive"
      });
      return;
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
      await generateMatchPairings(selectedDate, timeBlockTeams, algorithmConfig);
      
      // Performance metrics
      const endTime = performance.now();
      console.log(`Schedule generation took ${(endTime - startTime).toFixed(2)}ms`);
      
      // Switch to matches tab to show results
      setActiveTab("matches");
      
    } catch (error) {
      console.error("Error generating schedule:", error);
      toast({
        title: "Error",
        description: "Failed to generate schedule. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    selectedDate, 
    avoidRematches, 
    prioritizeQuality, 
    generateMatchPairings, 
    timeBlockTeams, 
    toast
  ]);

  // Handle applying schedule
  const handleApplySchedule = useCallback(() => {
    if (!generatedPairings || !selectedDate) {
      toast({
        title: "Error",
        description: "No schedule generated",
        variant: "destructive"
      });
      return;
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
        description: `${matches.length} matches ready for export`,
      });
    } catch (error) {
      console.error("Error applying schedule:", error);
      toast({
        title: "Error",
        description: "Failed to create match schedule. Please try again.",
        variant: "destructive"
      });
    }
  }, [generatedPairings, selectedDate, convertPairingsToMatches, toast]);

  // Get team statistics
  const { total, odd } = useMemo(() => {
    return getTeamCountStatus();
  }, [timeBlockTeams, getTeamCountStatus]);

  return {
    // State
    selectedDate,
    setSelectedDate,
    activeTab,
    setActiveTab,
    avoidRematches,
    setAvoidRematches,
    prioritizeQuality,
    setPrioritizeQuality,
    generatedMatches,
    matchQualityMetrics,
    
    // Data
    isLoading: isLoadingState,
    isGenerating,
    timeBlockTeams,
    generatedPairings,
    unmatchedTeamIds,
    totalTeams: total,
    oddBlocks: odd,
    
    // Actions
    handleLoadTeams,
    handleGenerateClick, // Fixed: Now correctly points to handleGenerateClick function
    handleApplySchedule, // Fixed: Now correctly implemented
    
    // Formatted utilities
    formattedDate: formatScheduleDate(selectedDate)
  };
}
