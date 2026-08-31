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

interface EditBracketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bracket: PlayoffBracket;
}

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

  const hasStarted = bracket.state !== 'pending';
  const trimmedTitle = title.trim();
  const isUnchanged =
    trimmedTitle === (bracket.name ?? '') && divisionId === (bracket.divisionId ?? '');

  const handleSave = () => {
    if (!trimmedTitle) return;

    updateBracket.mutate(
      hasStarted
        ? { title: trimmedTitle }
        : { title: trimmedTitle, division_id: divisionId || null },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Bracket</DialogTitle>
          <DialogDescription>
            Change the bracket&apos;s name{hasStarted ? '' : ' and division'}. To change which teams
            are in it, use <strong>Update Seeding</strong> or <strong>Rearrange Teams</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="bracket-title">Bracket name</Label>
            <Input
              id="bracket-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bracket name"
            />
            {!trimmedTitle && (
              <p className="text-sm text-destructive">Enter a name for the bracket.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bracket-division">Division</Label>
            <Select value={divisionId} onValueChange={setDivisionId} disabled={hasStarted}>
              <SelectTrigger id="bracket-division">
                <SelectValue placeholder="Select a division" />
              </SelectTrigger>
              <SelectContent>
                {(divisions ?? []).map((division) => (
                  <SelectItem key={division.id} value={division.id}>
                    {division.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasStarted && (
              <p className="text-sm text-muted-foreground">
                This bracket has started, so it cannot be moved to another division. Its teams would
                be left behind.
              </p>
            )}
          </div>
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
