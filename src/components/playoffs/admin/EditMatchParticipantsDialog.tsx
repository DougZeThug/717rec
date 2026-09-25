import { ArrowLeftRight, Loader2 } from 'lucide-react';
import React, { useState } from 'react';

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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEditTeamsOptions, useEditTeamsPreview } from '@/hooks/playoffs/useEditTeams';
import { usePlayoffEditMatchParticipants } from '@/hooks/playoffs/usePlayoffEditMatchParticipants';
import type { EditTeamsOptions } from '@/services/brackets/manager/services/BracketAdmin/editTeams/options';
import type { EditTeamsPreview } from '@/services/brackets/manager/services/BracketAdmin/editTeams/preview';
import type {
  EditMatchTeamsParams,
  TeamChoice,
} from '@/services/brackets/manager/services/BracketAdmin/editTeams/types';

const BYE_VALUE = '__bye__';

type Side = 'opponent1' | 'opponent2';
type Picks = Record<Side, string>;
type Candidate = EditTeamsOptions['candidates'][number];

const SIDE_LABEL: Record<Side, string> = { opponent1: 'Team 1', opponent2: 'Team 2' };

/** The picks the screen opens with: who is in the match now ('' for an empty spot). */
const initialPicks = (options: EditTeamsOptions): Picks => {
  const valueOf = (slot: EditTeamsOptions['slots'][number]) =>
    slot.kind === 'bye' ? BYE_VALUE : (slot.teamId ?? '');
  return { opponent1: valueOf(options.slots[0]), opponent2: valueOf(options.slots[1]) };
};

const choiceOf = (value: string): TeamChoice =>
  value === BYE_VALUE ? { kind: 'bye' } : { kind: 'team', teamId: value };

const toParams = (
  matchId: number,
  picks: Picks,
  options: EditTeamsOptions
): EditMatchTeamsParams => ({
  matchId,
  opponent1: choiceOf(picks.opponent1),
  opponent2: choiceOf(picks.opponent2),
  expectedOpponent1Id: options.expectedOpponent1Id,
  expectedOpponent2Id: options.expectedOpponent2Id,
  expectedPickLocations: options.expectedPickLocations,
});

/** What stops the picks from being reviewed yet, or null. */
function pickProblem(picks: Picks, initial: Picks): string | null {
  if (!picks.opponent1 || !picks.opponent2) return 'Pick a team or a BYE for both sides.';
  if (picks.opponent1 === BYE_VALUE && picks.opponent2 === BYE_VALUE) {
    return 'A match needs at least one team.';
  }
  if (picks.opponent1 === picks.opponent2) return "A team can't be on both sides of a match.";
  if (picks.opponent1 === initial.opponent1 && picks.opponent2 === initial.opponent2) {
    return 'Nothing has changed yet.';
  }
  return null;
}

interface TeamSelectProps {
  side: Side;
  value: string;
  otherValue: string;
  candidates: Candidate[];
  onChange: (value: string) => void;
}

