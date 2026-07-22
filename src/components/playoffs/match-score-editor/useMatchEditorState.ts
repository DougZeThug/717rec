import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useBracketsManagerMatch } from '@/hooks/playoffs/useBracketsManagerMatch';
import { useToast } from '@/hooks/useToast';
import { bracketManagerService } from '@/services/brackets/manager';
import { errorLog, log } from '@/utils/logger';

type ScoreDraft = {
  key: string;
  opponent1Score: number;
  opponent2Score: number;
};

export interface ByeEligibility {
  canToggle: boolean;
  currentStatus: number;
  statusName: string;
  reason?: string;
}

interface UseMatchEditorStateOptions {
  matchId: number | null;
  onClose: () => void;
  onSaved?: () => void;
}

export const useMatchEditorState = ({ matchId, onClose, onSaved }: UseMatchEditorStateOptions) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: matchData, isLoading, error } = useBracketsManagerMatch(matchId);

  const [scoreDraft, setScoreDraft] = useState<ScoreDraft | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [byeEligible, setByeEligible] = useState<ByeEligibility | null>(null);

  const matchScoreKey = `${matchId ?? 'none'}:${matchData?.opponent1?.score ?? 0}:${
    matchData?.opponent2?.score ?? 0
  }`;
  const opponent1Score =
    scoreDraft?.key === matchScoreKey
      ? scoreDraft.opponent1Score
      : (matchData?.opponent1?.score ?? 0);
  const opponent2Score =
    scoreDraft?.key === matchScoreKey
      ? scoreDraft.opponent2Score
      : (matchData?.opponent2?.score ?? 0);

  const baseOpponent1Score = matchData?.opponent1?.score ?? 0;
  const baseOpponent2Score = matchData?.opponent2?.score ?? 0;

  const setOpponent1Score = (score: number) => {
    setScoreDraft((prev) => {
      const current = prev && prev.key === matchScoreKey ? prev.opponent2Score : baseOpponent2Score;
      return { key: matchScoreKey, opponent1Score: score, opponent2Score: current };
    });
  };

  const setOpponent2Score = (score: number) => {
    setScoreDraft((prev) => {
      const current = prev && prev.key === matchScoreKey ? prev.opponent1Score : baseOpponent1Score;
      return { key: matchScoreKey, opponent1Score: current, opponent2Score: score };
    });
  };

  // Check BYE eligibility when match loads
  useEffect(() => {
    const checkByeEligibility = async () => {
      if (!matchData || !matchId) return;

      try {
        const result = await bracketManagerService.checkByeEligibility(matchId);

        setByeEligible({
          canToggle: result.ok,
          currentStatus: result.meta?.status || 0,
          statusName: result.meta?.currentStatusName || 'Unknown',
          reason: result.reason,
        });
      } catch (err) {
        errorLog('Error checking BYE eligibility:', err);
      }
    };

    checkByeEligibility();
  }, [matchData, matchId]);

  const invalidateQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['brackets-manager-match', matchId] }),
      queryClient.invalidateQueries({ queryKey: ['brackets'] }),
      queryClient.invalidateQueries({ queryKey: ['playoff-matches'] }),
    ]);
  };

  const handleSave = async () => {
    if (!matchId || !matchData) return;

    try {
      setIsSaving(true);

      const isBye = !matchData.opponent1 || !matchData.opponent2;

      // Reject ties BEFORE any write (unlock/status mutation happens inside
      // updateMatch). Playoff matches must have a decisive winner; a tie
      // would otherwise flow through as a loss/loss update and be rejected
      // by brackets-manager after the pre-update unlock already mutated
      // match status. See PR-06.
      if (!isBye && opponent1Score === opponent2Score) {
        toast({
          title: 'Invalid Score',
          description: 'Playoff matches cannot end tied. Please enter a decisive score.',
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      log('Saving brackets-manager match', {
        matchId,
        opponent1Score,
        opponent2Score,
        isBye,
        hasOpponent1: !!matchData.opponent1,
        hasOpponent2: !!matchData.opponent2,
      });

      if (isBye) {
        // One-sided match: explicit admin action (legacy brackets only — new
        // brackets resolve BYEs automatically inside brackets-manager).
        const winnerScore = matchData.opponent1 ? opponent1Score : opponent2Score;
        await bracketManagerService.adminCompleteByeMatch(matchId, winnerScore);
      } else {
        const scores: {
          opponent1: { score: number; result?: 'win' | 'loss' };
          opponent2: { score: number; result?: 'win' | 'loss' };
        } = {
          opponent1: {
            score: opponent1Score,
            result: opponent1Score > opponent2Score ? ('win' as const) : ('loss' as const),
          },
          opponent2: {
            score: opponent2Score,
            result: opponent2Score > opponent1Score ? ('win' as const) : ('loss' as const),
          },
        };

        await bracketManagerService.updateMatch({ matchId, scores });
      }

      await invalidateQueries();

      toast({
        title: 'Match Updated',
        description: 'Match score saved successfully with auto-progression',
      });

      onSaved?.();
      onClose();
    } catch (err) {
      errorLog('Error updating match:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update match',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleByeStatus = async (clearDownstream = false) => {
    if (!matchId || !byeEligible) return;

    try {
      setIsTogglingStatus(true);

      const makeReady = byeEligible.currentStatus !== 2 && byeEligible.currentStatus !== 4;

      const result = await bracketManagerService.adminToggleByeReady(
        matchId,
        makeReady,
        clearDownstream
      );

      toast({
        title: 'Status Updated',
        description: result.message,
      });

      await queryClient.invalidateQueries({ queryKey: ['brackets-manager-match', matchId] });
      await queryClient.invalidateQueries({ queryKey: ['brackets'] });

      onSaved?.();

      setByeEligible((prev) =>
        prev ? { ...prev, currentStatus: result.status, statusName: result.statusName } : prev
      );
    } catch (err) {
      errorLog('Error toggling BYE status:', err);
      toast({
        title: 'Toggle Failed',
        description: err instanceof Error ? err.message : 'Failed to toggle match status',
        variant: 'destructive',
      });
    } finally {
      setIsTogglingStatus(false);
    }
  };

  return {
    matchData,
    isLoading,
    error,
    opponent1Score,
    setOpponent1Score,
    opponent2Score,
    setOpponent2Score,
    isSaving,
    isTogglingStatus,
    byeEligible,
    handleSave,
    handleToggleByeStatus,
  };
};
