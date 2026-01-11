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
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { AlertTriangle, Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { bracketManagerService } from '@/services/brackets/manager';

import { DragOverlayItem } from './form/bracket-teams/components/DragOverlayItem';
import { SortableTeamItem } from './form/bracket-teams/components/SortableTeamItem';

interface Participant {
  id: number;
  name: string;
  position: number | null;
}

interface SeedingUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bracketId: string;
  bracketName: string;
  currentParticipants: Participant[];
  bracketState: 'pending' | 'in_progress' | 'completed';
}

interface TeamItem {
  id: string;
  name: string;
  seed: number;
}

export const SeedingUpdateDialog: React.FC<SeedingUpdateDialogProps> = ({
  open,
  onOpenChange,
  bracketId,
  bracketName,
  currentParticipants,
  bracketState,
}) => {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before activating drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Update teams whenever currentParticipants changes
  useEffect(() => {
    const processedTeams = currentParticipants
      .filter((p) => p.name !== null)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((p, idx) => ({
        id: String(p.id),
        name: p.name,
        seed: p.position || idx + 1,
      }));

    setTeams(processedTeams);
  }, [currentParticipants]);

  const canUpdate = bracketState === 'pending';

  const activeTeam = useMemo(() => teams.find((t) => t.id === activeId), [teams, activeId]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    setTeams((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const reordered = arrayMove(items, oldIndex, newIndex);

      // Reassign seeds based on new order
      return reordered.map((team, idx) => ({
        ...team,
        seed: idx + 1,
      }));
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await bracketManagerService.updateSeeding({
        bracketId,
        newSeeding: teams,
        keepSameSize: true,
      });

      toast({
        title: 'Seeding updated',
        description: `Successfully updated seeding for ${bracketName}`,
      });

      queryClient.invalidateQueries({ queryKey: ['bracket', bracketId] });
      queryClient.invalidateQueries({ queryKey: ['brackets'] });
      queryClient.invalidateQueries({ queryKey: ['bracket-participants', bracketId] });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Failed to update seeding',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateFirstRoundPreview = () => {
    const sorted = [...teams].sort((a, b) => a.seed - b.seed);
    const matchups = [];
    const halfPoint = Math.ceil(sorted.length / 2);

    for (let i = 0; i < halfPoint; i++) {
      const team1 = sorted[i];
      const team2 = sorted[sorted.length - 1 - i];
      if (team2) {
        matchups.push({
          seed1: team1.seed,
          team1: team1.name,
          seed2: team2.seed,
          team2: team2.name,
        });
      }
    }

    return matchups;
  };

  const teamIds = useMemo(() => teams.map((t) => t.id), [teams]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Bracket Seeding</DialogTitle>
          <DialogDescription>
            Drag teams to reorder seeding. Changes will update matchups if no results have been
            entered yet.
          </DialogDescription>
        </DialogHeader>

        {!canUpdate && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Cannot update seeding after matches have started. This bracket is currently{' '}
              {bracketState.replace('_', ' ')}.
            </AlertDescription>
          </Alert>
        )}

        <div className="py-4">
          <h3 className="text-sm font-medium mb-3">Drag to Reorder Teams:</h3>

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
                      seed={team.seed}
                      disabled={!canUpdate}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>

            <DragOverlay
              dropAnimation={{
                duration: 200,
                easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
              }}
            >
              {activeTeam ? (
                <DragOverlayItem name={activeTeam.name} seed={activeTeam.seed} />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h3 className="text-sm font-medium mb-2">First Round Matchup Preview:</h3>
          <div className="space-y-1 text-sm">
            {generateFirstRoundPreview().map((matchup, idx) => (
              <div key={idx} className="flex justify-between items-center py-1">
                <span className="flex-1">
                  #{matchup.seed1} {matchup.team1}
                </span>
                <span className="text-muted-foreground px-2">vs</span>
                <span className="flex-1 text-right">
                  #{matchup.seed2} {matchup.team2}
                </span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canUpdate || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Seeding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
