
import { useCallback } from 'react';
import { useScheduleState } from './useScheduleState';
import { useTeamPreview } from './useTeamPreview';
import { usePairingPreview } from './usePairingPreview';
import { useMatchConverter } from './useMatchConverter';
import { AlgorithmOptions, PreviewMatch } from './types';

export const useSchedulePreview = () => {
  // Get state management
  const {
    autoScheduleStep,
    setAutoScheduleStep,
    isLoading,
    setIsLoading,
    isGenerating,
    setIsGenerating,
    timeBlockTeams,
    setTimeBlockTeams,
    generatedPairings,
    setGeneratedPairings,
    unmatchedTeamIds,
    setUnmatchedTeamIds
  } = useScheduleState();

  // Get team preview operations
  const {
    previewSchedule,
    getTeamCounts
  } = useTeamPreview(setTimeBlockTeams, setIsLoading);

  // Get pairing operations
  const {
    generateSchedule
  } = usePairingPreview(
    timeBlockTeams, 
    setGeneratedPairings, 
    setUnmatchedTeamIds, 
    setIsGenerating, 
    setAutoScheduleStep
  );

  // Get match converter
  const {
    convertPairingsToMatches
  } = useMatchConverter();

  // Wrapper for generateSchedule with cleaner API
  const handleGenerateSchedule = useCallback(async (
    date: Date,
    options: AlgorithmOptions = {}
  ): Promise<void> => {
    await generateSchedule(date, options);
  }, [generateSchedule]);

  // Apply schedule and generate matches from pairings
  const handleApplySchedule = useCallback((selectedDate: Date | null): PreviewMatch[] => {
    if (!selectedDate || !generatedPairings || Object.keys(generatedPairings).length === 0) {
      return [];
    }
    
    const matches = convertPairingsToMatches(generatedPairings, selectedDate);
    return matches;
  }, [generatedPairings, convertPairingsToMatches]);

  return {
    // State
    autoScheduleStep,
    setAutoScheduleStep,
    isLoading,
    isGenerating,
    timeBlockTeams,
    generatedPairings,
    unmatchedTeamIds,
    
    // Operations
    previewSchedule,
    handleGenerateSchedule,
    handleApplySchedule,
    convertPairingsToMatches,
    getTeamCountStatus: getTeamCounts
  };
};
