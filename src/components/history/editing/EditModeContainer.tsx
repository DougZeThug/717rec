import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import React, { useMemo, useState } from 'react';

import { toast } from '@/hooks/use-toast';
import { sortHistoryDivisions } from '@/utils/historyDivisionUtils';

import { EditableTeam, useHistoryEditing } from '../hooks/useHistoryEditing';
import { useUpdateSeasonStats } from '../../../hooks/history/useUpdateSeasonStats';
import AddDivisionButton from './AddDivisionButton';
import EditableDivisionPanel from './EditableDivisionPanel';
import EditModeToolbar from './EditModeToolbar';
import TeamDragOverlay from './TeamDragOverlay';

interface SeasonData {
  team_id: string;
  season_id: string;
  match_wins: number;
  match_losses: number;
  game_wins: number;
  game_losses: number;
  sos: number | null;
  power_score: number | null;
  champion: boolean;
  runner_up: boolean;
  division_name: string | null;
  playoff_rank: number | null;
  team_name: string;
  team_logo_url: string | null;
  team_image_url: string | null;
}

interface EditModeContainerProps {
  seasonId: string;
  seasonData: SeasonData[];
  onSave: () => void;
  onCancel: () => void;
}

export const EditModeContainer: React.FC<EditModeContainerProps> = ({
  seasonId,
  seasonData,
  onSave,
  onCancel,
}) => {
  // Convert SeasonData to EditableTeam format
  const initialTeams: EditableTeam[] = useMemo(
    () =>
      seasonData.map((t) => ({
        ...t,
        division_name: t.division_name || 'Uncategorized',
      })),
    [seasonData]
  );

  const {
    teams,
    divisions,
    moveTeam,
    reorderTeamInDivision,
    addDivision,
    renameDivision,
    removeDivision,
    getTeamsByDivision,
    hasChanges,
    getChanges,
    resetChanges,
  } = useHistoryEditing({ initialTeams, seasonId });

  const { updateStats, isUpdating } = useUpdateSeasonStats();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeDivision, setActiveDivision] = useState<string | null>(null);

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

  const activeTeam = useMemo(() => {
    if (!activeId) return null;
    return teams.find((t) => t.team_id === activeId) || null;
  }, [teams, activeId]);

  const activeRank = useMemo(() => {
    if (!activeTeam || !activeDivision) return 1;
    const divisionTeams = getTeamsByDivision(activeDivision);
    const index = divisionTeams.findIndex((t) => t.team_id === activeTeam.team_id);
    return index >= 0 ? index + 1 : 1;
  }, [activeTeam, activeDivision, getTeamsByDivision]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(String(active.id));

    // Get the division of the dragged team
    const team = teams.find((t) => t.team_id === active.id);
    if (team) {
      setActiveDivision(team.division_name);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTeamData = teams.find((t) => t.team_id === active.id);
    if (!activeTeamData) return;

    // Check if we're dragging over a division container
    const overId = String(over.id);
    if (overId.startsWith('division-')) {
      const targetDivision = overId.replace('division-', '');
      if (targetDivision !== activeTeamData.division_name) {
        // Move to end of division for now (handleDragEnd will finalize position)
        const targetTeams = getTeamsByDivision(targetDivision);
        moveTeam(activeTeamData.team_id, targetDivision, targetTeams.length);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveDivision(null);

    if (!over) return;

    const activeTeamData = teams.find((t) => t.team_id === active.id);
    if (!activeTeamData) return;

    const overId = String(over.id);

    // If dropping on another team, reorder within division
    if (!overId.startsWith('division-')) {
      const overTeam = teams.find((t) => t.team_id === over.id);
      if (overTeam && overTeam.division_name === activeTeamData.division_name) {
        const divisionTeams = getTeamsByDivision(activeTeamData.division_name);
        const oldIndex = divisionTeams.findIndex((t) => t.team_id === active.id);
        const newIndex = divisionTeams.findIndex((t) => t.team_id === over.id);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          reorderTeamInDivision(activeTeamData.division_name, oldIndex, newIndex);
        }
      }
    }
  };

  const handleSave = async () => {
    const changes = getChanges();

    if (changes.length === 0) {
      toast({
        title: 'No Changes',
        description: 'There are no changes to save.',
      });
      return;
    }

    const success = await updateStats(
      changes.map((t) => ({
        team_id: t.team_id,
        season_id: t.season_id,
        division_name: t.division_name,
        playoff_rank: t.playoff_rank,
      }))
    );

    if (success) {
      toast({
        title: 'Changes Saved',
        description: `Successfully updated ${changes.length} team${changes.length !== 1 ? 's' : ''}.`,
      });
      onSave();
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      );
      if (!confirmed) return;
    }
    onCancel();
  };

  const handleRemoveDivision = (name: string): boolean => {
    const success = removeDivision(name);
    if (!success) {
      toast({
        title: 'Cannot Remove Division',
        description: 'Move all teams out of this division first.',
        variant: 'destructive',
      });
    }
    return success;
  };

  // Sort divisions for display
  const sortedDivisions = useMemo(() => {
    const divisionEntries = divisions.map((name) => [name, getTeamsByDivision(name)] as const);
    return sortHistoryDivisions(
      divisionEntries.map(([name, teams]) => [name, teams] as [string, EditableTeam[]])
    );
  }, [divisions, getTeamsByDivision]);

  const changeCount = getChanges().length;

  return (
    <div className="space-y-6">
      <EditModeToolbar
        hasChanges={hasChanges}
        isSaving={isUpdating}
        changeCount={changeCount}
        onSave={handleSave}
        onCancel={handleCancel}
        onReset={resetChanges}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedDivisions.map(([divisionName, divisionTeams]) => (
            <EditableDivisionPanel
              key={divisionName}
              divisionName={divisionName}
              teams={divisionTeams}
              onRenameDivision={renameDivision}
              onRemoveDivision={handleRemoveDivision}
              existingDivisions={divisions}
            />
          ))}

          <AddDivisionButton onAddDivision={addDivision} existingDivisions={divisions} />
        </div>

        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
          }}
        >
          {activeTeam ? <TeamDragOverlay team={activeTeam} rank={activeRank} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default EditModeContainer;
