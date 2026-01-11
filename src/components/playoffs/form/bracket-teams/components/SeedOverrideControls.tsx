import { AlertCircle, RefreshCw, Save, X } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { useSeedManagement } from '../hooks/useSeedManagement';
import { useTeamSeedMutation } from '../hooks/useTeamSeedMutation';
import { ProcessedTeam, SeedValidationState } from '../types';
import { SeedOrderList } from './SeedOrderList';

interface SeedOverrideControlsProps {
  teams: ProcessedTeam[];
  divisionId: string;
  validation: SeedValidationState;
  onSeedChange?: (teamId: string, seed: number | null) => void;
  show?: boolean;
}

export const SeedOverrideControls: React.FC<SeedOverrideControlsProps> = ({
  teams,
  divisionId,
  validation,
  onSeedChange,
  show = true,
}) => {
  // ALWAYS call hooks first (before any conditional logic)
  const { state, actions, processedTeams, hasConflicts } = useSeedManagement(
    teams,
    validation,
    onSeedChange
  );

  const { bulkUpdateSeeds, resetDivisionSeeds, isUpdating } = useTeamSeedMutation();

  // Early return AFTER all hooks are called
  if (!show) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">Select a division to manage seeds</div>
        </CardContent>
      </Card>
    );
  }

  const conflictTeamIds = new Set(validation.conflicts.map((conflict) => conflict.team_id));

  const handleSaveChanges = async () => {
    if (state.pendingChanges.size === 0) return;

    const updates = Array.from(state.pendingChanges.entries()).map(([teamId, seed]) => ({
      teamId,
      seed,
    }));

    try {
      await bulkUpdateSeeds.mutateAsync({ updates, divisionId });
      actions.commitChanges();
    } catch (error) {
      console.error('Failed to save seed changes:', error);
    }
  };

  const handleResetToAutomatic = async () => {
    try {
      await resetDivisionSeeds.mutateAsync(divisionId);
      actions.resetToAutomatic();
    } catch (error) {
      console.error('Failed to reset seeds:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Seed Management</CardTitle>
          <div className="flex items-center gap-4">
            {hasConflicts && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {validation.conflicts.length} conflicts
              </Badge>
            )}
            <div className="flex items-center space-x-2">
              <Switch
                id="seed-mode"
                checked={state.mode === 'manual'}
                onCheckedChange={(checked) => actions.setMode(checked ? 'manual' : 'automatic')}
                disabled={isUpdating}
              />
              <Label htmlFor="seed-mode">Manual seeding</Label>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {state.mode === 'manual' && (
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Manual Mode:</strong> Drag to reorder teams or edit seed numbers directly
            </div>
            <div className="flex items-center gap-2">
              {state.isDirty && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={actions.cancelChanges}
                    disabled={isUpdating}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveChanges}
                    disabled={isUpdating || hasConflicts}
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Save Changes
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToAutomatic}
                disabled={isUpdating}
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Reset to Auto
              </Button>
            </div>
          </div>
        )}

        {validation.errorMessage && (
          <div className="p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
            {validation.errorMessage}
          </div>
        )}

        <SeedOrderList
          teams={processedTeams}
          isManualMode={state.mode === 'manual'}
          conflictTeamIds={conflictTeamIds}
          onTeamReorder={actions.reorderTeams}
          onSeedChange={actions.updateTeamSeed}
        />

        {state.mode === 'automatic' && (
          <div className="text-sm text-muted-foreground text-center py-2">
            Seeds are automatically assigned based on team rankings
          </div>
        )}
      </CardContent>
    </Card>
  );
};
