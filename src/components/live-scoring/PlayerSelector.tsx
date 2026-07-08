import { UserPlus } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from '@/components/ui/responsive-dialog';
import type { TeamPlayerRow } from '@/services/liveScoring/dbTypes';
import { MAX_PLAYERS_PER_SIDE } from '@/utils/liveScoring/rules';

interface PlayerSelectorProps {
  teamName: string;
  roster: TeamPlayerRow[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onAddPlayer: (name: string) => void;
  isAddingPlayer: boolean;
  disabled?: boolean;
}

export const PlayerSelector: React.FC<PlayerSelectorProps> = ({
  teamName,
  roster,
  selectedIds,
  onChange,
  onAddPlayer,
  isAddingPlayer,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const selectedNames = roster
    .filter((p) => selectedIds.includes(p.id))
    .map((p) => p.display_name);

  const toggle = (playerId: string, checked: boolean) => {
    if (checked) {
      if (selectedIds.length >= MAX_PLAYERS_PER_SIDE) return;
      onChange([...selectedIds, playerId]);
    } else {
      onChange(selectedIds.filter((id) => id !== playerId));
    }
  };

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAddPlayer(trimmed);
    setNewName('');
  };

  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted-foreground">{teamName}</div>
      <Button
        type="button"
        variant="outline"
        className="min-h-[48px] w-full justify-start text-left"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {selectedNames.length > 0 ? selectedNames.join(' & ') : 'Select players…'}
      </Button>

      <ResponsiveDialog open={open} onOpenChange={setOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{teamName} players</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Pick up to {MAX_PLAYERS_PER_SIDE} players for this game.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="max-h-64 space-y-1 overflow-y-auto px-1">
            {roster.length === 0 && (
              <p className="py-2 text-sm text-muted-foreground">
                No players on the roster yet — add one below.
              </p>
            )}
            {roster.map((player) => {
              const checked = selectedIds.includes(player.id);
              const atLimit = !checked && selectedIds.length >= MAX_PLAYERS_PER_SIDE;
              return (
                <label
                  key={player.id}
                  className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-md px-2 hover:bg-muted"
                >
                  <Checkbox
                    checked={checked}
                    disabled={atLimit}
                    onCheckedChange={(value) => toggle(player.id, value === true)}
                    aria-label={player.display_name}
                  />
                  <span className="text-sm">{player.display_name}</span>
                </label>
              );
            })}
          </div>

          <div className="flex gap-2 px-1 pt-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Add a player…"
              aria-label="New player name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAdd}
              disabled={isAddingPlayer || newName.trim().length === 0}
              aria-label="Add player"
            >
              <UserPlus className="size-4" aria-hidden />
            </Button>
          </div>

          <ResponsiveDialogFooter>
            <Button type="button" className="min-h-[44px] w-full" onClick={() => setOpen(false)}>
              Done
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </div>
  );
};
