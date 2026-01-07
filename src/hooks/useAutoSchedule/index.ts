import { useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAutoScheduleState } from './useAutoScheduleState';
import { useTeamOperations } from './useTeamOperations';
import { usePairingOperations } from './usePairingOperations';
import { useAutoScheduleSave } from './useAutoScheduleSave';
import { useEditableMatches } from './useEditableMatches';
import { formatDate } from './utils';
import { useTeamsMap } from '@/hooks/teams';

export function useAutoSchedule() {
  const { toast } = useToast();
  const { teams } = useTeamsMap();
  
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
    setMatchQualityMetrics,
    editableMatches,
    setEditableMatches,
    isEditMode,
    setIsEditMode,
    teamBlockMap,
    setTeamBlockMap
  } = useAutoScheduleState();

  // Get editable matches operations
  const {
    validation,
    updateMatchTeam: updateMatchTeamBase,
    updateMatchTimeslot: updateMatchTimeslotBase,
    swapTeams: swapTeamsBase,
    removeMatch: removeMatchBase,
    resetToGenerated: resetToGeneratedBase,
    validateMatches,
    hasUnsavedEdits: checkHasUnsavedEdits
  } = useEditableMatches(editableMatches, isEditMode);

  // Wrap editing functions to pass setEditableMatches
  const updateMatchTeam = (matchId: string, teamPosition: 'team1' | 'team2', newTeamId: string) => {
    updateMatchTeamBase(matchId, teamPosition, newTeamId, setEditableMatches);
  };

  const updateMatchTimeslot = (matchId: string, newTimeslot: string) => {
    updateMatchTimeslotBase(matchId, newTimeslot, setEditableMatches);
  };

  const swapTeams = (matchId: string) => {
    swapTeamsBase(matchId, setEditableMatches);
  };

  const removeMatch = (matchId: string) => {
    removeMatchBase(matchId, setEditableMatches);
  };

  const resetToGenerated = () => {
    if (generatedMatches) {
      resetToGeneratedBase(generatedMatches, setEditableMatches);
    }
  };

  // Get team operations
  const {
    isLoading,
    timeBlockTeams,
    originalTimeBlockTeams,
    teamBlockMap: loadedTeamBlockMap,
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
  } = usePairingOperations(setActiveTab, loadedTeamBlockMap, Object.values(teams));

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
      const result = await handleLoadTeams(selectedDate);
      // The team block map is now set by useTeamOperations
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
    const result = handleApplySchedule(
      generatedPairings,
      selectedDate,
      dualMatchMode,
      setGeneratedMatches,
      setMatchQualityMetrics,
      setEditableMatches
    );
    
    // Reset edit mode when applying new schedule
    if (result) {
      setIsEditMode(false);
    }
    
    return result;
  };

  const saveSchedule = async () => {
    // Use editable matches if in edit mode, otherwise use generated matches
    const matchesToSave = isEditMode && editableMatches.length > 0 
      ? editableMatches 
      : generatedMatches;
    
    if (!matchesToSave || matchesToSave.length === 0) {
      toast({
        title: "No Matches to Save",
        description: "Please generate and apply a schedule first",
        variant: "destructive"
      });
      return false;
    }
    
    // Validate before saving if in edit mode
    if (isEditMode) {
      const currentValidation = await validateMatches();
      if (!currentValidation.isValid) {
        toast({
          title: "Cannot Save",
          description: `Schedule has ${currentValidation.errors.length} error(s). Please fix them first.`,
          variant: "destructive"
        });
        return false;
      }
    }
    
    return await saveMatches(matchesToSave, selectedDate, dualMatchMode);
  };

  // Team statistics 
  const { total, odd } = useMemo(() => {
    return getTeamCountStatus();
  }, [timeBlockTeams, getTeamCountStatus]);

  // Check if there are unsaved edits
  const hasUnsavedEdits = useMemo(() => {
    if (!isEditMode || !generatedMatches) return false;
    return checkHasUnsavedEdits(generatedMatches);
  }, [isEditMode, editableMatches, generatedMatches, checkHasUnsavedEdits]);

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
    
    // Edit state
    editableMatches,
    isEditMode,
    setIsEditMode,
    validation,
    hasUnsavedEdits,
    
    // Data
    isLoading: isLoadingState,
    isGenerating,
    isSaving,
    timeBlockTeams,
    originalTimeBlockTeams,
    teamBlockMap: loadedTeamBlockMap,
    setTimeBlockTeams,
    generatedPairings,
    unmatchedTeamIds,
    totalTeams: total,
    oddBlocks: odd,
    
    // Actions
    handleLoadTeams: loadTeams,
    handleGenerateClick: generateSchedule,
    handleApplySchedule: applySchedule,
    handleSaveSchedule: saveSchedule,
    
    // Edit actions
    updateMatchTeam,
    updateMatchTimeslot,
    swapTeams,
    removeMatch,
    resetToGenerated,
    validateMatches,
    
    // Formatted utilities
    formattedDate: formatDate(selectedDate)
  };
}
