import { useCallback, useRef, useState } from 'react';

import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { errorLog, playoffLog } from '@/utils/logger';
import type { PlayoffBracket, PlayoffMatch, PlayoffMatchType } from '@/utils/playoffs/playoffTypes';

import { useOptimisticScoreMutation } from './useOptimisticScoreMutation';
import { usePlayoffMatchUpdate } from './usePlayoffMatchUpdate';

/**
 * Stage data from brackets-manager match query
 */
interface BmStageData {
  id: number;
  tournament_id: string;
  name?: string;
  type?: string;
  number?: number;
}

/**
 * Brackets-manager match data from database
 */
interface BmMatchData {
  id: number;
  opponent1_id: number | null;
  opponent2_id: number | null;
  opponent1_score: number | null;
  opponent2_score: number | null;
  round_id: number | null;
  number: number | null;
  child_count: number | null;
  status: number;
  stage?: BmStageData;
}

/**
 * Bracket reference from playoff_matches join
 */
interface BracketRef {
  id: string;
  uses_brackets_manager: boolean;
}

/**
 * Playoff match data from database
 */
interface DbPlayoffMatch {
  id: string;
  bracket_id: string;
  round: number;
  position: number;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  loser_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  match_type: PlayoffMatchType;
  best_of: number | null;
  team1_seed: number | null;
  team2_seed: number | null;
  next_win_match_id: string | null;
  next_lose_match_id: string | null;
  status: string | null;
  bracket?: BracketRef;
}

