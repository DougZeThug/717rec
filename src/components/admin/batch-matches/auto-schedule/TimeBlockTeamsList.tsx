import { Users } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { InlineEmptyState } from '@/components/ui/inline-empty-state';
import TeamLogo from '@/components/ui/team/TeamLogo';
import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { Team } from '@/types';

interface TimeBlockTeamsListProps {
  teams: Team[];
  unmatchedTeamIds?: string[];
  isInteractive?: boolean;
  selectedTeamIds?: string[];
  onTeamToggle?: (teamId: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
}

export const TimeBlockTeamsList: React.FC<TimeBlockTeamsListProps> = ({
  teams,
  unmatchedTeamIds = [],
  isInteractive = false,
  selectedTeamIds = [],
  onTeamToggle,
  onSelectAll,
  onDeselectAll,
}) => {
  const { isWinterTheme } = useSeasonalThemeBase();
  if (teams.length === 0) {
    return (
      <InlineEmptyState
        icon={Users}
        message="No Teams in This Block"
        description="Load teams for the selected date or assign teams to this time block."
        className="py-4"
      />
    );
  }

  const allSelected = teams.length > 0 && teams.every((team) => selectedTeamIds.includes(team.id));
  const someSelected = selectedTeamIds.some((id) => teams.some((team) => team.id === id));

  return (
    <div className="space-y-3">
      {isInteractive && (
        <div className="flex items-center gap-2 py-2 border-b border-border">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(checked) => {
              if (checked) {
                onSelectAll?.();
              } else {
                onDeselectAll?.();
              }
            }}
            className="h-4 w-4"
          />
          <span className="text-sm text-muted-foreground">
            {allSelected ? 'Deselect All' : someSelected ? 'Select All' : 'Select All'}
            {someSelected &&
              !allSelected &&
              ` (${selectedTeamIds.filter((id) => teams.some((team) => team.id === id)).length}/${teams.length})`}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {teams.map((team) => {
          const isUnmatched = unmatchedTeamIds.includes(team.id);
          const isSelected = selectedTeamIds.includes(team.id);

          return (
            <div
              key={team.id}
              className={`
                flex items-center gap-2 p-2 border rounded-md transition-colors
                ${
                  isUnmatched
                    ? isWinterTheme
                      ? 'border-amber-500/40 bg-amber-900/30'
                      : 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20'
                    : ''
                }
                ${isInteractive ? 'cursor-pointer hover:bg-accent/50' : ''}
                ${isSelected ? 'bg-primary/10 border-primary' : ''}
              `}
              onClick={isInteractive ? () => onTeamToggle?.(team.id) : undefined}
            >
              {isInteractive && (
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onTeamToggle?.(team.id)}
                  className="h-4 w-4"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <TeamLogo
                imageUrl={team.imageUrl || team.logoUrl}
                teamName={team.name}
                className="h-6 w-6"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm truncate block">{team.name}</span>
                {isUnmatched && (
                  <Badge
                    variant="outline"
                    className={`text-xs mt-1 ${
                      isWinterTheme
                        ? 'bg-amber-900/50 border-amber-500/40 text-amber-200'
                        : 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    Unmatched
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
