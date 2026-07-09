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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Tables } from '@/integrations/supabase/types';
import type { UpdateRoundPatch } from '@/services/liveScoring/AdminCorrectionsService';
import { validateBreakdown } from '@/utils/liveScoring/bagBreakdown';
import { isValidRoundScore } from '@/utils/liveScoring/scoring';

type MatchRoundRow = Tables<'match_rounds'>;
type GamePlayerRow = Tables<'game_players'>;
type TeamPlayerRow = Tables<'team_players'>;

export interface EditRoundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  round: MatchRoundRow;
  team1Name: string;
  team2Name: string;
  team1Players: (GamePlayerRow & { display_name?: string })[];
  team2Players: (GamePlayerRow & { display_name?: string })[];
  rosterById: Map<string, TeamPlayerRow>;
  onSubmit: (patch: UpdateRoundPatch) => Promise<void> | void;
  isSubmitting: boolean;
}

interface SideState {
  score: string;
  bagsIn: string;
  bagsOn: string;
  bagsOff: string;
  throwerId: string;
}

const toSide = (
  score: number,
  bagsIn: number | null,
  bagsOn: number | null,
  bagsOff: number | null,
  throwerId: string | null
): SideState => ({
  score: String(score),
  bagsIn: bagsIn == null ? '' : String(bagsIn),
  bagsOn: bagsOn == null ? '' : String(bagsOn),
  bagsOff: bagsOff == null ? '' : String(bagsOff),
  throwerId: throwerId ?? '',
});

const NULL_THROWER = '__none__';

export const EditRoundDialog: React.FC<EditRoundDialogProps> = ({
  open,
  onOpenChange,
  round,
  team1Name,
  team2Name,
  team1Players,
  team2Players,
  rosterById,
  onSubmit,
  isSubmitting,
}) => {
  const [side1, setSide1] = useState<SideState>(() =>
    toSide(
      round.team1_score,
      round.team1_bags_in,
      round.team1_bags_on,
      round.team1_bags_off,
      round.team1_thrower_id
    )
  );
  const [side2, setSide2] = useState<SideState>(() =>
    toSide(
      round.team2_score,
      round.team2_bags_in,
      round.team2_bags_on,
      round.team2_bags_off,
      round.team2_thrower_id
    )
  );

  useEffect(() => {
    if (open) {
      setSide1(
        toSide(
          round.team1_score,
          round.team1_bags_in,
          round.team1_bags_on,
          round.team1_bags_off,
          round.team1_thrower_id
        )
      );
      setSide2(
        toSide(
          round.team2_score,
          round.team2_bags_in,
          round.team2_bags_on,
          round.team2_bags_off,
          round.team2_thrower_id
        )
      );
    }
  }, [open, round]);

  const validation = useMemo(() => {
    const s1 = Number(side1.score);
    const s2 = Number(side2.score);
    if (!isValidRoundScore(s1)) return { ok: false, message: `${team1Name} score is invalid` };
    if (!isValidRoundScore(s2)) return { ok: false, message: `${team2Name} score is invalid` };
    const hasBags1 = side1.bagsIn !== '' || side1.bagsOn !== '' || side1.bagsOff !== '';
    if (hasBags1) {
      const b = {
        bagsIn: Number(side1.bagsIn),
        bagsOn: Number(side1.bagsOn),
        bagsOff: Number(side1.bagsOff),
      };
      if (!validateBreakdown(s1, b))
        return { ok: false, message: `${team1Name} bag breakdown doesn't add up` };
    }
    const hasBags2 = side2.bagsIn !== '' || side2.bagsOn !== '' || side2.bagsOff !== '';
    if (hasBags2) {
      const b = {
        bagsIn: Number(side2.bagsIn),
        bagsOn: Number(side2.bagsOn),
        bagsOff: Number(side2.bagsOff),
      };
      if (!validateBreakdown(s2, b))
        return { ok: false, message: `${team2Name} bag breakdown doesn't add up` };
    }
    return { ok: true, message: '' };
  }, [side1, side2, team1Name, team2Name]);

  const playerLabel = (gp: GamePlayerRow) =>
    rosterById.get(gp.player_id)?.display_name ?? 'Unknown player';

  const handleSubmit = async () => {
    if (!validation.ok) return;
    const s1 = Number(side1.score);
    const s2 = Number(side2.score);
    const patch: UpdateRoundPatch = {
      team1Score: s1,
      team2Score: s2,
      team1ThrowerId: side1.throwerId === '' || side1.throwerId === NULL_THROWER
        ? null
        : side1.throwerId,
      team2ThrowerId: side2.throwerId === '' || side2.throwerId === NULL_THROWER
        ? null
        : side2.throwerId,
    };
    if (side1.bagsIn !== '' && side1.bagsOn !== '' && side1.bagsOff !== '') {
      patch.team1Bags = {
        bagsIn: Number(side1.bagsIn),
        bagsOn: Number(side1.bagsOn),
        bagsOff: Number(side1.bagsOff),
      };
    }
    if (side2.bagsIn !== '' && side2.bagsOn !== '' && side2.bagsOff !== '') {
      patch.team2Bags = {
        bagsIn: Number(side2.bagsIn),
        bagsOn: Number(side2.bagsOn),
        bagsOff: Number(side2.bagsOff),
      };
    }
    await onSubmit(patch);
  };

  const renderSide = (
    side: SideState,
    setSide: React.Dispatch<React.SetStateAction<SideState>>,
    teamName: string,
    players: GamePlayerRow[],
    idPrefix: string
  ) => (
    <div className="space-y-3">
      <div className="font-medium text-sm">{teamName}</div>
      <div className="grid grid-cols-4 gap-2">
        <div>
          <Label htmlFor={`${idPrefix}-score`}>Score</Label>
          <Input
            id={`${idPrefix}-score`}
            type="number"
            inputMode="numeric"
            value={side.score}
            onChange={(e) => setSide((s) => ({ ...s, score: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-in`}>In</Label>
          <Input
            id={`${idPrefix}-in`}
            type="number"
            inputMode="numeric"
            value={side.bagsIn}
            onChange={(e) => setSide((s) => ({ ...s, bagsIn: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-on`}>On</Label>
          <Input
            id={`${idPrefix}-on`}
            type="number"
            inputMode="numeric"
            value={side.bagsOn}
            onChange={(e) => setSide((s) => ({ ...s, bagsOn: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-off`}>Off</Label>
          <Input
            id={`${idPrefix}-off`}
            type="number"
            inputMode="numeric"
            value={side.bagsOff}
            onChange={(e) => setSide((s) => ({ ...s, bagsOff: e.target.value }))}
          />
        </div>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-thrower`}>Thrower</Label>
        <Select
          value={side.throwerId === '' ? NULL_THROWER : side.throwerId}
          onValueChange={(v) => setSide((s) => ({ ...s, throwerId: v }))}
        >
          <SelectTrigger id={`${idPrefix}-thrower`}>
            <SelectValue placeholder="Select thrower" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NULL_THROWER}>Unassigned</SelectItem>
            {players.map((gp) => (
              <SelectItem key={gp.player_id} value={gp.player_id}>
                {playerLabel(gp)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit round {round.round_number}</DialogTitle>
          <DialogDescription>
            Fix a wrong score, bag breakdown, or thrower. Leave bag counts blank to leave them
            unset.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {renderSide(side1, setSide1, team1Name, team1Players, 'team1')}
          {renderSide(side2, setSide2, team2Name, team2Players, 'team2')}
        </div>

        {!validation.ok && (
          <p className="text-sm text-destructive" role="alert">
            {validation.message}
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!validation.ok || isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};