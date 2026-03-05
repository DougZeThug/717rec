import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import {
  fetchBracketWithDivision,
  fetchGroupsAndMatches,
  fetchStageAndParticipants,
  fetchTeamsByNames,
} from '@/services/brackets/BracketReadService';
import { bracketLog, debugLog, errorLog } from '@/utils/logger';

import { transformBracketsManagerData } from './transformBracketData';

export type BracketLoadingStep = 'bracket' | 'stage' | 'matches' | 'teams' | 'done';

export interface BracketLoadingProgress {
  step: BracketLoadingStep;
  label: string;
  percent: number;
}

export interface SimpleBracketData {
  id: string;
  name: string;
  title: string;
  format: string;
  state: string;
  division: string;
  challonge_tournament_id?: number | null;
  uses_brackets_manager?: boolean;
  matches: Array<{
    id: string;
    round: number;
    position: number;
    team1Id: string | null;
    team2Id: string | null;
    team1Name?: string;
    team2Name?: string;
    team1Logo?: string;
    team2Logo?: string;
    winnerId: string | null;
    team1Score: number | null;
    team2Score: number | null;
    matchType: string;
    status: string;
    nextWinMatchId?: string | null;
    nextLoseMatchId?: string | null;
    team1Seed?: number | null;
    team2Seed?: number | null;
  }>;
  teams: Array<{
    id: string;
    name: string;
    logo_url?: string;
  }>;
  participants?: Array<{
    position: number;
    team_id: string;
    name: string;
    logo_url?: string;
    image_url?: string;
  }>;
  stageId?: number;
}

const LOADING_STEPS: Record<BracketLoadingStep, { label: string; percent: number }> = {
  bracket: { label: 'Loading bracket info...', percent: 20 },
  stage: { label: 'Fetching stage & participants...', percent: 50 },
  matches: { label: 'Loading matches...', percent: 75 },
  teams: { label: 'Fetching team details...', percent: 90 },
  done: { label: 'Complete', percent: 100 },
};

export const useBracketData = (bracketId: string | null) => {
  const [loadingProgress, setLoadingProgress] = useState<BracketLoadingProgress>({
    step: 'bracket',
    label: LOADING_STEPS.bracket.label,
    percent: LOADING_STEPS.bracket.percent,
  });

  const updateProgress = useCallback((step: BracketLoadingStep) => {
    setLoadingProgress({
      step,
      label: LOADING_STEPS[step].label,
      percent: LOADING_STEPS[step].percent,
    });
  }, []);

  bracketLog('useBracketData hook called', { bracketId });

  const query = useQuery({
    queryKey: ['bracket-data', bracketId],
    queryFn: async (): Promise<SimpleBracketData | null> => {
      bracketLog('Starting fetch for bracket:', bracketId);

      if (!bracketId) {
        debugLog('No bracketId provided, returning null');
        return null;
      }

      try {
        // Step 1: Get bracket info
        updateProgress('bracket');
        bracketLog('Step 1 - Fetching bracket info for ID:', bracketId);
        const bracket = await fetchBracketWithDivision(bracketId);

        if (!bracket) {
          bracketLog('No bracket found with ID:', bracketId);
          return null;
        }

        bracketLog('Step 1 Complete - Bracket found:', {
          id: bracket.id,
          title: bracket.title,
          uses_brackets_manager: bracket.uses_brackets_manager,
        });

        if (!bracket.uses_brackets_manager) {
          debugLog('Not a brackets-manager bracket');
          return null;
        }

        // Step 2: Fetch stage and participants concurrently
        updateProgress('stage');
        bracketLog('Parallel Batch 1 - Fetching stage and participants');
        const { stages, participants } = await fetchStageAndParticipants(bracketId);

        if (!stages || stages.length === 0) {
          bracketLog('No stage found for bracket:', bracketId);
          return null;
        }

        const stage = stages[0];
        bracketLog('Stage found:', { stageId: stage.id, type: stage.type });
        bracketLog('Participants fetched:', participants?.length || 0);

        // Step 3: Fetch groups and matches concurrently
        updateProgress('matches');
        bracketLog('Parallel Batch 2 - Fetching groups and matches');
        const { groups, matches } = await fetchGroupsAndMatches(stage.id);

        bracketLog('Raw matches fetched:', matches?.length || 0);

        // Step 4: Fetch team details
        updateProgress('teams');
        const teamNames = participants?.map((p) => p.name) || [];
        const teamDetails = await fetchTeamsByNames(teamNames);

        // Step 5: Transform data using the extracted utility
        const result = transformBracketsManagerData({
          bracket,
          stageId: stage.id,
          participants: participants || [],
          groups: groups || [],
          matches: matches || [],
          teamDetails: teamDetails || [],
        });

        updateProgress('done');
        bracketLog('Final result built from SQL tables:', {
          bracketId: result.id,
          matchesCount: result.matches.length,
          teamsCount: result.teams.length,
          stageId: stage.id,
        });

        return result;
      } catch (error) {
        errorLog('CRITICAL ERROR in useBracketData:', {
          bracketId,
          error: error.message,
        });
        throw error;
      }
    },
    enabled: true,
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 5,
    retry: (failureCount, error) => {
      debugLog(`Query retry attempt ${failureCount} for bracket ${bracketId}:`, {
        error: error?.message,
        willRetry: failureCount < 2,
      });
      return failureCount < 2;
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    loadingProgress,
  };
};
