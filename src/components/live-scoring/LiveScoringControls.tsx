import { Undo2 } from 'lucide-react';
import React from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

interface LiveScoringControlsProps {
  canUndo: boolean;
  isUndoing: boolean;
  lastRoundLabel: string | null;
  onUndo: () => void;
  soundEnabled: boolean;
  onSoundEnabledChange: (enabled: boolean) => void;
}

type UndoRoundDialogProps = Pick<
  LiveScoringControlsProps,
  'canUndo' | 'isUndoing' | 'lastRoundLabel' | 'onUndo'
>;

const UndoRoundDialog: React.FC<UndoRoundDialogProps> = ({
  canUndo,
  isUndoing,
  lastRoundLabel,
  onUndo,
}) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-[44px] gap-1.5"
        disabled={!canUndo || isUndoing}
      >
        <Undo2 className="size-4" aria-hidden />
        {isUndoing ? 'Undoing…' : 'Undo last round'}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Undo last round?</AlertDialogTitle>
        <AlertDialogDescription>
          {lastRoundLabel
            ? `This removes ${lastRoundLabel} from the game. You can re-enter it afterwards.`
            : 'This removes the most recent round from the game.'}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Keep round</AlertDialogCancel>
        <AlertDialogAction onClick={onUndo}>Undo round</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export const LiveScoringControls: React.FC<LiveScoringControlsProps> = ({
  canUndo,
  isUndoing,
  lastRoundLabel,
  onUndo,
  soundEnabled,
  onSoundEnabledChange,
}) => (
  <div className="flex items-center justify-between gap-3">
    <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-muted-foreground">
      <Switch checked={soundEnabled} onCheckedChange={onSoundEnabledChange} />
      Sound
    </label>
    <UndoRoundDialog
      canUndo={canUndo}
      isUndoing={isUndoing}
      lastRoundLabel={lastRoundLabel}
      onUndo={onUndo}
    />
  </div>
);
