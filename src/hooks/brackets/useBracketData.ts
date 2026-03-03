import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
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
        const { data: bracket, error: bracketError } = await supabase
          .from('brackets')
          .select(
            `
            id,
            title,
            format,
            state,
            division_id,
            divisions!inner(display_division, name),
            challonge_tournament_id,
            uses_brackets_manager,
            bracket_data
          `
          )
          .eq('id', bracketId)
          .single();

        if (bracketError) {
          errorLog('Bracket query error:', bracketError);
          throw bracketError;
        }

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
        const [stageResult, participantsResult] = await Promise.all([
          supabase.from('stage').select('id, name, type, tournament_id').eq('tournament_id', bracketId),
          supabase.from('participant').select('id, name, position, tournament_id').eq('tournament_id', bracketId),
        ]);

        if (stageResult.error) {
          errorLog('Stage query error:', stageResult.error);
          throw stageResult.error;
        }

        if (!stageResult.data || stageResult.data.length === 0) {
          bracketLog('No stage found for bracket:', bracketId);
          return null;
        }

        const stage = stageResult.data[0];
        bracketLog('Stage found:', { stageId: stage.id, type: stage.type });

        if (participantsResult.error) {
          errorLog('Participants query error:', participantsResult.error);
          throw participantsResult.error;
        }

        const participants = participantsResult.data;
        bracketLog('Participants fetched:', participants?.length || 0);

        // Step 3: Fetch groups and matches concurrently
        updateProgress('matches');
        bracketLog('Parallel Batch 2 - Fetching groups and matches');
        const [groupsResult, matchesResult] = await Promise.all([
          supabase.from('group').select('id, number, stage_id').eq('stage_id', stage.id),
          supabase
            .from('match')
            .select(
              'id, group_id, round_id, number, status, opponent1_id, opponent1_score, opponent1_result, opponent2_id, opponent2_score, opponent2_result'
            )
            .eq('stage_id', stage.id),
        ]);

        if (groupsResult.error) {
          errorLog('Group query error:', groupsResult.error);
          throw groupsResult.error;
        }

        if (matchesResult.error) {
          errorLog('Match query error:', matchesResult.error);
          throw matchesResult.error;
        }

        bracketLog('Raw matches fetched:', matchesResult.data?.length || 0);

        // Step 4: Fetch team details
        updateProgress('teams');
        const teamNames = participants?.map((p) => p.name) || [];
        const { data: teamDetails, error: teamsError } = await supabase
          .from('teams')
          .select('id, name, image_url')
          .in('name', teamNames);

        if (teamsError) {
          errorLog('Teams query error:', teamsError);
          throw teamsError;
        }

        // Step 5: Transform data using the extracted utility
        const result = transformBracketsManagerData({
          bracket,
          stageId: stage.id,
          participants: participants || [],
          groups: groupsResult.data || [],
          matches: matchesResult.data || [],
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
