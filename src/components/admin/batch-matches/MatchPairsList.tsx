import React from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { DestructiveIconButton } from '@/components/ui/destructive-icon-button';
import TeamLogo from '@/components/ui/team/TeamLogo';
import { Team } from '@/types';

export interface MatchPair {
  id: string;
  team1Id: string | null;
  team2Id: string | null;
  timeslot: string | null;
}

interface MatchPairsListProps {
  pairs: MatchPair[];
  teams: Team[];
  onUpdate: (id: string, updates: Partial<MatchPair>) => void;
  onRemove: (id: string) => void;
}

const timeSlotOptions = [
  '5:00 PM',
  '5:30 PM',
  '6:00 PM',
  '6:30 PM',
  '7:00 PM',
  '7:30 PM',
  '8:00 PM',
  '8:30 PM',
  '9:00 PM',
  '9:30 PM',
  '10:00 PM',
];

const MatchPairsList: React.FC<MatchPairsListProps> = ({ pairs, teams, onUpdate, onRemove }) => {
  if (pairs.length === 0) {
    return (
      <div className="text-center py-6 border rounded-lg bg-card text-muted-foreground">
        <p>No match pairs added yet</p>
        <p className="text-sm mt-1">Add teams to create match pairings</p>
      </div>
    );
  }

  // Collect all selected team IDs across all pairs
  const allSelectedTeamIds = new Set<string>();
  pairs.forEach((pair) => {
    if (pair.team1Id) allSelectedTeamIds.add(pair.team1Id);
    if (pair.team2Id) allSelectedTeamIds.add(pair.team2Id);
  });

  return (
    <div className="space-y-2">
      {pairs.map((pair, index) => {
        // Teams available for team1: exclude team2 of this pair and teams used in OTHER pairs
        const otherPairTeamIds = new Set<string>();
        pairs.forEach((p) => {
          if (p.id === pair.id) return;
          if (p.team1Id) otherPairTeamIds.add(p.team1Id);
          if (p.team2Id) otherPairTeamIds.add(p.team2Id);
        });

        return (
          <div key={pair.id} className="p-3 border rounded-lg bg-card shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Match {index + 1}
              </span>
              <DestructiveIconButton
                onClick={() => onRemove(pair.id)}
                title="Remove match pair"
                size="sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              {/* Team 1 Selection */}
              <p className="text-xs font-medium text-muted-foreground">Select Team 1</p>
              <div className="max-h-[180px] overflow-y-auto border rounded-md p-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  {teams
                    .filter((t) => t.id !== pair.team2Id)
                    .map((team) => {
                      const isSelected = pair.team1Id === team.id;
                      const isUsedElsewhere = otherPairTeamIds.has(team.id);
                      return (
                        <button
                          key={team.id}
                          type="button"
                          disabled={isUsedElsewhere}
                          onClick={() =>
                            onUpdate(pair.id, { team1Id: isSelected ? null : team.id })
                          }
                          className={`flex items-center gap-1.5 p-1.5 border rounded text-left transition-colors
                            ${isSelected ? 'border-primary bg-primary/10' : 'border-border'}
                            ${isUsedElsewhere ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-accent/50'}
                          `}
                        >
                          <TeamLogo
                            imageUrl={team.imageUrl || ''}
                            teamName={team.name}
                            className="h-7 w-7 min-w-7 min-h-7 shrink-0"
                          />
                          <span className="text-xs truncate flex-1">{team.name}</span>
                          <Checkbox
                            checked={isSelected}
                            className="pointer-events-none shrink-0"
                            tabIndex={-1}
                          />
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* VS Divider */}
              <div className="text-center">
                <span className="text-xs font-bold text-muted-foreground">VS</span>
              </div>

              {/* Team 2 Selection */}
              <p className="text-xs font-medium text-muted-foreground">Select Team 2</p>
              <div className="max-h-[180px] overflow-y-auto border rounded-md p-1.5">
                <div className="grid grid-cols-2 gap-1.5">
                  {teams
                    .filter((t) => t.id !== pair.team1Id)
                    .map((team) => {
                      const isSelected = pair.team2Id === team.id;
                      const isUsedElsewhere = otherPairTeamIds.has(team.id);
                      return (
                        <button
                          key={team.id}
                          type="button"
                          disabled={isUsedElsewhere}
                          onClick={() =>
                            onUpdate(pair.id, { team2Id: isSelected ? null : team.id })
                          }
                          className={`flex items-center gap-1.5 p-1.5 border rounded text-left transition-colors
                            ${isSelected ? 'border-primary bg-primary/10' : 'border-border'}
                            ${isUsedElsewhere ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-accent/50'}
                          `}
                        >
                          <TeamLogo
                            imageUrl={team.imageUrl || ''}
                            teamName={team.name}
                            className="h-7 w-7 min-w-7 min-h-7 shrink-0"
                          />
                          <span className="text-xs truncate flex-1">{team.name}</span>
                          <Checkbox
                            checked={isSelected}
                            className="pointer-events-none shrink-0"
                            tabIndex={-1}
                          />
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Timeslot Chips */}
              <p className="text-xs font-medium text-muted-foreground">Select Timeslot</p>
              <div className="flex flex-wrap gap-1.5">
                {timeSlotOptions.map((time) => {
                  const isSelected = pair.timeslot === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() =>
                        onUpdate(pair.id, { timeslot: isSelected ? null : time })
                      }
                      className={`px-2.5 py-1 text-xs rounded-full border transition-colors
                        ${isSelected ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-foreground hover:bg-accent/50'}
                      `}
                    >
                      {time}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MatchPairsList;
