
import { useState } from 'react';
import { TeamPairingMap, TimeBlockTeamsMap } from '@/types/autoSchedule';
import { SchedulePreviewState } from './types';

export const useScheduleState = () => {
  const [autoScheduleStep, setAutoScheduleStep] = useState<'teams' | 'pairings'>('teams');
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeBlockTeams, setTimeBlockTeams] = useState<TimeBlockTeamsMap>({});
  const [generatedPairings, setGeneratedPairings] = useState<TeamPairingMap>({});
  const [unmatchedTeamIds, setUnmatchedTeamIds] = useState<string[]>([]);

  return {
    // State
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
    setUnmatchedTeamIds,
  };
};
