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
import { useDivisionMutations } from '@/hooks/useDivisionMutations';
import type { DisplayDivision } from '@/services/DivisionService';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DISPLAY_OPTIONS: DisplayDivision[] = ['Competitive', 'Intermediate', 'Recreational'];

interface DisplayDivisionFieldProps {
  value: DisplayDivision;
  onChange: (value: DisplayDivision) => void;
}

const DisplayDivisionField: React.FC<DisplayDivisionFieldProps> = ({ value, onChange }) => (
  <div className="space-y-2">
    <Label htmlFor="display-division">Display Division</Label>
    <Select value={value} onValueChange={(v) => onChange(v as DisplayDivision)}>
      <SelectTrigger id="display-division">
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
  </div>
);

interface TextFieldProps {
  value: string;
  onChange: (value: string) => void;
}

const NameField: React.FC<TextFieldProps> = ({ value, onChange }) => (
  <div className="space-y-2">
    <Label htmlFor="division-name">Name</Label>
    <Input
      id="division-name"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="e.g. Competitive High"
    />
  </div>
);

const WeightField: React.FC<TextFieldProps> = ({ value, onChange }) => (
  <div className="space-y-2">
    <Label htmlFor="division-weight">Weight</Label>
    <Input
      id="division-weight"
      type="number"
      inputMode="decimal"
      step="0.01"
      min="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    <p className="text-xs text-muted-foreground">
      Higher weights mean stronger divisions (e.g. 1.0 = top, 0.7 = weakest).
    </p>
  </div>
);

interface CreateDivisionFooterProps {
  isPending: boolean;
  onCancel: () => void;
}

const CreateDivisionFooter: React.FC<CreateDivisionFooterProps> = ({ isPending, onCancel }) => (
  <DialogFooter>
    <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
      Cancel
    </Button>
    <Button type="submit" disabled={isPending}>
      {isPending ? 'Creating…' : 'Create'}
    </Button>
  </DialogFooter>
);

const CreateDivisionDialog: React.FC<Props> = ({ open, onOpenChange }) => {
  const { createDivision } = useDivisionMutations();
  const [name, setName] = useState('');
  const [displayDivision, setDisplayDivision] = useState<DisplayDivision>('Recreational');
  const [weight, setWeight] = useState('0.85');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setDisplayDivision('Recreational');
    setWeight('0.85');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    const numericWeight = Number(weight);
    if (!trimmed) {
      setError('Name is required');
      return;
    }
    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      setError('Weight must be a positive number');
      return;
    }
    createDivision.mutate(
      {
        name: trimmed,
        display_division: displayDivision,
        division_weight: numericWeight,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Division</DialogTitle>
          <DialogDescription className="sr-only">
            Name the new division and set how it is ranked.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <NameField value={name} onChange={setName} />
          <DisplayDivisionField value={displayDivision} onChange={setDisplayDivision} />
          <WeightField value={weight} onChange={setWeight} />
          {error && <p className="text-sm text-destructive-text">{error}</p>}
          <CreateDivisionFooter
            isPending={createDivision.isPending}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDivisionDialog;
