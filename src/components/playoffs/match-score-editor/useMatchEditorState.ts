import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useBracketsManagerMatch } from '@/hooks/playoffs/useBracketsManagerMatch';
import { useToast } from '@/hooks/useToast';
import { bracketManagerService } from '@/services/brackets/manager';
import { errorLog, log } from '@/utils/logger';

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

  const [opponent1Score, setOpponent1Score] = useState<number>(0);
  const [opponent2Score, setOpponent2Score] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [byeEligible, setByeEligible] = useState<ByeEligibility | null>(null);

  // Reset form when match data loads
  useEffect(() => {
    if (matchData) {
      setOpponent1Score(matchData.opponent1?.score ?? 0);
      setOpponent2Score(matchData.opponent2?.score ?? 0);
    }
  }, [matchData]);

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
    await queryClient.invalidateQueries({ queryKey: ['brackets-manager-match', matchId] });
    await queryClient.invalidateQueries({ queryKey: ['brackets'] });
    await queryClient.invalidateQueries({ queryKey: ['playoff-matches'] });
  };

  const handleSave = async () => {
    if (!matchId || !matchData) return;

    try {
      setIsSaving(true);

      const isBye = !matchData.opponent1 || !matchData.opponent2;

      log('Saving brackets-manager match', {
        matchId,
        opponent1Score,
        opponent2Score,
        isBye,
        hasOpponent1: !!matchData.opponent1,
        hasOpponent2: !!matchData.opponent2,
      });

      if (isBye) {
        const scores: any = {};

        if (matchData.opponent1) {
          scores.opponent1 = { score: opponent1Score, result: 'win' as const };
        } else if (matchData.opponent2) {
          scores.opponent2 = { score: opponent2Score, result: 'win' as const };
        }

        await bracketManagerService.updateMatch({ matchId, scores });
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

  const handleToggleByeStatus = async (clearDownstream: boolean = false) => {
    if (!matchId || !byeEligible) return;

    try {
      setIsTogglingStatus(true);

      const makeReady = byeEligible.currentStatus !== 2;

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

      setByeEligible({
        ...byeEligible,
        currentStatus: result.status,
        statusName: result.statusName,
      });
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
