import { useCallback, useEffect, useRef, useState } from 'react';

import { AutoScheduleMatch, MatchQualityMetrics } from '@/types/autoSchedule';
import { scheduleLog } from '@/utils/logger';

import { deserializeMatches, loadAutoScheduleState, saveAutoScheduleState } from './storage';
import { UseAutoScheduleState } from './types';

export const useAutoScheduleState = () => {
  // Load persisted state on mount
  const persistedState = useRef(loadAutoScheduleState());
  const isInitialized = useRef(false);

  // Tab state - initialize from persisted or defaults
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    if (persistedState.current?.selectedDate) {
      return new Date(persistedState.current.selectedDate);
    }
    return new Date();
  });

  const [activeTab, setActiveTab] = useState<string>(
    () => persistedState.current?.activeTab || 'teams'
  );

  // Algorithm settings - initialize from persisted or defaults
  const [avoidRematches, setAvoidRematches] = useState(
    () => persistedState.current?.avoidRematches ?? true
  );
  const [prioritizeQuality, setPrioritizeQuality] = useState(
    () => persistedState.current?.prioritizeQuality ?? false
  );
  const [dualMatchMode, setDualMatchMode] = useState(
    () => persistedState.current?.dualMatchMode ?? true
  );

  // Processing state (transient - don't persist)
  const [isProcessing, setIsProcessing] = useState(false);

  // Generated data - initialize from persisted
  const [generatedMatches, setGeneratedMatches] = useState<
    UseAutoScheduleState['generatedMatches']
  >(() => {
    if (persistedState.current?.generatedMatches?.length) {
      return deserializeMatches(persistedState.current.generatedMatches);
    }
    return [];
  });

  const [matchQualityMetrics, setMatchQualityMetrics] = useState<
    UseAutoScheduleState['matchQualityMetrics']
  >(() => persistedState.current?.matchQualityMetrics || null);

  // Editable matches state - initialize from persisted
  const [editableMatches, setEditableMatches] = useState<AutoScheduleMatch[]>(() => {
    if (persistedState.current?.editableMatches?.length) {
      return deserializeMatches(persistedState.current.editableMatches);
    }
    return [];
  });

  // Edit mode should persist (admin may be mid-edit when navigating away)
  const [isEditMode, setIsEditMode] = useState(() => persistedState.current?.isEditMode ?? false);

  // Team block mapping for validation (supports double headers in multiple blocks)
  const [teamBlockMap, setTeamBlockMap] = useState<Record<string, string[]>>(
    () => persistedState.current?.teamBlockMap || {}
  );

  // Persist state changes (debounced via effect)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const persistState = useCallback(() => {
    // Skip initial mount to avoid overwriting with potentially stale state
    if (!isInitialized.current) {
      isInitialized.current = true;
      return;
    }

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce saves to avoid excessive writes
    saveTimeoutRef.current = setTimeout(() => {
      scheduleLog('Persisting auto-schedule state to sessionStorage');
      saveAutoScheduleState({
        selectedDate: selectedDate?.toISOString() || null,
        activeTab,
        isEditMode,
        avoidRematches,
        prioritizeQuality,
        dualMatchMode,
        generatedMatches,
        editableMatches,
        matchQualityMetrics,
        teamBlockMap,
      });
    }, 300);
  }, [
    selectedDate,
    activeTab,
    isEditMode,
    avoidRematches,
    prioritizeQuality,
    dualMatchMode,
    generatedMatches,
    editableMatches,
    matchQualityMetrics,
    teamBlockMap,
  ]);

  // Trigger persist on state changes
  useEffect(() => {
    persistState();

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [persistState]);

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
    setTeamBlockMap,
  };
};
