import { AlertCircle, type LucideIcon, Save, Settings, Users, X, Zap } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useFormStateManager } from '../hooks/useFormStateManager';
import {
  BracketFormStateResult,
  ProcessedTeam,
  SeedValidationState,
  ValidationProgress,
} from '../types';
import { SeedOverrideControls } from './SeedOverrideControls';
import { SeedStatusBadge } from './SeedStatusBadge';

interface TeamSelectionFormProps {
  teams: ProcessedTeam[];
  formState: BracketFormStateResult;
  maxTeams: number;
  minTeams: number;
  divisionId?: string;
  seedValidation?: SeedValidationState;
  onSeedChange?: (teamId: string, seed: number | null) => void;
}

const EMPTY_SEED_VALIDATION: SeedValidationState = {
  isLoading: false,
  conflicts: [],
  hasConflicts: false,
  errorMessage: null,
};

// Shared no-op for absent handler callbacks (expression body, not an empty fn).
const noop = () => undefined;

// The form state with every field guaranteed present.
type SafeFormState = BracketFormStateResult;

/**
 * Normalize the incoming form state so every property has a safe default,
 * guarding against a missing/malformed formState (prevents React error #300).
 * A single null guard replaces per-property optional chaining while keeping the
 * exact '||' / '??' fallback semantics for a present formState.
 */
const buildSafeFormState = (
  formState: BracketFormStateResult | undefined,
  fallbackProgress: ValidationProgress
): SafeFormState => {
  if (!formState) {
    return {
      selected: new Set<string>(),
      selectedArray: [],
      count: 0,
      handleTeamToggle: noop,
      clearSelection: noop,
      canSelectMore: true,
      isAtMaximum: false,
      hasSelection: false,
      isValid: false,
      isComplete: false,
      hasError: false,
      hasWarning: false,
      errorMessage: null,
      warningMessage: null,
      statusMessage: 'Ready to select teams',
      progress: fallbackProgress,
    };
  }

  return {
    selected: formState.selected || new Set<string>(),
    selectedArray: formState.selectedArray || [],
    count: formState.count || 0,
    handleTeamToggle: formState.handleTeamToggle || noop,
    clearSelection: formState.clearSelection || noop,
    canSelectMore: formState.canSelectMore ?? true,
    isAtMaximum: formState.isAtMaximum ?? false,
    hasSelection: formState.hasSelection ?? false,
    isValid: formState.isValid ?? false,
    isComplete: formState.isComplete ?? false,
    hasError: formState.hasError ?? false,
    hasWarning: formState.hasWarning ?? false,
    errorMessage: formState.errorMessage || null,
    warningMessage: formState.warningMessage || null,
    statusMessage: formState.statusMessage || 'Ready to select teams',
    progress: formState.progress || fallbackProgress,
  };
};

interface StatusDisplay {
  color: string;
  icon: LucideIcon | null;
}

interface TabHeaderProps {
  hasUnsavedChanges: boolean;
  canSave: boolean;
  onCancel: () => void;
  onSave: () => void;
}

const UnsavedChangesControls: React.FC<Omit<TabHeaderProps, 'hasUnsavedChanges'>> = ({
  canSave,
  onCancel,
  onSave,
}) => (
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm" onClick={onCancel} className="flex items-center gap-2">
      <X className="size-4" />
      Cancel
    </Button>
    <Button
      variant="default"
      size="sm"
      onClick={onSave}
      disabled={!canSave}
      className="flex items-center gap-2"
    >
      <Save className="size-4" />
      Save Changes
    </Button>
  </div>
);

