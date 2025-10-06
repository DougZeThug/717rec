
import { useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAutoScheduleState } from './useAutoScheduleState';
import { useTeamOperations } from './useTeamOperations';
import { usePairingOperations } from './usePairingOperations';
import { useAutoScheduleSave } from './useAutoScheduleSave';
import { formatDate } from './utils';
import { TimeBlockTeamsMap } from '@/types/autoSchedule';

export function useAutoSchedule() {
  const { toast } = useToast();
  
  // Get state management
  const {
    selectedDate,
    setSelectedDate,
    activeTab,
    setActiveTab,
    avoidRematches,
    setAvoidRematches,
    prioritizeQuality,
    setPrioritizeQuality,
    dualMatchMode,
    setDualMatchMode,
    isProcessing,
    setIsProcessing,
    generatedMatches,
    setGeneratedMatches,
    matchQualityMetrics,
    setMatchQualityMetrics
  } = useAutoScheduleState();

  // Get team operations
  const {
    isLoading,
    timeBlockTeams,
    originalTimeBlockTeams,
    setTimeBlockTeams, // Expose this function for manual team assignment
    handleLoadTeams,
    getTeamCountStatus
  } = useTeamOperations();

  // Get pairing operations
  const {
    isGenerating,
    generatedPairings,
    unmatchedTeamIds,
    handleGenerateClick,
    handleApplySchedule
  } = usePairingOperations(setActiveTab);

  // Get save operations
  const {
    saveMatches,
    isSaving
  } = useAutoScheduleSave();

  // Combined loading state
  const isLoadingState = isLoading || isGenerating || isProcessing || isSaving;

  // Wrapped handlers that use local state
  const loadTeams = async () => {
    setIsProcessing(true);
    try {
      await handleLoadTeams(selectedDate);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateSchedule = async () => {
    // Convert return type to void by not returning the result
    await handleGenerateClick(
      selectedDate,
      timeBlockTeams,
      avoidRematches,
      prioritizeQuality,
      dualMatchMode,
      setIsProcessing
    );
    // Return void explicitly by not having a return statement
  };

  const applySchedule = () => {
    return handleApplySchedule(
      generatedPairings,
      selectedDate,
      dualMatchMode,
      setGeneratedMatches,
      setMatchQualityMetrics
    );
  };

  const saveSchedule = async () => {
    if (!generatedMatches || generatedMatches.length === 0) {
      toast({
        title: "No Matches to Save",
        description: "Please generate and apply a schedule first",
        variant: "destructive"
      });
      return false;
    }
    return await saveMatches(generatedMatches, selectedDate);
  };

  // Team statistics 
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
    dualMatchMode,
    setDualMatchMode,
    generatedMatches,
    matchQualityMetrics,
    
    // Data
    isLoading: isLoadingState,
    isGenerating,
    isSaving,
    timeBlockTeams,
    originalTimeBlockTeams,
    setTimeBlockTeams, // Expose this for manual team assignment
    generatedPairings,
    unmatchedTeamIds,
    totalTeams: total,
    oddBlocks: odd,
    
    // Actions
    handleLoadTeams: loadTeams,
    handleGenerateClick: generateSchedule,
    handleApplySchedule: applySchedule,
    handleSaveSchedule: saveSchedule,
    
    // Formatted utilities
    formattedDate: formatDate(selectedDate)
  };
}
