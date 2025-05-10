
import { useTeamScheduleLoader } from './useTeamScheduleLoader';
import { usePairingGenerator } from './usePairingGenerator';
import { useSchedulePreview } from './useSchedulePreview';

export const useAutoSchedule = () => {
  const teamLoader = useTeamScheduleLoader();
  const pairingGenerator = usePairingGenerator();
  const schedulePreview = useSchedulePreview();
  
  return {
    // Re-export all functionalities from the individual hooks
    isGenerating: teamLoader.isLoading || pairingGenerator.isGenerating,
    timeBlockTeams: teamLoader.timeBlockTeams,
    scheduledMatches: [],
    generatedPairings: pairingGenerator.generatedPairings,
    loadTeamsForDate: teamLoader.loadTeamsForDate,
    previewSchedule: schedulePreview.previewSchedule,
    generateMatchPairings: pairingGenerator.generateMatchPairings,
    convertPairingsToMatches: schedulePreview.convertPairingsToMatches,
  };
};
