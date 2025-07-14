
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Trophy, Zap, AlertCircle, Settings } from 'lucide-react';
import { ProcessedTeam, BracketFormStateResult, SeedValidationState } from '../types';
import { SeedOverrideControls } from './SeedOverrideControls';

interface TeamSelectionFormProps {
  teams: ProcessedTeam[];
  formState: BracketFormStateResult;
  maxTeams: number;
  minTeams: number;
  divisionId?: string;
  seedValidation?: SeedValidationState;
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
  seedValidation
}) => {
  const [activeTab, setActiveTab] = useState<'select' | 'seeds'>('select');
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

    return (
      <Button
        key={team.id}
        variant={isSelected ? "default" : "outline"}
        size="sm"
        onClick={() => safeFormState.handleTeamToggle(team.id)}
        disabled={isDisabled}
        className={`
          flex items-center gap-2 p-3 h-auto justify-start
          ${isSelected ? 'bg-primary text-primary-foreground' : ''}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted'}
        `}
      >
        <div className="flex items-center gap-2 flex-1">
          {team.logoUrl ? (
            <img 
              src={team.logoUrl} 
              alt={`${team.name} logo`}
              className="w-6 h-6 object-contain"
            />
          ) : (
            <Users className="w-4 h-4" />
          )}
          <span className="font-medium">{team.name || 'Unnamed Team'}</span>
        </div>
        
        <div className="flex items-center gap-1 text-xs opacity-75">
          <Trophy className="w-3 h-3" />
          <span>#{team.seed || 0}</span>
        </div>
        
        {team.powerScore && (
          <div className="flex items-center gap-1 text-xs opacity-75">
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="select" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Select Teams
          </TabsTrigger>
          <TabsTrigger value="seeds" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Manage Seeds
          </TabsTrigger>
        </TabsList>

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
          {validTeams.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {validTeams.map(renderTeamButton)}
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
      {divisionId && seedValidation ? (
        <SeedOverrideControls
          teams={validTeams}
          divisionId={divisionId}
          validation={seedValidation}
        />
      ) : (
        <Card>
          <CardContent className="py-6">
            <div className="text-center text-muted-foreground">
              Select a division to manage seeds
            </div>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  </Tabs>
</div>
  );
};
