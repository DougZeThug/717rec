import { Pencil, Trash2 } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';
import { Match } from '@/types';

interface MatchCardAdminActionsProps {
  match: Match;
  isCompleted: boolean;
  onEdit?: (match: Match) => void;
  onDelete?: (matchId: string) => void;
}

/**
 * The pencil and bin an admin sees.
 *
 * A finished match cannot be edited here — its result is changed through score
 * entry or Live Corrections — but it can still be deleted, with the wording and
 * the colour saying that this one is permanent.
 *
 * Render only when the viewer is an admin; this component does not check.
 */
export const MatchCardAdminActions: React.FC<MatchCardAdminActionsProps> = ({
  match,
  isCompleted,
  onEdit,
  onDelete,
}) => {
  const canEdit = Boolean(onEdit) && !isCompleted;
  if (!canEdit && !onDelete) return null;

  return (
    <div className="flex justify-end gap-2 pt-2">
      {canEdit && onEdit && (
        <button
          type="button"
          onClick={() => onEdit(match)}
          className="p-1.5 rounded-full transition-all duration-200 bg-muted hover:bg-muted/80 active:scale-95"
          aria-label="Edit match"
        >
          <Pencil className="size-3.5 text-muted-foreground" />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          onClick={() => onDelete(match.id)}
          className={cn(
            'p-1.5 rounded-full transition-all duration-200 active:scale-95',
            isCompleted
              ? 'bg-destructive/10 hover:bg-destructive/20'
              : 'bg-muted hover:bg-destructive/10'
          )}
          aria-label={isCompleted ? 'Permanently delete completed match' : 'Delete match'}
        >
          <Trash2
            className={cn('size-3.5', isCompleted ? 'text-destructive' : 'text-muted-foreground')}
          />
        </button>
      )}
    </div>
  );
};
