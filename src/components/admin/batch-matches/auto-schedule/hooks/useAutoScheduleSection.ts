import { useCallback, useState } from 'react';

import { MatchPair } from '@/components/admin/batch-matches/MatchPairsList';
import { useToast } from '@/hooks/useToast';
import { useSchedulePreview } from '@/hooks/useSchedulePreview';
import { normalizeDate } from '@/utils/dateNormalization';
import { scheduleLog } from '@/utils/logger';

interface UseAutoScheduleSectionProps {
  selectedDate: Date | null;
  setMatchPairs: React.Dispatch<React.SetStateAction<MatchPair[]>>;
}

export const useAutoScheduleSection = ({
  selectedDate,
  setMatchPairs,
}: UseAutoScheduleSectionProps) => {
  // Algorithm settings
  const [avoidRematches, setAvoidRematches] = useState(true);
  const [prioritizeQuality, setPrioritizeQuality] = useState(false);

  const { toast } = useToast();

  const {
    autoScheduleStep,
    setAutoScheduleStep,
    isLoading,
    isGenerating,
    timeBlockTeams,
    generatedPairings,
    unmatchedTeamIds,
    previewSchedule,
    handleGenerateSchedule,
    convertPairingsToMatches,
    getTeamCountStatus,
  } = useSchedulePreview();

  // Handle loading teams for preview
  const handlePreviewTeams = useCallback(async () => {
    if (!selectedDate) {
      toast({
        title: 'Select Date',
        description: 'Please select a date first.',
        variant: 'destructive',
      });
      return;
    }

    scheduleLog('useAutoScheduleSection - handlePreviewTeams', {
      selectedDate,
      selectedDateString: selectedDate.toString(),
      selectedDateIso: selectedDate.toISOString(),
      simpleDateString: normalizeDate(selectedDate, 'handlePreviewTeams'),
    });

    const preview = await previewSchedule(selectedDate);

    if (preview) {
      toast({
        title: 'Teams Loaded',
        description: 'Teams for each time block have been loaded.',
      });
    }
  }, [selectedDate, previewSchedule, toast]);

  // Handle generating schedule with current settings
  const handleGenerateScheduleClick = useCallback(async () => {
    if (!selectedDate) {
      toast({
        title: 'Select Date',
        description: 'Please select a date first.',
        variant: 'destructive',
      });
      return;
    }

    // Pass configuration options to the generation function
    await handleGenerateSchedule(selectedDate, {
      avoidRematches,
      prioritizeQuality,
      weights: prioritizeQuality
        ? {
            // Increase power score and record weights for higher quality matches
            powerScoreWeight: 5,
            recordWeight: 3.5,
          }
        : undefined,
    });
  }, [selectedDate, avoidRematches, prioritizeQuality, handleGenerateSchedule, toast]);

  // Handle applying generated schedule to the form
  const handleApplySchedule = useCallback(() => {
    if (!generatedPairings || !selectedDate) {
      toast({
        title: 'Error',
        description: 'No schedule has been generated yet.',
        variant: 'destructive',
      });
      return;
    }

    const newMatchPairs = convertPairingsToMatches(generatedPairings, selectedDate);

    if (newMatchPairs.length === 0) {
      toast({
        title: 'Error',
        description: 'No valid match pairings were generated.',
        variant: 'destructive',
      });
      return;
    }

    // Update the match pairs list with generated matches
    setMatchPairs(newMatchPairs as MatchPair[]);

    toast({
      title: 'Schedule Applied',
      description: `${newMatchPairs.length} matches have been added to the form.`,
    });
  }, [selectedDate, generatedPairings, convertPairingsToMatches, setMatchPairs, toast]);

  // Get current team count stats
  const { total: totalTeams, odd: oddBlocks } = getTeamCountStatus();

  return {
    // Algorithm settings
    avoidRematches,
    setAvoidRematches,
    prioritizeQuality,
    setPrioritizeQuality,

    // State
    autoScheduleStep,
    setAutoScheduleStep,
    isLoading,
    isGenerating,
    timeBlockTeams,
    generatedPairings,
    unmatchedTeamIds,
    totalTeams,
    oddBlocks,

    // Actions
    handlePreviewTeams,
    handleGenerateScheduleClick,
    handleApplySchedule,
  };
};
