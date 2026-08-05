import { AlertTriangle, Loader2, Shuffle } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

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
import {
  useLoserSwapEligibility,
  usePlayoffSwapLoserSlots,
} from '@/hooks/playoffs/usePlayoffLoserSwap';
import type { LoserSwapSlot } from '@/services/brackets/manager/services/BracketAdmin/swap';

interface SwapLoserSlotsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bracketId: string | null;
  matchId: number | null;
}

const slotKey = (slot: LoserSwapSlot): string => `${slot.matchId}:${slot.side}`;

const candidateLabel = (slot: LoserSwapSlot): string =>
  slot.isBye
    ? `Match ${slot.matchNumber}: take the BYE spot (advances automatically)`
    : `Match ${slot.matchNumber}: swap with ${slot.participantName ?? 'Unknown team'}`;

/**
 * Admin dialog: move a team from this losers-bracket match into another match
 * of the same round — either trading places with the team there, or taking a
 * BYE spot. Exists because the bracket library assigns losers-bracket matchups
 * automatically, and the league sometimes seeds them differently on the court.
 */
const SwapLoserSlotsDialog: React.FC<SwapLoserSlotsDialogProps> = ({
  open,
  onOpenChange,
  bracketId,
  matchId,
}) => {
  const { data: eligibility, isLoading } = useLoserSwapEligibility(open ? matchId : null);
  const mutation = usePlayoffSwapLoserSlots(bracketId);

  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);
  const [selectedCandidateKey, setSelectedCandidateKey] = useState<string | null>(null);

  const slots = useMemo(() => (eligibility?.ok ? (eligibility.slots ?? []) : []), [eligibility]);
  const selectedSlot = slots.find((slot) => slotKey(slot) === selectedSlotKey) ?? null;

  // A team whose match partner is a BYE cannot take another BYE spot — that
  // would leave its old match with two BYEs. The service refuses it; don't
  // offer it.
  const candidates = (eligibility?.ok ? (eligibility.candidates ?? []) : []).filter(
    (candidate) => !(candidate.isBye && selectedSlot?.partnerIsBye)
  );
  const selectedCandidate =
    candidates.find((candidate) => slotKey(candidate) === selectedCandidateKey) ?? null;

  // Reset the picks each time the dialog opens on a (possibly different) match,
  // preselecting the moving team when there is only one choice.
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state from incoming props/derived values
      setSelectedSlotKey(null);
      setSelectedCandidateKey(null);
    }
  }, [open, matchId]);

  useEffect(() => {
    if (open && slots.length === 1 && selectedSlotKey === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state from incoming props/derived values
      setSelectedSlotKey(slotKey(slots[0]));
    }
  }, [open, slots, selectedSlotKey]);

  const handleSave = () => {
    if (matchId === null || !selectedSlot || !selectedCandidate) return;
    mutation.mutate(
      {
        sourceMatchId: selectedSlot.matchId,
        sourceSide: selectedSlot.side,
        targetMatchId: selectedCandidate.matchId,
        targetSide: selectedCandidate.side,
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  const isSaving = mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="size-5" />
            Move Team to Another Match
          </DialogTitle>
          <DialogDescription>
            Move a team from this losers-bracket match into another match of the same round.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : !eligibility?.ok ? (
          <p className="py-2 text-sm text-muted-foreground">
            {eligibility?.reason ?? 'This match cannot swap teams right now.'}
          </p>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="swap-team">Which team do you want to move?</Label>
              <Select value={selectedSlotKey ?? ''} onValueChange={setSelectedSlotKey}>
                <SelectTrigger id="swap-team">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent>
                  {slots.map((slot) => (
                    <SelectItem key={slotKey(slot)} value={slotKey(slot)}>
                      {slot.participantName ?? 'Unknown team'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="swap-destination">Where should they go?</Label>
              <Select
                value={selectedCandidateKey ?? ''}
                onValueChange={setSelectedCandidateKey}
                disabled={!selectedSlot}
              >
                <SelectTrigger id="swap-destination">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((candidate) => (
                    <SelectItem key={slotKey(candidate)} value={slotKey(candidate)}>
                      {candidateLabel(candidate)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-4 flex-shrink-0" />
              <p>
                BYEs and automatic advancements update along with the move: a team left without an
                opponent advances automatically, and a team pulled off a BYE has its automatic
                advancement undone.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !eligibility?.ok || !selectedSlot || !selectedCandidate}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Moving...
              </>
            ) : (
              'Move Team'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SwapLoserSlotsDialog;
