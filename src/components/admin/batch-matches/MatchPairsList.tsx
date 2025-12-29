import React from "react";
import { Team } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TeamLogo from "@/components/ui/team/TeamLogo";
import { DestructiveIconButton } from "@/components/ui/destructive-icon-button";

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

const MatchPairsList: React.FC<MatchPairsListProps> = ({
  pairs,
  teams,
  onUpdate,
  onRemove
}) => {
  if (pairs.length === 0) {
    return (
      <div className="text-center py-6 border rounded-lg bg-slate-50 dark:bg-slate-900 text-muted-foreground">
        <p>No match pairs added yet</p>
        <p className="text-sm mt-1">Add teams to create match pairings</p>
      </div>
    );
  }

  const getTeamById = (id: string | null) => {
    if (!id) return null;
    return teams.find(t => t.id === id) || null;
  };

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
    '10:00 PM'
  ];

  return (
    <div className="space-y-3">
      {pairs.map(pair => (
        <div key={pair.id} className="p-3 border rounded-lg bg-white dark:bg-slate-950 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Team 1 Selection */}
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Team 1</label>
              <Select
                value={pair.team1Id || ''}
                onValueChange={(value) => onUpdate(pair.id, { team1Id: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team">
                    {pair.team1Id && (
                      <div className="flex items-center gap-2">
                        <TeamLogo 
                          imageUrl={getTeamById(pair.team1Id)?.imageUrl || ''}
                          teamName={getTeamById(pair.team1Id)?.name || ''}
                          className="h-4 w-4"
                        />
                        <span>{getTeamById(pair.team1Id)?.name}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <div className="max-h-[300px] overflow-auto">
                    {teams
                      .filter(team => team.id !== pair.team2Id)
                      .map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <TeamLogo 
                              imageUrl={team.imageUrl || ''}
                              teamName={team.name}
                              className="h-4 w-4"
                            />
                            <span>{team.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </div>
                </SelectContent>
              </Select>
            </div>

            {/* VS Symbol */}
            <div className="flex items-center justify-center">
              <span className="text-sm font-medium text-muted-foreground">VS</span>
            </div>

            {/* Team 2 Selection */}
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Team 2</label>
              <Select
                value={pair.team2Id || ''}
                onValueChange={(value) => onUpdate(pair.id, { team2Id: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select team">
                    {pair.team2Id && (
                      <div className="flex items-center gap-2">
                        <TeamLogo 
                          imageUrl={getTeamById(pair.team2Id)?.imageUrl || ''}
                          teamName={getTeamById(pair.team2Id)?.name || ''}
                          className="h-4 w-4"
                        />
                        <span>{getTeamById(pair.team2Id)?.name}</span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <div className="max-h-[300px] overflow-auto">
                    {teams
                      .filter(team => team.id !== pair.team1Id)
                      .map(team => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <TeamLogo 
                              imageUrl={team.imageUrl || ''}
                              teamName={team.name}
                              className="h-4 w-4"
                            />
                            <span>{team.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </div>
                </SelectContent>
              </Select>
            </div>

            {/* Timeslot Selection */}
            <div className="md:w-[150px]">
              <label className="text-xs text-muted-foreground mb-1 block">Timeslot</label>
              <Select
                value={pair.timeslot || ''}
                onValueChange={(value) => onUpdate(pair.id, { timeslot: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {timeSlotOptions.map(time => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Delete Button */}
            <div className="flex items-end justify-end pb-0.5 mt-auto">
              <DestructiveIconButton
                onClick={() => onRemove(pair.id)}
                title="Remove match pair"
                size="sm"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MatchPairsList;
