import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, GripVertical } from 'lucide-react';
import { bracketManagerService } from '@/services/brackets/manager';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

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

export const SeedingUpdateDialog: React.FC<SeedingUpdateDialogProps> = ({
  open,
  onOpenChange,
  bracketId,
  bracketName,
  currentParticipants,
  bracketState
}) => {
  // State for reordered teams
  const [teams, setTeams] = useState<Array<{id: string; name: string; seed: number}>>([]);
  
  // Update teams whenever currentParticipants changes
  useEffect(() => {
    const processedTeams = currentParticipants
      .filter(p => p.name !== null)
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map((p, idx) => ({
        id: String(p.id),
        name: p.name,
        seed: p.position || idx + 1
      }));
    
    setTeams(processedTeams);
  }, [currentParticipants]);
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Disable if bracket has started
  const canUpdate = bracketState === 'pending';

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) return;
    
    const reordered = [...teams];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, removed);
    
    // Reassign seeds based on new order
    const updated = reordered.map((team, idx) => ({
      ...team,
      seed: idx + 1
    }));
    
    setTeams(updated);
    setDraggedIndex(null);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await bracketManagerService.updateSeeding({
        bracketId,
        newSeeding: teams,
        keepSameSize: true
      });

      toast({
        title: 'Seeding updated',
        description: `Successfully updated seeding for ${bracketName}`,
      });

      // Invalidate queries to refresh bracket view
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
          team2: team2.name
        });
      }
    }
    
    return matchups;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Bracket Seeding</DialogTitle>
          <DialogDescription>
            Drag teams to reorder seeding. Changes will update matchups if no results have been entered yet.
          </DialogDescription>
        </DialogHeader>

        {!canUpdate && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Cannot update seeding after matches have started. 
              This bracket is currently {bracketState.replace('_', ' ')}.
            </AlertDescription>
          </Alert>
        )}

        <div className="py-4">
          <h3 className="text-sm font-medium mb-3">Drag to Reorder Teams:</h3>
          <div className="space-y-2">
            {teams.map((team, index) => (
              <div
                key={team.id}
                draggable={canUpdate}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={`
                  flex items-center gap-3 p-3 rounded-lg border transition-colors
                  ${draggedIndex === index ? 'opacity-50' : ''}
                  ${canUpdate ? 'bg-muted/50 hover:bg-muted cursor-move' : 'bg-background'}
                `}
              >
                {canUpdate && (
                  <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                
                <div className="flex items-center gap-2 flex-1">
                  <span className="font-semibold text-primary min-w-[2rem]">#{team.seed}</span>
                  <span className="font-medium">{team.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <h3 className="text-sm font-medium mb-2">First Round Matchup Preview:</h3>
          <div className="space-y-1 text-sm">
            {generateFirstRoundPreview().map((matchup, idx) => (
              <div key={idx} className="flex justify-between items-center py-1">
                <span className="flex-1">#{matchup.seed1} {matchup.team1}</span>
                <span className="text-muted-foreground px-2">vs</span>
                <span className="flex-1 text-right">#{matchup.seed2} {matchup.team2}</span>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canUpdate || isSubmitting}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Seeding
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
