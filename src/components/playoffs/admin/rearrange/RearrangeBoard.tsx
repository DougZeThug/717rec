import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { Lock } from 'lucide-react';
import React, { useState } from 'react';

import { cn } from '@/lib/utils';
import type {
  RearrangeBoard as RearrangeBoardData,
  RearrangePlanResult,
} from '@/services/brackets/manager/services/BracketAdmin/rearrange/types';

import type { Arrangement } from './dropLogic';
import { dropFromDragEnd } from './dropLogic';
import type { RearrangeCellModel } from './RearrangeSlotCell';
import { RearrangeSlotCell } from './RearrangeSlotCell';

interface RearrangeBoardProps {
  board: RearrangeBoardData;
  arrangement: Arrangement;
  plan: RearrangePlanResult | null;
  onDrop: (sourceKey: string, targetKey: string) => void;
}

/**
 * The drag-and-drop surface: one column per losers-bracket round, one card
 * per match. Movable teams drag between spots; auto-filled and locked spots
 * render read-only and update live from the simulation preview.
 */
export const RearrangeBoard: React.FC<RearrangeBoardProps> = ({
  board,
  arrangement,
  plan,
  onDrop,
}) => {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const nameOf = (participantId: number | null | undefined): string =>
    (participantId != null ? board.snapshot.names[String(participantId)] : null) ?? 'Unknown team';

  const snapshotById = new Map(board.snapshot.matches.map((match) => [match.id, match]));

  const cellFor = (matchId: number, slotIndex: 0 | 1): RearrangeCellModel => {
    const view = board.rounds
      .flatMap((round) => round.matches)
      .find((match) => match.matchId === matchId);
    const slotView = view?.slots[slotIndex];
    const side = slotIndex === 0 ? 'opponent1' : 'opponent2';
    const slotKey = `${matchId}:${side}`;
    const snapshotSlot = snapshotById.get(matchId)?.[side];

    if (slotView?.kind === 'team' || slotView?.kind === 'bye') {
      const occupant = arrangement.get(slotKey) ?? null;
      return {
        slotKey,
        kind: occupant != null ? 'team' : 'bye',
        label: occupant != null ? nameOf(occupant) : 'BYE — drop a team here',
      };
    }
    if (slotView?.kind === 'derived') {
      const simulated = plan?.preview[String(matchId)]?.[side] ?? snapshotSlot;
      return {
        slotKey,
        kind: 'derived',
        label:
          simulated?.shape === 'team'
            ? nameOf(simulated.participantId)
            : simulated?.shape === 'bye'
              ? 'BYE (automatic)'
              : 'Waiting for an earlier match',
        note: slotView.autoNote,
      };
    }
    return {
      slotKey,
      kind: 'locked',
      label:
        slotView?.participantName ??
        (snapshotSlot?.shape === 'bye' ? 'BYE' : 'Waiting for an earlier match'),
    };
  };

  const handleDragStart = (event: DragStartEvent) => setActiveKey(String(event.active.id));
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveKey(null);
    const drop = dropFromDragEnd(event);
    if (drop) onDrop(drop[0], drop[1]);
  };

  const activeLabel = activeKey != null ? nameOf(arrangement.get(activeKey) ?? null) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveKey(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-2">
        {board.rounds.map((round) => (
          <div key={round.roundNumber} className="w-56 shrink-0 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Losers Round {round.roundNumber}
            </h3>
            {round.matches.map((match) => (
              <div
                key={match.matchId}
                className={cn(
                  'space-y-1 rounded-lg border p-2',
                  match.locked && 'bg-muted/40 opacity-75'
                )}
              >
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  {match.locked && <Lock className="size-3 shrink-0" />}
                  <span>Match {match.matchNumber}</span>
                </div>
                <RearrangeSlotCell cell={cellFor(match.matchId, 0)} />
                <RearrangeSlotCell cell={cellFor(match.matchId, 1)} />
                {match.locked && match.lockedReason && (
                  <p className="text-xs text-muted-foreground">This match {match.lockedReason}.</p>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <DragOverlay>
        {activeLabel != null && (
          <div className="rounded-md border bg-background px-2 py-1.5 text-sm font-medium shadow-lg">
            {activeLabel}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
};