/** One side's picker: a BYE, then every league team grouped by how it can be picked. */
const TeamSelect: React.FC<TeamSelectProps> = ({
  side,
  value,
  otherValue,
  candidates,
  onChange,
}) => {
  const groups: { label: string; items: Candidate[] }[] = [
    { label: 'In this match', items: candidates.filter((c) => c.group === 'here') },
    {
      label: 'In another round 1 match — picking one trades places',
      items: candidates.filter((c) => c.group === 'trade'),
    },
    {
      label: 'Not in a match',
      items: candidates.filter((c) => c.group === 'available' && c.sameDivision),
    },
    {
      label: 'Not in a match — other divisions',
      items: candidates.filter((c) => c.group === 'available' && !c.sameDivision),
    },
    { label: "Can't be picked", items: candidates.filter((c) => c.group === 'taken') },
  ];
  const itemText = (candidate: Candidate) => {
    if (candidate.group === 'trade') return `${candidate.name} (${candidate.where})`;
    if (candidate.group === 'taken') {
      return `${candidate.name} — ${candidate.where}${candidate.reason ? `, which ${candidate.reason}` : ''}`;
    }
    return candidate.name;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={`edit-teams-${side}`}>{SIDE_LABEL[side]}</Label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger id={`edit-teams-${side}`}>
          <SelectValue placeholder="Pick a team or a BYE" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={BYE_VALUE} disabled={otherValue === BYE_VALUE}>
            BYE (no opponent)
          </SelectItem>
          {groups
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <SelectGroup key={group.label}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.items.map((candidate) => (
                  <SelectItem
                    key={candidate.teamId}
                    value={candidate.teamId}
                    disabled={candidate.group === 'taken'}
                  >
                    {itemText(candidate)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
};

const Spinner: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="size-8 animate-spin" />
  </div>
);

interface ReviewStepProps {
  preview: EditTeamsPreview | undefined;
  loading: boolean;
  saving: boolean;
  onBack: () => void;
  onSave: () => void;
}

/** The review step: the admin's changes and what follows, or why the save is refused. */
const ReviewStep: React.FC<ReviewStepProps> = ({ preview, loading, saving, onBack, onSave }) => (
  <>
    {loading || !preview ? (
      <Spinner />
    ) : preview.ok ? (
      <div className="space-y-4 text-sm">
        <div className="space-y-1">
          <p className="font-medium">Your changes</p>
          <ul className="list-disc space-y-1 pl-5">
            {preview.changes.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="space-y-1">
          <p className="font-medium">What happens automatically</p>
          {preview.consequences.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5">
              {preview.consequences.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Nothing else changes.</p>
          )}
        </div>
      </div>
    ) : (
      <div className="space-y-1 text-sm text-destructive">
        {preview.problems.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    )}
    <DialogFooter>
      <Button variant="outline" onClick={onBack} disabled={saving}>
        Back
      </Button>
      <Button onClick={onSave} disabled={!preview?.ok || saving}>
        {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
        Save
      </Button>
    </DialogFooter>
  </>
);

interface EditTeamsBodyProps {
  bracketId: string | null;
  matchId: number;
  onDone: () => void;
}

/**
 * Mounted only while the dialog is open, so each open reads fresh options
 * (and a fresh concurrency token) and starts from the match as it is now.
 */
const EditTeamsBody: React.FC<EditTeamsBodyProps> = ({ bracketId, matchId, onDone }) => {
  const { data: options, isLoading, error } = useEditTeamsOptions(matchId);
  const [edited, setEdited] = useState<Picks | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const mutation = usePlayoffEditMatchParticipants(bracketId);

  const initial = options ? initialPicks(options) : null;
  const picks = edited ?? initial;
  const params = reviewing && options && picks ? toParams(matchId, picks, options) : null;
  const { data: preview, isLoading: previewLoading } = useEditTeamsPreview(params);

  if (isLoading) return <Spinner />;
  if (error || !options || !picks || !initial) {
    return <p className="text-sm text-destructive">Could not load this match. Please try again.</p>;
  }
  if (!options.ok) {
    return (
      <>
        <p className="text-sm text-muted-foreground">{options.reason}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onDone}>
            Close
          </Button>
        </DialogFooter>
      </>
    );
  }

  const problem = pickProblem(picks, initial);
  const setPick = (side: Side) => (value: string) => setEdited({ ...picks, [side]: value });

  if (reviewing) {
    return (
      <ReviewStep
        preview={preview}
        loading={previewLoading}
        saving={mutation.isPending}
        onBack={() => setReviewing(false)}
        onSave={() => params && mutation.mutate(params, { onSuccess: onDone })}
      />
    );
  }

  return (
    <>
      <div className="space-y-4 py-2">
        <TeamSelect
          side="opponent1"
          value={picks.opponent1}
          otherValue={picks.opponent2}
          candidates={options.candidates}
          onChange={setPick('opponent1')}
        />
        <TeamSelect
          side="opponent2"
          value={picks.opponent2}
          otherValue={picks.opponent1}
          candidates={options.candidates}
          onChange={setPick('opponent2')}
        />
        {problem && picks !== initial && <p className="text-sm text-muted-foreground">{problem}</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={() => setReviewing(true)} disabled={problem !== null}>
          Review changes…
        </Button>
      </DialogFooter>
    </>
  );
};

interface EditMatchParticipantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bracketId: string | null;
  matchId: number | null;
}

/**
 * Admin: change who plays in a winners-bracket round 1 match — a team, a BYE,
 * or a team from another round 1 match (the two trade places). A review step
 * lists the admin's changes and everything that happens automatically before
 * anything is saved.
 */
const EditMatchParticipantsDialog: React.FC<EditMatchParticipantsDialogProps> = ({
  open,
  onOpenChange,
  bracketId,
  matchId,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ArrowLeftRight className="size-5" />
          Edit teams
        </DialogTitle>
        <DialogDescription>
          Change who plays in this first-round match. Round 2 and the losers bracket update by
          themselves.
        </DialogDescription>
      </DialogHeader>
      {open && matchId !== null && (
        <EditTeamsBody bracketId={bracketId} matchId={matchId} onDone={() => onOpenChange(false)} />
      )}
    </DialogContent>
  </Dialog>
);

export default EditMatchParticipantsDialog;
