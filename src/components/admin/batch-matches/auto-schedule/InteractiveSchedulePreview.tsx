import { Clock, Move, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { TimeBlockTeamsMap } from '@/types/autoSchedule';
import { validateTeamCounts } from '@/utils/autoSchedule/edgeCaseUtils';

import { TimeBlockTeamsList } from './TimeBlockTeamsList';

interface InteractiveSchedulePreviewProps {
  timeBlockTeams: TimeBlockTeamsMap;
  date: Date | null;
  unmatchedTeamIds?: string[];
  isEditMode?: boolean;
  onTeamUpdate?: (updatedTeams: TimeBlockTeamsMap) => void;
}

const InteractiveSchedulePreview: React.FC<InteractiveSchedulePreviewProps> = ({
  timeBlockTeams,
  date,
  unmatchedTeamIds = [],
  isEditMode = false,
  onTeamUpdate,
}) => {
  const [selectedTeams, setSelectedTeams] = useState<Record<string, string[]>>({});
  const [moveToBlock, setMoveToBlock] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'remove' | 'clear' | 'move';
    blockKey?: string;
    targetBlock?: string;
  } | null>(null);

  // Check if we have teams loaded
  const hasTeams = Object.values(timeBlockTeams).some((teams) => teams?.length > 0);

  // Validate team counts
  const { insufficientBlocks } = validateTeamCounts(timeBlockTeams);

  const availableBlocks = Object.keys(timeBlockTeams);

  // Helper functions
  const getSelectedTeamsForBlock = (blockKey: string): string[] => {
    return selectedTeams[blockKey] || [];
  };

  const handleTeamToggle = (blockKey: string, teamId: string) => {
    setSelectedTeams((prev) => {
      const blockSelected = prev[blockKey] || [];
      const isSelected = blockSelected.includes(teamId);

      return {
        ...prev,
        [blockKey]: isSelected
          ? blockSelected.filter((id) => id !== teamId)
          : [...blockSelected, teamId],
      };
    });
  };

  const handleSelectAll = (blockKey: string) => {
    const teams = timeBlockTeams[blockKey] || [];
    setSelectedTeams((prev) => ({
      ...prev,
      [blockKey]: teams.map((team) => team.id),
    }));
  };

  const handleDeselectAll = (blockKey: string) => {
    setSelectedTeams((prev) => ({
      ...prev,
      [blockKey]: [],
    }));
  };

  const executeTeamOperation = () => {
    if (!confirmAction) return;

    const updatedTeams = { ...timeBlockTeams };

    switch (confirmAction.type) {
      case 'remove':
        if (confirmAction.blockKey) {
          const selectedIds = selectedTeams[confirmAction.blockKey] || [];
          updatedTeams[confirmAction.blockKey] = updatedTeams[confirmAction.blockKey].filter(
            (team) => !selectedIds.includes(team.id)
          );
        }
        break;

      case 'clear':
        if (confirmAction.blockKey) {
          updatedTeams[confirmAction.blockKey] = [];
        }
        break;

      case 'move':
        if (confirmAction.blockKey && confirmAction.targetBlock) {
          const selectedIds = selectedTeams[confirmAction.blockKey] || [];
          const teamsToMove = updatedTeams[confirmAction.blockKey].filter((team) =>
            selectedIds.includes(team.id)
          );

          // Remove from source
          updatedTeams[confirmAction.blockKey] = updatedTeams[confirmAction.blockKey].filter(
            (team) => !selectedIds.includes(team.id)
          );

          // Add to target (avoid duplicates)
          const existingIds = updatedTeams[confirmAction.targetBlock]?.map((t) => t.id) || [];
          const newTeams = teamsToMove.filter((team) => !existingIds.includes(team.id));
          updatedTeams[confirmAction.targetBlock] = [
            ...(updatedTeams[confirmAction.targetBlock] || []),
            ...newTeams,
          ];
        }
        break;
    }

    onTeamUpdate?.(updatedTeams);

    // Clear selections for affected blocks
    if (confirmAction.blockKey) {
      setSelectedTeams((prev) => ({
        ...prev,
        [confirmAction.blockKey!]: [],
      }));
    }

    setShowConfirmDialog(false);
    setConfirmAction(null);
    setMoveToBlock('');
  };

  if (!date || !hasTeams) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Select a date and load teams to preview schedule</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Teams Available by Time Block</h3>

      {Object.entries(timeBlockTeams).map(([block, teams]) => {
        const selectedForBlock = getSelectedTeamsForBlock(block);
        const hasSelection = selectedForBlock.length > 0;

        return (
          <Card key={block} className="overflow-hidden">
            <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{block} Block</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={teams.length % 2 === 0 ? 'outline' : 'destructive'}
                  className="text-xs"
                >
                  {teams.length} Teams {teams.length % 2 !== 0 && '(Odd Number)'}
                </Badge>

                {isEditMode && hasSelection && (
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        setConfirmAction({ type: 'remove', blockKey: block });
                        setShowConfirmDialog(true);
                      }}
                      className="h-6 px-2"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove ({selectedForBlock.length})
                    </Button>

                    <Select value={moveToBlock} onValueChange={setMoveToBlock}>
                      <SelectTrigger className="h-6 w-24 text-xs">
                        <Move className="h-3 w-3" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBlocks
                          .filter((b) => b !== block)
                          .map((blockKey) => (
                            <SelectItem key={blockKey} value={blockKey}>
                              {blockKey}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    {moveToBlock && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setConfirmAction({
                            type: 'move',
                            blockKey: block,
                            targetBlock: moveToBlock,
                          });
                          setShowConfirmDialog(true);
                        }}
                        className="h-6 px-2"
                      >
                        Move
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <CardContent className="p-3">
              <TimeBlockTeamsList
                teams={teams}
                unmatchedTeamIds={unmatchedTeamIds.filter((id) =>
                  teams.some((team) => team.id === id)
                )}
                isInteractive={isEditMode}
                selectedTeamIds={selectedForBlock}
                onTeamToggle={(teamId) => handleTeamToggle(block, teamId)}
                onSelectAll={() => handleSelectAll(block)}
                onDeselectAll={() => handleDeselectAll(block)}
              />

              {isEditMode && teams.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setConfirmAction({ type: 'clear', blockKey: block });
                      setShowConfirmDialog(true);
                    }}
                    className="text-xs"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear All Teams
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {insufficientBlocks.length > 0 && (
        <div className="text-sm text-amber-500 mt-2">
          <p>Note: Some time blocks have insufficient teams to create matches.</p>
        </div>
      )}

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'remove' &&
                `Remove ${selectedTeams[confirmAction.blockKey!]?.length || 0} selected team(s) from ${confirmAction.blockKey} block?`}
              {confirmAction?.type === 'clear' &&
                `Clear all teams from ${confirmAction.blockKey} block?`}
              {confirmAction?.type === 'move' &&
                `Move ${selectedTeams[confirmAction.blockKey!]?.length || 0} selected team(s) from ${confirmAction.blockKey} to ${confirmAction.targetBlock} block?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeTeamOperation}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default React.memo(InteractiveSchedulePreview);
