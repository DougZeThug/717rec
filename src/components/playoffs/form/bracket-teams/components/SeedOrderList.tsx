import React, { useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ProcessedTeam } from '../types';
import { SortableTeamItem } from './SortableTeamItem';
import { DragOverlayItem } from './DragOverlayItem';
import { AnimatePresence } from 'framer-motion';

interface SeedOrderListProps {
  teams: ProcessedTeam[];
  isManualMode: boolean;
  conflictTeamIds: Set<string>;
  onTeamReorder: (teams: ProcessedTeam[]) => void;
  onSeedChange: (teamId: string, seed: number | null) => void;
}

export const SeedOrderList: React.FC<SeedOrderListProps> = ({
  teams,
  isManualMode,
  conflictTeamIds,
  onTeamReorder,
  onSeedChange,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeTeam = useMemo(() => 
    teams.find(t => t.id === activeId),
    [teams, activeId]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = teams.findIndex((item) => item.id === active.id);
    const newIndex = teams.findIndex((item) => item.id === over.id);
    
    const reordered = arrayMove(teams, oldIndex, newIndex);
    
    // Reassign seeds based on new order
    const updated = reordered.map((team, idx) => ({
      ...team,
      seed: idx + 1
    }));
    
    onTeamReorder(updated);
  };

  const teamIds = useMemo(() => teams.map(t => t.id), [teams]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={teamIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {teams.map((team) => (
              <SortableTeamItem
                key={team.id}
                id={team.id}
                name={team.name}
                seed={team.seed ?? 0}
                logoUrl={team.logoUrl}
                disabled={!isManualMode}
                showSeedInput={isManualMode}
                hasConflict={conflictTeamIds.has(team.id)}
                onSeedChange={(seed) => onSeedChange(team.id, seed)}
              />
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeTeam ? (
          <DragOverlayItem
            name={activeTeam.name}
            seed={activeTeam.seed ?? 0}
            logoUrl={activeTeam.logoUrl}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
