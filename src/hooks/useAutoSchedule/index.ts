
import { useMemo } from 'react';
import { useAutoScheduleState } from './useAutoScheduleState';
import { useTeamOperations } from './useTeamOperations';
import { usePairingOperations } from './usePairingOperations';
import { formatDate } from './utils';

export function useAutoSchedule() {
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

  // Combined loading state
  const isLoadingState = isLoading || isGenerating || isProcessing;

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
      setIsProcessing
    );
    // Return void explicitly by not having a return statement
  };

  const applySchedule = () => {
    return handleApplySchedule(
      generatedPairings,
      selectedDate,
      setGeneratedMatches,
      setMatchQualityMetrics
    );
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
    handleLoadTeams: loadTeams,
    handleGenerateClick: generateSchedule,
    handleApplySchedule: applySchedule,
    
    // Formatted utilities
    formattedDate: formatDate(selectedDate)
  };
}
