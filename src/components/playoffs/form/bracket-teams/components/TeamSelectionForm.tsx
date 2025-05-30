
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Users, Trophy, Zap } from 'lucide-react';
import { ProcessedTeam, BracketFormStateResult } from '../types';

interface TeamSelectionFormProps {
  teams: ProcessedTeam[];
  formState: BracketFormStateResult;
  maxTeams: number;
  minTeams: number;
}

/**
 * Team selection form component
 * Displays available teams with selection controls and validation feedback
 */
export const TeamSelectionForm: React.FC<TeamSelectionFormProps> = ({
  teams,
  formState,
  maxTeams,
  minTeams
}) => {
  /**
   * Renders team selection button with appropriate styling based on selection state
   */
  const renderTeamButton = (team: ProcessedTeam) => {
    const isSelected = formState.selected.has(team.id);
    const canSelect = !isSelected && formState.canSelectMore;
    const isDisabled = !isSelected && !canSelect;

    return (
      <Button
        key={team.id}
        variant={isSelected ? "default" : "outline"}
        size="sm"
        onClick={() => formState.handleTeamToggle(team.id)}
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
          <span className="font-medium">{team.name}</span>
        </div>
        
        <div className="flex items-center gap-1 text-xs opacity-75">
          <Trophy className="w-3 h-3" />
          <span>#{team.seed}</span>
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

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Select Teams</CardTitle>
            <Badge variant={formState.isValid ? "default" : "secondary"}>
              {formState.count}/{maxTeams}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={formState.progress.percentage} className="w-full" />
          
          <div className="flex items-center justify-between text-sm">
            <span className={formState.hasError ? "text-destructive" : formState.hasWarning ? "text-yellow-600" : "text-muted-foreground"}>
              {formState.statusMessage}
            </span>
            
            {formState.hasSelection && (
              <Button
                variant="ghost"
                size="sm"
                onClick={formState.clearSelection}
                className="h-auto p-1 text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            )}
          </div>

          {/* Error/Warning messages */}
          {formState.errorMessage && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {formState.errorMessage}
            </div>
          )}
          
          {formState.warningMessage && (
            <div className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
              {formState.warningMessage}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teams grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Teams ({teams.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {teams.map(renderTeamButton)}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
