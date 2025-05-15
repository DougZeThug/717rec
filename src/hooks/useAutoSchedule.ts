
import { useAutoSchedule as useModularAutoSchedule } from './useAutoSchedule/index';
import { useState } from 'react';
import { normalizeDate } from '@/utils/dateNormalization';

/**
 * @deprecated Use the modular useAutoSchedule from './useAutoSchedule/index' instead
 */
export const useAutoSchedule = () => {
  const {
    timeBlockTeams,
    isLoading: isGenerating,
    handleLoadTeams,
    handleGenerateClick,
    handleApplySchedule,
    generatedPairings
  } = useModularAutoSchedule();
  
  const [createdMatches, setCreatedMatches] = useState<any[]>([]);
  
  const generateAndExportSchedule = async (date: Date, options: any = {}) => {
    // Log the date being used
    console.log("useAutoSchedule - generateAndExportSchedule date:", {
      date,
      dateString: date.toString(),
      dateIso: date.toISOString(),
      normalizedDate: normalizeDate(date, 'useAutoSchedule')
    });
    
    // Load teams
    await handleLoadTeams();
    
    // Generate match pairings
    const result = await handleGenerateClick();
    
    if (result) {
      // Apply the schedule (which converts pairings to matches)
      const matches = handleApplySchedule();
      if (matches) {
        setCreatedMatches(matches);
        return matches;
      }
    }
    
    return null;
  };
  
  return {
    // Re-export functionality from the individual hooks
    isGenerating,
    timeBlockTeams,
    scheduledMatches: createdMatches,
    generatedPairings,
    loadTeamsForDate: handleLoadTeams,
    generateAndExportSchedule,
  };
};
