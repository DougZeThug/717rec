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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUpdateBracket } from '@/hooks/playoffs/useUpdateBracket';
import { useDivisions } from '@/hooks/useDivisions';
import type { PlayoffBracket } from '@/utils/playoffs/playoffTypes';
import { hasPlayStarted } from '@/utils/playoffs/playoffUtils';

interface EditBracketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bracket: PlayoffBracket;
}

const EditBracketHeader = ({ canEditDivision }: { canEditDivision: boolean }) => (
  <DialogHeader>
    <DialogTitle>Edit Bracket</DialogTitle>
    <DialogDescription>
      Change the bracket&apos;s name{canEditDivision ? ' and division' : ''}. To change which teams
      are in it, use <strong>Update Seeding</strong> or <strong>Rearrange Teams</strong>.
    </DialogDescription>
  </DialogHeader>
);

const NameField = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
  <div className="space-y-2">
    <Label htmlFor="bracket-title">Bracket name</Label>
    <Input
      id="bracket-title"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Bracket name"
    />
    {!value.trim() && <p className="text-sm text-destructive">Enter a name for the bracket.</p>}
  </div>
);

/**
 * Every division a bracket may be filed under.
 *
 * The seeded "Hidden" division is left out. The playoffs page drops it from
 * every division list, so a bracket moved there disappears from the bracket
 * list with no way back to it. The Create-bracket form skips it the same way.
 */
const selectableDivisions = <T extends { name: string; display_division?: string }>(
  divisions: T[]
): T[] => divisions.filter((division) => (division.display_division || division.name) !== 'Hidden');

const DivisionField = ({
  value,
  onChange,
  divisions,
  locked,
}: {
  value: string;
  onChange: (value: string) => void;
  divisions: { id: string; name: string }[];
  locked: boolean;
}) => (
  <div className="space-y-2">
    <Label htmlFor="bracket-division">Division</Label>
    <Select value={value} onValueChange={onChange} disabled={locked}>
      <SelectTrigger id="bracket-division">
        <SelectValue placeholder="Select a division" />
      </SelectTrigger>
      <SelectContent>
        {divisions.map((division) => (
          <SelectItem key={division.id} value={division.id}>
            {division.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {locked && (
      <p className="text-sm text-muted-foreground">
        A match has already been played, so this bracket cannot be moved to another division. Its
        teams would be left behind.
      </p>
    )}
  </div>
);

/**
 * Edit a bracket that already exists.
 *
 * The title can always be changed. The division can only be changed before the
 * bracket starts: once a match has been played, moving the bracket would leave
 * its teams behind in the old division. Teams, format, and size are not
 * editable at all — they define the generated match tree. Use Update Seeding or
 * Rearrange Teams for those.
 */
const EditBracketDialog: React.FC<EditBracketDialogProps> = ({ open, onOpenChange, bracket }) => {
  const { divisions } = useDivisions();
  const updateBracket = useUpdateBracket(bracket.id);

  // BracketDetail mounts this component only while the dialog is open, so the
  // form starts from the bracket's current values every time it is opened.
  const [title, setTitle] = useState(bracket.name ?? '');
  const [divisionId, setDivisionId] = useState(bracket.divisionId ?? '');

  const hasStarted = bracket.state !== 'pending' || hasPlayStarted(bracket.matches);
  const trimmedTitle = title.trim();
  const divisionChanged = divisionId !== (bracket.divisionId ?? '');
  const isUnchanged = trimmedTitle === (bracket.name ?? '') && !divisionChanged;

  const handleSave = () => {
    if (!trimmedTitle) return;

    // Send the division only when the admin actually changed it. Sending it
    // unasked would clear the bracket's division if this dialog were ever
    // opened on data that did not carry one.
    const canRefile = !hasStarted && divisionChanged && divisionId;

    updateBracket.mutate(
      canRefile ? { title: trimmedTitle, division_id: divisionId } : { title: trimmedTitle },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <EditBracketHeader canEditDivision={!hasStarted} />

        <div className="space-y-4 py-2">
          <NameField value={title} onChange={setTitle} />
          <DivisionField
            value={divisionId}
            onChange={setDivisionId}
            divisions={selectableDivisions(divisions ?? [])}
            locked={hasStarted}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!trimmedTitle || isUnchanged || updateBracket.isPending}
          >
            {updateBracket.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditBracketDialog;
