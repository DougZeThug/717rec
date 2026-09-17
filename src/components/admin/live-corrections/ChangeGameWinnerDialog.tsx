import { AlertTriangle } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DEFAULT_GAME_RULES } from '@/utils/liveScoring/rules';
import { checkGameWinner } from '@/utils/liveScoring/winnerDetection';

export interface ChangeGameWinnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameNumber: number;
  team1: { id: string; name: string };
  team2: { id: string; name: string };
  currentWinnerId: string | null;
  totals: { team1: number; team2: number };
  onConfirm: (winnerTeamId: string) => Promise<void> | void;
  isSubmitting: boolean;
}

export const ChangeGameWinnerDialog: React.FC<ChangeGameWinnerDialogProps> = ({
  open,
  onOpenChange,
  gameNumber,
  team1,
  team2,
  currentWinnerId,
  totals,
  onConfirm,
  isSubmitting,
}) => {
  const [winnerId, setWinnerId] = useState<string>(currentWinnerId ?? team1.id);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form to the newly opened game
    if (open) setWinnerId(currentWinnerId ?? team1.id);
  }, [open, currentWinnerId, team1.id]);

  /**
   * Whether the rounds underneath support the winner being chosen.
   *
   * Setting a winner the rounds do not give the game to is allowed on purpose —
   * an admin correcting a real-world result often sets the winner first and
   * fixes the rounds after. It is not refused here. But nothing used to say the
   * two now disagree, and the same press also rewrites the game's score to these
   * totals, which is what keeps the stale-score check quiet afterwards. Saying
   * so before the press is the whole of this warning.
   */
  const chosenSide = winnerId === team2.id ? 2 : 1;
  const roundsGiveItTo = checkGameWinner(totals.team1, totals.team2);
  const roundsDisagree = roundsGiveItTo !== chosenSide;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change game {gameNumber} winner</DialogTitle>
          <DialogDescription>
            Current totals: {team1.name} {totals.team1}, {team2.name} {totals.team2}. Choose the
            correct winner. This changes the game only. On a finalized match, finish with
            &quot;Reopen &amp; re-save result&quot; so the official result follows.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="winner-select">Winner</Label>
          <Select value={winnerId} onValueChange={setWinnerId}>
            <SelectTrigger id="winner-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={team1.id}>{team1.name}</SelectItem>
              <SelectItem value={team2.id}>{team2.name}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {roundsDisagree && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {roundsGiveItTo === null
                ? `The rounds do not decide this game. No side has reached ${DEFAULT_GAME_RULES.targetScore} with a lead of ${DEFAULT_GAME_RULES.winBy}.`
                : `The rounds give this game to ${roundsGiveItTo === 1 ? team1.name : team2.name}.`}{' '}
              You can still set this winner. League Night Status will list the match under
              &quot;Matches that disagree with their rounds&quot; until the rounds and the result
              agree.
            </span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(winnerId)} disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Set winner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
