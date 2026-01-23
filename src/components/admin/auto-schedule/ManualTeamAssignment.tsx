import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingState } from '@/components/ui/loading-state';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeamsQuery } from '@/hooks/teams';
import { useToast } from '@/hooks/useToast';
import { TimeBlockTeamsMap } from '@/types/autoSchedule';
import { TIME_BLOCKS } from '@/utils/autoSchedule/constants';
import { errorLog } from '@/utils/logger';

interface ManualTeamAssignmentProps {
  selectedDate: Date | null;
  onTeamsAssigned: (timeBlockTeams: TimeBlockTeamsMap) => void;
}

const ManualTeamAssignment: React.FC<ManualTeamAssignmentProps> = ({
  selectedDate,
  onTeamsAssigned,
}) => {
  const { data: teams, isLoading } = useTeamsQuery();
  const { toast } = useToast();
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<string>('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Handle team selection toggle
  const handleTeamToggle = (teamId: string) => {
    setSelectedTeamIds((prev) => {
      if (prev.includes(teamId)) {
        return prev.filter((id) => id !== teamId);
      } else {
        return [...prev, teamId];
      }
    });
  };

  // Handle manual assignment of teams to time block
  const handleAssignTeams = async () => {
    if (!selectedDate) {
      toast({
        title: 'Date Required',
        description: 'Please select a date before assigning teams.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedTimeBlock) {
      toast({
        title: 'Time Block Required',
        description: 'Please select a time block for the teams.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedTeamIds.length === 0) {
      toast({
        title: 'No Teams Selected',
        description: 'Please select at least one team to assign.',
        variant: 'destructive',
      });
      return;
    }

    setIsAssigning(true);

    try {
      // Create a map of the manually assigned teams
      const assignedTeams: TimeBlockTeamsMap = {};

      // Find the selected teams from the team data
      if (teams) {
        const selectedTeams = teams.filter((team) => selectedTeamIds.includes(team.id));
        assignedTeams[selectedTimeBlock] = selectedTeams;
      }

      // Call the callback to update parent component state
      onTeamsAssigned(assignedTeams);

      toast({
        title: 'Teams Assigned',
        description: `${selectedTeamIds.length} teams assigned to ${selectedTimeBlock} time block.`,
      });

      // Reset selection after successful assignment
      setSelectedTeamIds([]);
    } catch (error) {
      errorLog('Error assigning teams manually:', error);
      toast({
        title: 'Assignment Error',
        description: 'There was an error assigning teams. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading teams..." size="sm" />;
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Manually Assign Teams</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-1 block">Time Block</label>
            <Select value={selectedTimeBlock} onValueChange={setSelectedTimeBlock}>
              <SelectTrigger>
                <SelectValue placeholder="Select time block" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(TIME_BLOCKS).map((block) => (
                  <SelectItem key={block} value={block}>
                    {block} Block
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-none mt-auto">
            <Button
              onClick={handleAssignTeams}
              disabled={isAssigning || !selectedTimeBlock || selectedTeamIds.length === 0}
            >
              {isAssigning ? 'Assigning...' : 'Assign Teams'}
            </Button>
          </div>
        </div>

        {selectedTimeBlock && (
          <div className="border rounded-md p-4">
            <h4 className="font-medium mb-2">Select Teams for {selectedTimeBlock} Block</h4>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {teams && teams.length > 0 ? (
                teams.map((team) => (
                  <div key={team.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`team-${team.id}`}
                      checked={selectedTeamIds.includes(team.id)}
                      onCheckedChange={() => handleTeamToggle(team.id)}
                    />
                    <label
                      htmlFor={`team-${team.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {team.name}
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No teams available</p>
              )}
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              {selectedTeamIds.length} teams selected
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ManualTeamAssignment;