export const usePlayoffEditMatch = () => {
  const [editingMatch, setEditingMatch] = useState<PlayoffMatch | null>(null);
  const [currentBracket, setCurrentBracket] = useState<PlayoffBracket | null>(null);
  const [isQuickEdit, setIsQuickEdit] = useState(false);
  const { toast } = useToast();

  // Track last edited match for optimistic updates
  const lastEditedMatchRef = useRef<PlayoffMatch | null>(null);

  // Use unified match update hook for routing
  const { updateMatch } = usePlayoffMatchUpdate(currentBracket);

  // Optimistic score mutation
  const optimisticMutation = useOptimisticScoreMutation(currentBracket?.id ?? null);

  const handleEditMatch = useCallback(
    async (matchId: string, quickEdit: boolean = false) => {
      playoffLog('Edit match requested:', matchId);

      try {
        // Check if matchId is an integer (brackets-manager SQL) or UUID (playoff_matches)
        const isInteger = /^\d+$/.test(matchId);

        if (isInteger) {
          // Fetch from brackets-manager match table
          const { data: matchData, error } = await supabase
            .from('match')
            .select('*, stage:stage_id(*)')
            .eq('id', parseInt(matchId))
            .single();

          if (error || !matchData) {
            errorLog('Error fetching brackets-manager match:', error);
            toast({
              title: 'Error',
              description: 'Failed to load match data. Please try again.',
              variant: 'destructive',
            });
            return;
          }

          const typedMatchData = matchData as unknown as BmMatchData;

          // Check if match has both opponents
          if (!typedMatchData.opponent1_id || !typedMatchData.opponent2_id) {
            toast({
              title: 'Match Locked',
              description:
                'This match is waiting for teams to be determined from previous matches.',
            });
            return;
          }

          // Get bracket info
          const stageData = typedMatchData.stage;
          const bracketId = stageData?.tournament_id;

          if (!bracketId) {
            toast({
              title: 'Error',
              description: 'Could not determine bracket for this match.',
              variant: 'destructive',
            });
            return;
          }

          setCurrentBracket({
            id: bracketId,
            uses_brackets_manager: true,
            format: 'Single Elimination',
            state: 'in_progress',
          } as PlayoffBracket);

          // Convert brackets-manager match to PlayoffMatch format
          const playoffMatch: PlayoffMatch = {
            id: matchData.id.toString(),
            bracket_id: bracketId,
            round: matchData.round_id || 1,
            position: matchData.number || 1,
            team1Id: matchData.opponent1_id?.toString(),
            team2Id: matchData.opponent2_id?.toString(),
            winnerId: null,
            loserId: null,
            team1Score: matchData.opponent1_score || 0,
            team2Score: matchData.opponent2_score || 0,
            team1GameWins: matchData.opponent1_score || 0,
            team2GameWins: matchData.opponent2_score || 0,
            matchType: 'winners',
            bestOf: matchData.child_count || 3,
            team1Seed: null,
            team2Seed: null,
            nextWinMatchId: null,
            nextLoseMatchId: null,
            status:
              matchData.status === 4
                ? 'completed'
                : matchData.status === 3
                  ? 'in_progress'
                  : 'pending',
          };

          playoffLog('Loaded brackets-manager match:', playoffMatch.id);
          setEditingMatch(playoffMatch);
          setIsQuickEdit(quickEdit);
        } else {
          // Fetch from playoff_matches table (UUID)
          const { data: matchData, error } = await supabase
            .from('playoff_matches')
            .select(
              `
            *,
            bracket:brackets!playoff_matches_bracket_id_fkey(id, uses_brackets_manager),
            playoff_games(*)
          `
            )
            .eq('id', matchId)
            .single();

          if (error) {
            errorLog('Error fetching playoff match:', error);
            toast({
              title: 'Error',
              description: 'Failed to load match data. Please try again.',
              variant: 'destructive',
            });
            return;
          }

          if (!matchData) {
            errorLog('Match not found:', matchId);
            toast({
              title: 'Error',
              description: 'Match not found.',
              variant: 'destructive',
            });
            return;
          }

          // Check if match can be edited
          if (!matchData.team1_id || !matchData.team2_id) {
            toast({
              title: 'Match Locked',
              description:
                'This match is waiting for teams to be determined from previous matches.',
            });
            return;
          }

          const typedMatchData = matchData as unknown as DbPlayoffMatch;

          // Store bracket info for routing
          setCurrentBracket({
            id: typedMatchData.bracket_id,
            uses_brackets_manager: typedMatchData.bracket?.uses_brackets_manager || false,
            format: 'Single Elimination',
            state: 'in_progress',
          } as PlayoffBracket);

          // Convert database match to PlayoffMatch format
          const playoffMatch: PlayoffMatch = {
            id: typedMatchData.id,
            bracket_id: typedMatchData.bracket_id,
            round: typedMatchData.round,
            position: typedMatchData.position,
            team1Id: typedMatchData.team1_id,
            team2Id: typedMatchData.team2_id,
            winnerId: typedMatchData.winner_id,
            loserId: typedMatchData.loser_id,
            team1Score: typedMatchData.team1_score,
            team2Score: typedMatchData.team2_score,
            team1GameWins: null,
            team2GameWins: null,
            matchType: typedMatchData.match_type,
            bestOf: typedMatchData.best_of || 3,
            team1Seed: typedMatchData.team1_seed,
            team2Seed: typedMatchData.team2_seed,
            nextWinMatchId: typedMatchData.next_win_match_id,
            nextLoseMatchId: typedMatchData.next_lose_match_id,
            status: (typedMatchData.status as 'pending' | 'in_progress' | 'completed') || 'pending',
            games: ((matchData as any).playoff_games || [])
              .sort((a: any, b: any) => a.game_number - b.game_number)
              .map((g: any) => ({
                id: g.id,
                matchId: g.match_id,
                gameNumber: g.game_number,
                team1Score: g.team1_score,
                team2Score: g.team2_score,
                winnerId: g.winner_id,
              })),
          };

          playoffLog('Loaded playoff match:', playoffMatch.id);
          setEditingMatch(playoffMatch);
          setIsQuickEdit(quickEdit);
        }
      } catch (error) {
        errorLog('Unexpected error in handleEditMatch:', error);
        toast({
          title: 'Error',
          description: 'An unexpected error occurred. Please try again.',
          variant: 'destructive',
        });
      }
    },
    [toast]
  );

  const handleCloseMatchEditor = useCallback(() => {
    playoffLog('Match editor closed');
    setEditingMatch(null);
    setIsQuickEdit(false);
  }, []);

  const handleSaveMatchScore = useCallback(
    async (
      matchId: string,
      team1Score: number,
      team2Score: number,
      games: { team1Score: number; team2Score: number }[],
      team1GameWins: number,
      team2GameWins: number,
      refetchBrackets: () => Promise<any>
    ) => {
      playoffLog('Saving match score (optimistic):', { matchId, team1GameWins, team2GameWins });

      // Store match info for optimistic update
      const matchToSave = editingMatch;
      lastEditedMatchRef.current = matchToSave;

      // 1. Close editor IMMEDIATELY for instant feedback
      setEditingMatch(null);
      setIsQuickEdit(false);

      // 2. Apply optimistic update to cache
      if (matchToSave && currentBracket?.id) {
        optimisticMutation.applyOptimisticUpdate(
          matchId,
          team1Score,
          team2Score,
          team1GameWins,
          team2GameWins,
          matchToSave.team1Id ?? null,
          matchToSave.team2Id ?? null
        );
      }

      // 3. Show instant success toast
      toast({
        title: 'Score saved!',
        description: 'Updating bracket...',
      });

      try {
        // 4. Run actual database operations in background
        await updateMatch(matchId, team1Score, team2Score, games, team1GameWins, team2GameWins);

        // 5. Confirm optimistic update succeeded
        optimisticMutation.onSuccess();

        // 6. Refresh UI for final consistency (realtime will also trigger)
        if (refetchBrackets) {
          await refetchBrackets();
        }
      } catch (error) {
        // 7. Rollback on error
        errorLog('Error saving match score:', error);
        optimisticMutation.onError(error as Error);
        throw error;
      }
    },
    [updateMatch, currentBracket, editingMatch, toast, optimisticMutation]
  );

  return {
    editingMatch,
    isQuickEdit,
    handleEditMatch,
    handleCloseMatchEditor,
    handleSaveMatchScore,
  };
};
