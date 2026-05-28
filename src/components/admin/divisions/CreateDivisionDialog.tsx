import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    const numericWeight = Number(weight);
    if (!trimmed) return setError('Name is required');
    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      return setError('Weight must be a positive number');
    }
    await createDivision.mutateAsync({
      name: trimmed,
      display_division: displayDivision,
      division_weight: numericWeight,
    });
    reset();
    onOpenChange(false);
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
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="division-name">Name</Label>
            <Input
              id="division-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Competitive High"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="display-division">Display Division</Label>
            <Select
              value={displayDivision}
              onValueChange={(v) => setDisplayDivision(v as DisplayDivision)}
            >
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
          <div className="space-y-2">
            <Label htmlFor="division-weight">Weight</Label>
            <Input
              id="division-weight"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Higher weights mean stronger divisions (e.g. 1.0 = top, 0.7 = weakest).
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={createDivision.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createDivision.isPending}>
              {createDivision.isPending ? 'Creating…' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDivisionDialog;