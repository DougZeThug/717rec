import { useDraggable, useDroppable } from '@dnd-kit/core';
import { GripVertical } from 'lucide-react';
import React from 'react';

import { cn } from '@/lib/utils';

export interface RearrangeCellModel {
  /** "matchId:side" — doubles as the drag and drop id. */
  slotKey: string;
  /** How the spot behaves: movable team, open BYE spot, auto-filled, or locked. */
  kind: 'team' | 'bye' | 'derived' | 'locked';
  label: string;
  /** Small explanatory line, e.g. "Filled automatically from Match 2". */
  note?: string | null;
}

/** The draggable chip for a movable team. */
const TeamChip: React.FC<{ slotKey: string; label: string }> = ({ slotKey, label }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: slotKey });
  return (
    <button
      type="button"
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'flex w-full items-center gap-1.5 rounded-md border bg-background px-2 py-1.5 text-left text-sm font-medium',
        'cursor-grab touch-none hover:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400',
        isDragging && 'opacity-40'
      )}
      aria-label={`Move ${label}`}
    >
      <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </button>
  );
};

/**
 * One spot of one match on the rearrange board. Movable spots (a team or an
 * open BYE) accept drops; auto-filled spots update live as their feeder match
 * is rearranged; locked spots are greyed out.
 */
export const RearrangeSlotCell: React.FC<{ cell: RearrangeCellModel }> = ({ cell }) => {
  const droppable = cell.kind === 'team' || cell.kind === 'bye';
  const { setNodeRef, isOver } = useDroppable({ id: cell.slotKey, disabled: !droppable });

  return (
    <div
      ref={setNodeRef}
      data-testid={`slot-${cell.slotKey}`}
      className={cn(
        'rounded-md border p-1',
        droppable ? 'border-dashed' : 'border-transparent',
        isOver && 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
      )}
    >
      {cell.kind === 'team' ? (
        <TeamChip slotKey={cell.slotKey} label={cell.label} />
      ) : (
        <div
          className={cn(
            'px-2 py-1.5 text-sm',
            cell.kind === 'bye' ? 'italic text-muted-foreground' : 'text-muted-foreground'
          )}
        >
          <span className="block truncate">{cell.label}</span>
          {cell.note && <span className="block truncate text-xs opacity-75">{cell.note}</span>}
        </div>
      )}
    </div>
  );
};
