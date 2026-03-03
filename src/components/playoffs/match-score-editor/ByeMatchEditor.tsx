import { Loader2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { ByeEligibility } from './useMatchEditorState';

interface ByeMatchEditorProps {
  byeWinner: { name: string; score?: number | null };
  hasOpponent1: boolean;
  opponent1Score: number;
  opponent2Score: number;
  setOpponent1Score: (score: number) => void;
  setOpponent2Score: (score: number) => void;
  byeEligible: ByeEligibility | null;
  isSaving: boolean;
  isTogglingStatus: boolean;
  onSave: () => void;
  onClose: () => void;
  onToggleByeStatus: (clearDownstream: boolean) => void;
}

export const ByeMatchEditor: React.FC<ByeMatchEditorProps> = ({
  byeWinner,
  hasOpponent1,
  opponent1Score,
  opponent2Score,
  setOpponent1Score,
  setOpponent2Score,
  byeEligible,
  isSaving,
  isTogglingStatus,
  onSave,
  onClose,
  onToggleByeStatus,
}) => {
  return (
    <DialogContent className="max-w-[95vw] sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-base sm:text-lg">Match Forfeit - BYE</DialogTitle>
      </DialogHeader>

      <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
        <div className="text-center py-2 sm:py-4">
          <p className="text-lg sm:text-xl font-semibold px-2">
            {byeWinner.name} wins by walkover
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2">Opponent: BYE</p>
        </div>

        {/* BYE Status Toggle Control - Admin Only */}
        {byeEligible && byeEligible.canToggle && (
          <ByeStatusControl
            byeEligible={byeEligible}
            isTogglingStatus={isTogglingStatus}
            onToggleByeStatus={onToggleByeStatus}
          />
        )}

        {/* Winner Score */}
        <div className="space-y-2">
          <Label htmlFor="winner-score" className="text-sm">
            {byeWinner.name} Score (Games Won)
          </Label>
          <Input
            id="winner-score"
            type="number"
            min="0"
            value={hasOpponent1 ? opponent1Score : opponent2Score}
            onChange={(e) => {
              const score = parseInt(e.target.value) || 0;
              if (hasOpponent1) {
                setOpponent1Score(score);
                setOpponent2Score(0);
              } else {
                setOpponent2Score(score);
                setOpponent1Score(0);
              }
            }}
            disabled={byeEligible && byeEligible.currentStatus !== 2}
            className="w-full"
          />
          {byeEligible && byeEligible.currentStatus !== 2 && (
            <p className="text-xs text-destructive">
              Match is {byeEligible.statusName}. Use the status toggle above to unlock.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Enter the number of games won (typically 2 for Best of 3)
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-2">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isSaving}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={isSaving || (byeEligible && byeEligible.currentStatus !== 2)}
          className="w-full sm:w-auto"
        >
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Award Win
        </Button>
      </div>
    </DialogContent>
  );
};

/** Status toggle buttons for BYE matches. */
const ByeStatusControl: React.FC<{
  byeEligible: ByeEligibility;
  isTogglingStatus: boolean;
  onToggleByeStatus: (clearDownstream: boolean) => void;
}> = ({ byeEligible, isTogglingStatus, onToggleByeStatus }) => {
  return (
    <div className="bg-muted/50 border border-border rounded-lg p-3 sm:p-4 space-y-3">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Match Status Control</p>
          <p className="text-xs text-muted-foreground">
            Current Status: <span className="font-semibold">{byeEligible.statusName}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {byeEligible.currentStatus === 4 ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleByeStatus(false)}
                disabled={isTogglingStatus}
                className="border-blue-600 text-blue-600 hover:bg-blue-50 w-full sm:w-auto text-xs sm:text-sm"
              >
                {isTogglingStatus ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <span className="mr-2">🔄</span>
                )}
                Reopen (Safe)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onToggleByeStatus(true)}
                disabled={isTogglingStatus}
                className="border-red-600 text-red-600 hover:bg-red-50 w-full sm:w-auto text-xs sm:text-sm"
              >
                {isTogglingStatus ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <span className="mr-2">⚠️</span>
                )}
                Reopen + Clear Downstream
              </Button>
            </>
          ) : byeEligible.currentStatus !== 2 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleByeStatus(false)}
              disabled={isTogglingStatus}
              className="border-green-600 text-green-600 hover:bg-green-50 w-full sm:w-auto text-xs sm:text-sm"
            >
              {isTogglingStatus ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <span className="mr-2">🔓</span>
              )}
              Unlock to Ready
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggleByeStatus(false)}
              disabled={isTogglingStatus}
              className="border-amber-600 text-amber-600 hover:bg-amber-50 w-full sm:w-auto text-xs sm:text-sm"
            >
              {isTogglingStatus ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <span className="mr-2">🔒</span>
              )}
              Revert to Waiting
            </Button>
          )}
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {byeEligible.currentStatus === 4 ? (
          <div className="space-y-1">
            <p className="text-destructive font-medium">
              ⚠️ This match is marked as Completed but has no winner (zombie state).
            </p>
            <p>
              <strong>Reopen (Safe)</strong>: Only works if downstream matches haven't been
              populated yet.
            </p>
            <p>
              <strong>Reopen + Clear Downstream</strong>: Nullifies all downstream matches. Use with
              caution!
            </p>
          </div>
        ) : byeEligible.currentStatus !== 2 ? (
          <p>
            ⚠️ This BYE match is currently locked. Click "Unlock to Ready" to enable score entry.
          </p>
        ) : (
          <p>✅ Match is ready. You can now enter scores below or revert if needed.</p>
        )}
      </div>
    </div>
  );
};