/** The two tab buttons, and the form-level save/cancel controls while there are edits. */
const TabHeader: React.FC<TabHeaderProps> = ({ hasUnsavedChanges, canSave, onCancel, onSave }) => (
  <div className="flex items-center justify-between">
    <TabsList className="grid w-full grid-cols-2 max-w-md">
      <TabsTrigger value="select" className="flex items-center gap-2">
        <Users className="size-4" />
        Select Teams
      </TabsTrigger>
      <TabsTrigger value="seeds" className="flex items-center gap-2">
        <Settings className="size-4" />
        Manage Seeds
        {hasUnsavedChanges && (
          <Badge variant="outline" className="ml-1 text-xs">
            *
          </Badge>
        )}
      </TabsTrigger>
    </TabsList>

    {hasUnsavedChanges && (
      <UnsavedChangesControls canSave={canSave} onCancel={onCancel} onSave={onSave} />
    )}
  </div>
);

interface StatusLineProps {
  statusDisplay: StatusDisplay;
  message: string;
  hasSelection: boolean;
  onClear: () => void;
}

/** The coloured status sentence, with "Clear all" once something is selected. */
const StatusLine: React.FC<StatusLineProps> = ({
  statusDisplay,
  message,
  hasSelection,
  onClear,
}) => {
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="flex items-center justify-between text-sm">
      <div className={`flex items-center gap-2 ${statusDisplay.color}`}>
        {StatusIcon && <StatusIcon className="size-4" />}
        <span>{message}</span>
      </div>

      {hasSelection && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="h-auto p-1 text-muted-foreground hover:text-foreground"
        >
          Clear all
        </Button>
      )}
    </div>
  );
};

interface SelectionGuidanceProps {
  count: number;
  minTeams: number;
  maxTeams: number;
  isAtMaximum: boolean;
}

const SelectionGuidance: React.FC<SelectionGuidanceProps> = ({
  count,
  minTeams,
  maxTeams,
  isAtMaximum,
}) => (
  <div className="text-xs text-muted-foreground border-t pt-2">
    <div className="flex justify-between">
      <span>Minimum: {minTeams} teams</span>
      <span>Maximum: {maxTeams} teams</span>
    </div>
    {count >= minTeams && !isAtMaximum && (
      <div className="mt-1 text-blue-600 font-medium">
        ✓ Ready to create bracket • Add more teams or click &quot;Create Bracket&quot;
      </div>
    )}
  </div>
);

interface SelectionSummaryCardProps {
  formState: SafeFormState;
  statusDisplay: StatusDisplay;
  minTeams: number;
  maxTeams: number;
}

/** Header card: how many are picked, progress, guidance and any error or warning. */
const SelectionSummaryCard: React.FC<SelectionSummaryCardProps> = ({
  formState,
  statusDisplay,
  minTeams,
  maxTeams,
}) => (
  <Card>
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg">Select Teams</CardTitle>
        <Badge variant={formState.isValid ? 'default' : 'secondary'}>
          {formState.count}/{maxTeams}
        </Badge>
      </div>
    </CardHeader>
    <CardContent className="space-y-3">
      <Progress value={formState.progress.percentage} className="w-full" />

      <StatusLine
        statusDisplay={statusDisplay}
        message={formState.statusMessage}
        hasSelection={formState.hasSelection}
        onClear={formState.clearSelection}
      />

      <SelectionGuidance
        count={formState.count}
        minTeams={minTeams}
        maxTeams={maxTeams}
        isAtMaximum={formState.isAtMaximum}
      />

      {/* Error/Warning messages */}
      {formState.errorMessage && (
        <div className="text-sm text-destructive-text bg-destructive/10 p-2 rounded border border-destructive/20">
          {formState.errorMessage}
        </div>
      )}

      {formState.warningMessage && (
        <div className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-800">
          {formState.warningMessage}
        </div>
      )}
    </CardContent>
  </Card>
);

interface TeamsGridCardProps {
  totalTeams: number;
  hasTeams: boolean;
  children: React.ReactNode;
}

const TeamsGridCard: React.FC<TeamsGridCardProps> = ({ totalTeams, hasTeams, children }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Available Teams ({totalTeams})</CardTitle>
    </CardHeader>
    <CardContent>
      {hasTeams ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{children}</div>
      ) : (
        <div className="text-center py-4 text-muted-foreground">
          No teams available for selection
        </div>
      )}
    </CardContent>
  </Card>
);

