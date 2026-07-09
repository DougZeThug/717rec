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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change game {gameNumber} winner</DialogTitle>
          <DialogDescription>
            Current totals: {team1.name} {totals.team1}, {team2.name} {totals.team2}. Choose the
            correct winner. This does not change the finalized match result; if the match is already
            finalized, reopen it first from the live view.
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
