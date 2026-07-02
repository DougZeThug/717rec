import { Pencil, Save, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDivisionMutations } from '@/hooks/useDivisionMutations';
import type { DisplayDivision } from '@/services/DivisionService';
import { getDivisionStyles } from '@/styles/design-system/divisions';

interface DivisionItem {
  id: string;
  name: string;
  division_weight: number;
  display_division: string;
}

const DISPLAY_OPTIONS: DisplayDivision[] = ['Competitive', 'Intermediate', 'Recreational'];

const normalizeDisplay = (value: string | null | undefined): DisplayDivision => {
  const v = (value ?? '').toLowerCase();
  if (v.includes('competitive')) return 'Competitive';
  if (v.includes('intermediate')) return 'Intermediate';
  return 'Recreational';
};

interface Props {
  division: DivisionItem;
  layout: 'row' | 'card';
}

const DivisionRow: React.FC<Props> = ({ division, layout }) => {
  const { updateDivision, deleteDivision } = useDivisionMutations();
  const isHidden = division.display_division === 'Hidden';
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(division.name);
  const [display, setDisplay] = useState<DisplayDivision>(() =>
    normalizeDisplay(division.display_division)
  );
  const [weight, setWeight] = useState(String(division.division_weight ?? 0));

  const cancel = () => {
    setName(division.name);
    setDisplay(normalizeDisplay(division.display_division));
    setWeight(String(division.division_weight ?? 0));
    setEditing(false);
  };

  const save = () => {
    const trimmed = name.trim();
    const numericWeight = Number(weight);
    if (!trimmed || !Number.isFinite(numericWeight) || numericWeight <= 0) return;
    updateDivision.mutate(
      {
        id: division.id,
        patch: {
          name: trimmed,
          display_division: display,
          division_weight: numericWeight,
        },
      },
      {
        onSuccess: () => setEditing(false),
      }
    );
  };

  const onDelete = () => {
    deleteDivision.mutate(division.id, {
      onSuccess: () => setConfirmDelete(false),
    });
  };

  const displayClass = getDivisionStyles(division.display_division, 'text');

  const editFields = (
    <>
      <Input
        aria-label="Division name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        className="h-10"
      />
      <Select value={display} onValueChange={(v) => setDisplay(v as DisplayDivision)}>
        <SelectTrigger className="h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DISPLAY_OPTIONS.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        className="h-10 tabular-nums"
      />
    </>
  );

  const actions = editing ? (
    <div className="flex gap-2">
      <Button
        size="sm"
        onClick={save}
        disabled={updateDivision.isPending}
        className="flex-1 md:flex-none"
      >
        <Save className="size-4 mr-1" />
        Save
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={cancel}
        disabled={updateDivision.isPending}
        className="flex-1 md:flex-none"
      >
        <X className="size-4 mr-1" />
        Cancel
      </Button>
    </div>
  ) : (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setEditing(true)}
        disabled={isHidden}
        title={isHidden ? 'Hidden divisions cannot be edited' : undefined}
        className="flex-1 md:flex-none"
      >
        <Pencil className="size-4 mr-1" />
        Edit
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setConfirmDelete(true)}
        disabled={isHidden}
        title={isHidden ? 'Hidden divisions cannot be deleted' : undefined}
        className="text-destructive hover:text-destructive flex-1 md:flex-none"
        aria-label={`Delete division ${division.name}`}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );

  if (layout === 'card') {
    return (
      <>
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          {editing ? (
            <div className="space-y-2">{editFields}</div>
          ) : (
            <div className="space-y-1">
              <p className="font-medium text-base">{division.name}</p>
              <div className="flex items-center justify-between text-sm">
                <span className={displayClass}>{division.display_division || '—'}</span>
                <span className="tabular-nums text-muted-foreground">
                  Weight: {division.division_weight}
                </span>
              </div>
            </div>
          )}
          {actions}
        </div>
        <DeleteConfirm
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          name={division.name}
          onConfirm={onDelete}
          pending={deleteDivision.isPending}
        />
      </>
    );
  }

  return (
    <>
      <tr className="border-b border-border">
        <td className="py-3 px-3 align-middle">
          {editing ? (
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
          ) : (
            <span className="font-medium">{division.name}</span>
          )}
        </td>
        <td className="py-3 px-3 align-middle">
          {editing ? (
            <Select value={display} onValueChange={(v) => setDisplay(v as DisplayDivision)}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISPLAY_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className={displayClass}>{division.display_division || '—'}</span>
          )}
        </td>
        <td className="py-3 px-3 align-middle">
          {editing ? (
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-9 w-28 tabular-nums"
            />
          ) : (
            <span className="tabular-nums">{division.division_weight}</span>
          )}
        </td>
        <td className="py-3 px-3 align-middle text-right">{actions}</td>
      </tr>
      <DeleteConfirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        name={division.name}
        onConfirm={onDelete}
        pending={deleteDivision.isPending}
      />
    </>
  );
};

interface DeleteConfirmProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onConfirm: () => void;
  pending: boolean;
}

const DeleteConfirm: React.FC<DeleteConfirmProps> = ({
  open,
  onOpenChange,
  name,
  onConfirm,
  pending,
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete division "{name}"?</AlertDialogTitle>
        <AlertDialogDescription>
          This cannot be undone. Divisions currently assigned to any team or bracket cannot be
          deleted.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={(e) => {
            e.preventDefault();
            onConfirm();
          }}
          disabled={pending}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {pending ? 'Deleting…' : 'Delete'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default DivisionRow;
