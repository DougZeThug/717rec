import { Check } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TeamLogo } from '@/components/ui/team/TeamLogo';
import { Team } from '@/types';

interface TimeslotTeamGridProps {
  /** Teams with no booking on the chosen date. */
  availableTeams: Team[];
  selectedTeamIds: string[];
  onToggleTeam: (teamId: string) => void;
  onSelectAll: () => void;
}

/** Picks which teams a block is booked for. Lifted out of TimeslotAssignment. */
export const TimeslotTeamGrid: React.FC<TimeslotTeamGridProps> = ({
  availableTeams,
  selectedTeamIds,
  onToggleTeam,
  onSelectAll,
}) => (
  <div className="space-y-1.5">
    <div className="flex justify-between items-center">
      <span className="block text-sm font-medium">Team Selection Grid</span>
      <Button type="button" variant="outline" size="sm" onClick={onSelectAll}>
        {selectedTeamIds.length === availableTeams.length ? 'Deselect All' : 'Select All'}
      </Button>
    </div>

    <ScrollArea className="h-[200px] border rounded-md p-2">
      {availableTeams.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          All teams have been assigned for this date
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {availableTeams.map((team) => {
            const isSelected = selectedTeamIds.includes(team.id);
            return (
              <div
                key={team.id}
                role="button"
                tabIndex={0}
                title={team.name}
                aria-pressed={isSelected}
                onClick={() => onToggleTeam(team.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggleTeam(team.id);
                  }
                }}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-colors text-left cursor-pointer ${
                  isSelected ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'
                }`}
              >
                <TeamLogo imageUrl={team.imageUrl || team.logoUrl} teamName={team.name} size="sm" />
                {/* Two lines rather than an ellipsis: "Baggin' & Braggin'"
                          and "Baggin Rights" both read "Baggin…" cut short. */}
                <span className="line-clamp-2 flex-1 break-words text-xs font-medium">
                  {team.name}
                </span>
                <div
                  className={`size-4 shrink-0 rounded-sm border flex items-center justify-center ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-primary'
                  }`}
                >
                  {isSelected && <Check className="size-3" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ScrollArea>

    {selectedTeamIds.length > 0 && (
      <div className="text-sm text-primary dark:!text-blue-200">
        {selectedTeamIds.length} team{selectedTeamIds.length !== 1 ? 's' : ''} selected
      </div>
    )}
  </div>
);
