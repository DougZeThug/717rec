import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { AnimatePresence } from 'framer-motion';
import React, { useMemo } from 'react';

import { cn } from '@/lib/utils';

import { EditableTeam } from '../hooks/useHistoryEditing';
import DraggableTeamRow from './DraggableTeamRow';
import EditableDivisionHeader from './EditableDivisionHeader';

interface EditableDivisionPanelProps {
  divisionName: string;
  teams: EditableTeam[];
  onRenameDivision: (oldName: string, newName: string) => void;
  onRemoveDivision: (name: string) => boolean;
  existingDivisions: string[];
}

export const EditableDivisionPanel: React.FC<EditableDivisionPanelProps> = ({
  divisionName,
  teams,
  onRenameDivision,
  onRemoveDivision,
  existingDivisions,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `division-${divisionName}`,
    data: {
      type: 'division',
      divisionName,
    },
  });

  const teamIds = useMemo(() => teams.map((t) => t.team_id), [teams]);

  const isEmpty = teams.length === 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-xl border-2 border-dashed p-4 transition-all duration-200',
        isOver && 'border-primary bg-primary/5 scale-[1.01]',
        !isOver && 'border-muted-foreground/30 bg-card/50',
        isEmpty && 'min-h-[120px]'
      )}
    >
      <EditableDivisionHeader
        divisionName={divisionName}
        teamCount={teams.length}
        onRename={(newName) => onRenameDivision(divisionName, newName)}
        onRemove={() => onRemoveDivision(divisionName)}
        canRemove={isEmpty}
        existingDivisions={existingDivisions}
      />

      <SortableContext items={teamIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 mt-3">
          <AnimatePresence mode="popLayout">
            {teams.map((team, index) => (
              <DraggableTeamRow key={team.team_id} team={team} rank={index + 1} />
            ))}
          </AnimatePresence>

          {isEmpty && (
            <div className="text-center py-6 text-muted-foreground text-sm">
              Drag teams here to add them to this division
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

export default EditableDivisionPanel;
