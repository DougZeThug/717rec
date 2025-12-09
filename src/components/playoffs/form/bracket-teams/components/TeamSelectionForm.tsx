
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Trophy, Zap, AlertCircle, Settings, Save, X } from 'lucide-react';
import { ProcessedTeam, BracketFormStateResult, SeedValidationState } from '../types';
import { SeedOverrideControls } from './SeedOverrideControls';
import { SeedStatusBadge } from './SeedStatusBadge';
import { useFormStateManager } from '../hooks/useFormStateManager';

interface TeamSelectionFormProps {
  teams: ProcessedTeam[];
  formState: BracketFormStateResult;
  maxTeams: number;
  minTeams: number;
  divisionId?: string;
  seedValidation?: SeedValidationState;
  onSeedChange?: (teamId: string, seed: number | null) => void;
}

/**
 * Team selection form component
 * Displays available teams with selection controls and validation feedback
 */
export const TeamSelectionForm: React.FC<TeamSelectionFormProps> = ({
  teams,
  formState,
  maxTeams,
  minTeams,
  divisionId,
  seedValidation,
  onSeedChange
}) => {
  const [activeTab, setActiveTab] = useState<'select' | 'seeds'>('select');
  
  // Initialize form state manager for coordinated state management
  const formStateManager = useFormStateManager(
    teams,
    formState,
    seedValidation,
    onSeedChange
  );
  // Ensure we have valid arrays and objects to prevent React error #300
  const validTeams = Array.isArray(teams) ? teams : [];
  
  // Ensure formState has all required properties with proper defaults
  const safeFormState = {
    selected: formState?.selected || new Set(),
    selectedArray: formState?.selectedArray || [],
    count: formState?.count || 0,
    handleTeamToggle: formState?.handleTeamToggle || (() => {}),
    clearSelection: formState?.clearSelection || (() => {}),
    canSelectMore: formState?.canSelectMore ?? true,
    isAtMaximum: formState?.isAtMaximum ?? false,
    hasSelection: formState?.hasSelection ?? false,
    isValid: formState?.isValid ?? false,
    isComplete: formState?.isComplete ?? false,
    hasError: formState?.hasError ?? false,
    hasWarning: formState?.hasWarning ?? false,
    errorMessage: formState?.errorMessage || null,
    warningMessage: formState?.warningMessage || null,
    statusMessage: formState?.statusMessage || 'Ready to select teams',
    progress: formState?.progress || {
      percentage: 0,
      selected: 0,
      required: minTeams,
      maximum: maxTeams,
      available: validTeams.length
    }
  };

  /**
   * Renders team selection button with appropriate styling based on selection state
   */
  const renderTeamButton = (team: ProcessedTeam) => {
    if (!team || !team.id) return null;
    
    const isSelected = safeFormState.selected.has(team.id);
    const canSelect = !isSelected && safeFormState.canSelectMore;
    const isDisabled = !isSelected && !canSelect;

    // Check if this team has seed conflicts or pending changes
    const hasConflict = seedValidation?.conflicts?.some(c => c.team_id === team.id) || false;
    const isPending = formStateManager.seedManagementState.state.pendingChanges.has(team.id);
    const isManual = formStateManager.seedManagementState.state.mode === 'manual';

    return (
      <Button
        key={team.id}
        variant={isSelected ? "default" : "outline"}
        size="sm"
        onClick={() => safeFormState.handleTeamToggle(team.id)}
        disabled={isDisabled}
        className={`
          flex items-center gap-2 p-3 h-auto justify-start min-w-0 overflow-hidden
          ${isSelected ? 'bg-primary text-primary-foreground' : ''}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'}
          ${hasConflict ? 'border-destructive' : ''}
          ${isPending ? 'border-dashed' : ''}
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          {team.logoUrl ? (
            <img 
              src={team.logoUrl} 
              alt={`${team.name} logo`}
              className="w-6 h-6 object-contain flex-shrink-0"
            />
          ) : (
            <Users className="w-4 h-4 flex-shrink-0" />
          )}
          <span className="font-medium truncate">{team.name || 'Unnamed Team'}</span>
        </div>
        
        <div className="flex-shrink-0">
          <SeedStatusBadge
            seed={team.seed || 0}
            isManual={isManual}
            hasConflict={hasConflict}
            isPending={isPending}
            size="sm"
            onEdit={() => setActiveTab('seeds')}
          />
        </div>
        
        {team.powerScore && (
          <div className="flex items-center gap-1 text-xs opacity-75 flex-shrink-0">
            <Zap className="w-3 h-3" />
            <span>{Math.round(team.powerScore)}</span>
          </div>
        )}
      </Button>
    );
  };

  // Calculate status color and icon
  const getStatusDisplay = () => {
    if (safeFormState.hasError) {
      return { color: 'text-destructive', icon: AlertCircle };
    }
    if (safeFormState.hasWarning) {
      return { color: 'text-yellow-600', icon: AlertCircle };
    }
    if (safeFormState.isValid) {
      return { color: 'text-green-600', icon: null };
    }
    return { color: 'text-muted-foreground', icon: null };
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'select' | 'seeds')}>
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="select" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Select Teams
            </TabsTrigger>
            <TabsTrigger value="seeds" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Manage Seeds
              {formStateManager.hasUnsavedChanges && (
                <Badge variant="outline" className="ml-1 text-xs">
                  *
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          {/* Form-level save/cancel controls */}
          {formStateManager.hasUnsavedChanges && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={formStateManager.cancelAllChanges}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={formStateManager.saveAllChanges}
                disabled={!formStateManager.canSave}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="select" className="space-y-4">
          {/* Header with progress */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Select Teams</CardTitle>
                <Badge variant={safeFormState.isValid ? "default" : "secondary"}>
                  {safeFormState.count}/{maxTeams}
                </Badge>
              </div>
            </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={safeFormState.progress.percentage} className="w-full" />
          
          <div className="flex items-center justify-between text-sm">
            <div className={`flex items-center gap-2 ${statusDisplay.color}`}>
              {StatusIcon && <StatusIcon className="w-4 h-4" />}
              <span>{safeFormState.statusMessage}</span>
            </div>
            
            {safeFormState.hasSelection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={safeFormState.clearSelection}
                className="h-auto p-1 text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            )}
          </div>

          {/* Selection guidance */}
          <div className="text-xs text-muted-foreground border-t pt-2">
            <div className="flex justify-between">
              <span>Minimum: {minTeams} teams</span>
              <span>Maximum: {maxTeams} teams</span>
            </div>
            {safeFormState.count >= minTeams && !safeFormState.isAtMaximum && (
              <div className="mt-1 text-blue-600 font-medium">
                ✓ Ready to create bracket • Add more teams or click "Create Bracket"
              </div>
            )}
          </div>

          {/* Error/Warning messages */}
          {safeFormState.errorMessage && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded border border-destructive/20">
              {safeFormState.errorMessage}
            </div>
          )}
          
          {safeFormState.warningMessage && (
            <div className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-800">
              {safeFormState.warningMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teams grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Teams ({validTeams.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {formStateManager.syncedTeams.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {formStateManager.syncedTeams.map(renderTeamButton)}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No teams available for selection
            </div>
          )}
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="seeds" className="space-y-4">
      <SeedOverrideControls
        teams={formStateManager.syncedTeams}
        divisionId={divisionId || ''}
        validation={seedValidation}
        onSeedChange={onSeedChange}
        show={!!(divisionId && seedValidation)}
      />
    </TabsContent>
  </Tabs>
</div>
  );
};