/**
 * Team selection form component
 * Displays available teams with selection controls and validation feedback
 */
const TeamSelectionFormComponent: React.FC<TeamSelectionFormProps> = ({
  teams,
  formState,
  maxTeams,
  minTeams,
  divisionId,
  seedValidation,
  onSeedChange,
}) => {
  const [activeTab, setActiveTab] = useState<'select' | 'seeds'>('select');

  // Initialize form state manager for coordinated state management
  const formStateManager = useFormStateManager(
    teams,
    formState,
    seedValidation ?? EMPTY_SEED_VALIDATION,
    onSeedChange
  );
  // Ensure we have valid arrays and objects to prevent React error #300
  const validTeams = Array.isArray(teams) ? teams : [];

  // Ensure formState has all required properties with proper defaults
  const safeFormState = buildSafeFormState(formState, {
    percentage: 0,
  });

  /**
   * Renders team selection button with appropriate styling based on selection state
   */
  const renderTeamButton = (team: ProcessedTeam) => {
    if (!team || !team.id) return null;

    const isSelected = safeFormState.selected.has(team.id);
    const canSelect = !isSelected && safeFormState.canSelectMore;
    const isDisabled = !isSelected && !canSelect;

    // Check if this team has seed conflicts or pending changes
    const hasConflict = seedValidation?.conflicts?.some((c) => c.team_id === team.id) || false;
    const isPending = formStateManager.seedManagementState.state.pendingChanges.has(team.id);
    const isManual = formStateManager.seedManagementState.state.mode === 'manual';

    return (
      <Button
        key={team.id}
        variant={isSelected ? 'default' : 'outline'}
        size="sm"
        onClick={() => safeFormState.handleTeamToggle(team.id)}
        disabled={isDisabled}
        className={`
          flex items-center gap-2 p-3 h-auto justify-start overflow-hidden min-w-[240px]
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
              className="size-6 object-contain shrink-0"
            />
          ) : (
            <Users className="size-4 shrink-0" />
          )}
          <span className="font-medium truncate flex-1 min-w-0">{team.name || 'Unnamed Team'}</span>
        </div>

        <div className="shrink-0">
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
          <div className="flex items-center gap-1 text-xs opacity-75 shrink-0">
            <Zap className="size-3" />
            <span>{Math.round(team.powerScore)}</span>
          </div>
        )}
      </Button>
    );
  };

  // Calculate status color and icon
  const getStatusDisplay = (): StatusDisplay => {
    if (safeFormState.hasError) {
      return { color: 'text-destructive-text', icon: AlertCircle };
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

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'select' | 'seeds')}>
        <TabHeader
          hasUnsavedChanges={formStateManager.hasUnsavedChanges}
          canSave={formStateManager.canSave}
          onCancel={formStateManager.cancelAllChanges}
          onSave={formStateManager.saveAllChanges}
        />

        <TabsContent value="select" className="space-y-4">
          <SelectionSummaryCard
            formState={safeFormState}
            statusDisplay={statusDisplay}
            minTeams={minTeams}
            maxTeams={maxTeams}
          />

          <TeamsGridCard
            totalTeams={validTeams.length}
            hasTeams={formStateManager.syncedTeams.length > 0}
          >
            {formStateManager.syncedTeams.map(renderTeamButton)}
          </TeamsGridCard>
        </TabsContent>

        <TabsContent value="seeds" className="space-y-4">
          <SeedOverrideControls
            teams={formStateManager.syncedTeams}
            divisionId={divisionId || ''}
            validation={seedValidation ?? EMPTY_SEED_VALIDATION}
            onSeedChange={onSeedChange}
            show={Boolean(divisionId && seedValidation)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export const TeamSelectionForm = React.memo(TeamSelectionFormComponent);
