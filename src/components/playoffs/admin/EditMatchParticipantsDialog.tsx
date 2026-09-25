import { AlertTriangle, ArrowLeftRight, Loader2 } from 'lucide-react';
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
import { usePlayoffEditMatchParticipants } from '@/hooks/playoffs/usePlayoffEditMatchParticipants';
import { Team } from '@/types';

interface TeamSelectProps {
  id: string;
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  teams: Team[];
}

const TeamSelect: React.FC<TeamSelectProps> = ({ id, label, value, onChange, teams }) => (
  <div className="space-y-2">
    <Label htmlFor={id}>{label}</Label>
    <Select value={value ?? undefined} onValueChange={(v) => onChange(v)}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Select team" />
      </SelectTrigger>
      <SelectContent>
        {teams.map((team) => (
          <SelectItem key={team.id} value={team.id}>
            {team.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

interface EditMatchParticipantsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bracketId: string | null;
  matchId: number | null;
  currentTeam1Id: string | null;
  currentTeam2Id: string | null;
  /** Participant ids the match held when the editor loaded — the save's staleness check. */
  expectedOpponent1Id: number | null;
  expectedOpponent2Id: number | null;
  teams: Team[];
}

const EditMatchParticipantsDialog: React.FC<EditMatchParticipantsDialogProps> = ({
  open,
  onOpenChange,
  bracketId,
  matchId,
  currentTeam1Id,
  currentTeam2Id,
  expectedOpponent1Id,
  expectedOpponent2Id,
  teams,
}) => {
  const [team1Id, setTeam1Id] = useState<string | null>(currentTeam1Id);
  const [team2Id, setTeam2Id] = useState<string | null>(currentTeam2Id);

  const mutation = usePlayoffEditMatchParticipants(bracketId);

  // Re-sync selections whenever the dialog opens on a new match
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state from incoming props/derived values
      setTeam1Id(currentTeam1Id);
      setTeam2Id(currentTeam2Id);
    }
  }, [open, currentTeam1Id, currentTeam2Id]);

  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

  const handleSave = () => {
    if (matchId === null || team1Id === null || team2Id === null) return;
    mutation.mutate(
      {
        matchId,
        opponent1: { kind: 'team', teamId: team1Id },
        opponent2: { kind: 'team', teamId: team2Id },
        expectedOpponent1Id,
        expectedOpponent2Id,
      },
      {
        onSuccess: () => onOpenChange(false),
      }
    );
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const isSaving = mutation.isPending;
  const noChange = team1Id === currentTeam1Id && team2Id === currentTeam2Id;
  const incomplete = team1Id === null || team2Id === null;
  const bothSame = team1Id !== null && team2Id !== null && team1Id === team2Id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="size-5" />
            Edit Matchup Teams
          </DialogTitle>
          <DialogDescription>
            Change the teams in this first-round matchup. Only available before the match is played.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <TeamSelect
            id="edit-match-opp1"
            label="Opponent 1"
            value={team1Id}
            onChange={setTeam1Id}
            teams={sortedTeams}
          />
          <TeamSelect
            id="edit-match-opp2"
            label="Opponent 2"
            value={team2Id}
            onChange={setTeam2Id}
            teams={sortedTeams}
          />

          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p>
              A team that is already in another match can't be picked. Later rounds fill in
              automatically as this match is played.
            </p>
          </div>

          {bothSame && (
            <p className="text-sm text-destructive">
              Opponent 1 and Opponent 2 cannot be the same team.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || noChange || incomplete || bothSame}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditMatchParticipantsDialog;
