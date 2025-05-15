
import { useTeamScheduleLoader } from './useTeamScheduleLoader';
import { usePairingGenerator } from './usePairingGenerator';
import { useSchedulePreview } from './useSchedulePreview';
import { useState } from 'react';
import { normalizeDate } from '@/utils/dateNormalization';

export const useAutoSchedule = () => {
  const teamLoader = useTeamScheduleLoader();
  const pairingGenerator = usePairingGenerator();
  const schedulePreview = useSchedulePreview();
  const [createdMatches, setCreatedMatches] = useState<any[]>([]);
  
  const generateAndExportSchedule = async (date: Date, options: any = {}) => {
    // Log the date being used
    console.log("useAutoSchedule - generateAndExportSchedule date:", {
      date,
      dateString: date.toString(),
      dateIso: date.toISOString(),
      normalizedDate: normalizeDate(date, 'useAutoSchedule')
    });
    
    // Load teams first if not already loaded
    if (!teamLoader.timeBlockTeams || Object.keys(teamLoader.timeBlockTeams).length === 0) {
      await schedulePreview.previewSchedule(date);
    }
    
    // Generate match pairings
    const pairings = await schedulePreview.handleGenerateSchedule(date, options);
    
    if (pairings) {
      // Convert pairings to match format
      const matches = schedulePreview.convertPairingsToMatches(pairings, date);
      setCreatedMatches(matches);
      return matches;
    }
    
    return null;
  };
  
  return {
    // Re-export all functionalities from the individual hooks
    isGenerating: teamLoader.isLoading || pairingGenerator.isGenerating,
    timeBlockTeams: teamLoader.timeBlockTeams,
    scheduledMatches: createdMatches,
    generatedPairings: pairingGenerator.generatedPairings,
    loadTeamsForDate: teamLoader.loadTeamsForDate,
    previewSchedule: schedulePreview.previewSchedule,
    generateMatchPairings: pairingGenerator.generateMatchPairings,
    convertPairingsToMatches: schedulePreview.convertPairingsToMatches,
    generateAndExportSchedule,
  };
};
