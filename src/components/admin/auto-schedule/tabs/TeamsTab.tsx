import { Edit3, Eye, RotateCcw } from 'lucide-react';
import React, { useState } from 'react';

import ManualTeamAssignment from '@/components/admin/auto-schedule/ManualTeamAssignment';
import InteractiveSchedulePreview from '@/components/admin/batch-matches/auto-schedule/InteractiveSchedulePreview';
import SchedulePreview from '@/components/admin/batch-matches/auto-schedule/SchedulePreview';
import { WarningDisplay } from '@/components/admin/batch-matches/auto-schedule/WarningDisplay';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Team } from '@/types';
import { TimeBlockTeamsMap } from '@/types/autoSchedule';
import { validateTeamCounts } from '@/utils/autoSchedule/edgeCaseUtils';

interface TeamsTabProps {
  timeBlockTeams: TimeBlockTeamsMap;
  selectedDate: Date | null;
  unmatchedTeamIds: string[];
  oddBlocks: number;
  totalTeams: number;
  onManualTeamAssign?: (updatedTeams: TimeBlockTeamsMap) => void;
  originalTimeBlockTeams?: TimeBlockTeamsMap; // Store original loaded teams
}

const TeamsTab: React.FC<TeamsTabProps> = ({
  timeBlockTeams,
  selectedDate,
  unmatchedTeamIds,
  oddBlocks,
  totalTeams,
  onManualTeamAssign,
  originalTimeBlockTeams = {},
}) => {
  const [activeTab, setActiveTab] = useState<string>('auto');
  const [isEditMode, setIsEditMode] = useState(false);

  // Check for blocks with insufficient teams
  const { insufficientBlocks } = validateTeamCounts(timeBlockTeams);

  // Handle manual team assignment
  const handleTeamsAssigned = (manualTeams: TimeBlockTeamsMap) => {
    if (onManualTeamAssign) {
      // Merge manual teams with existing teams
      const updatedTeamBlocks = { ...timeBlockTeams };

      // Add manually assigned teams to the respective time blocks
      Object.entries(manualTeams).forEach(([blockKey, teams]) => {
        if (updatedTeamBlocks[blockKey]) {
          // If the block already exists, add the new teams (avoid duplicates)
          const existingTeamIds = updatedTeamBlocks[blockKey].map((team) => team.id);
          const newTeams = teams.filter((team) => !existingTeamIds.includes(team.id));
          updatedTeamBlocks[blockKey] = [...updatedTeamBlocks[blockKey], ...newTeams];
        } else {
          // If the block doesn't exist yet, create it with the selected teams
          updatedTeamBlocks[blockKey] = teams;
        }
      });

      onManualTeamAssign(updatedTeamBlocks);

      // Switch to auto tab to see the updated team list
      setActiveTab('auto');
    }
  };

  // Handle interactive team updates
  const handleTeamUpdate = (updatedTeams: TimeBlockTeamsMap) => {
    onManualTeamAssign?.(updatedTeams);
  };

  // Reset to original auto-loaded teams
  const handleResetToOriginal = () => {
    onManualTeamAssign?.(originalTimeBlockTeams);
    setIsEditMode(false);
  };

  // Check if teams have been modified from original
  const hasModifications =
    JSON.stringify(timeBlockTeams) !== JSON.stringify(originalTimeBlockTeams);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="auto">Auto-Loaded Teams</TabsTrigger>
          <TabsTrigger value="manual">Manual Assignment</TabsTrigger>
        </TabsList>

        <TabsContent value="auto" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Teams by Time Block</h3>
              <p className="text-sm text-muted-foreground">
                Review teams assigned to each time block before generating the schedule.
              </p>
            </div>

            {totalTeams > 0 && (
              <div className="flex items-center gap-2">
                {hasModifications && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetToOriginal}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset to Auto-Loaded
                  </Button>
                )}

                <Button
                  variant={isEditMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsEditMode(!isEditMode)}
                  className="flex items-center gap-2"
                >
                  {isEditMode ? (
                    <>
                      <Eye className="h-4 w-4" />
                      View Mode
                    </>
                  ) : (
                    <>
                      <Edit3 className="h-4 w-4" />
                      Edit Teams
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {totalTeams > 0 ? (
            isEditMode ? (
              <InteractiveSchedulePreview
                timeBlockTeams={timeBlockTeams}
                date={selectedDate}
                unmatchedTeamIds={unmatchedTeamIds}
                isEditMode={true}
                onTeamUpdate={handleTeamUpdate}
              />
            ) : (
              <SchedulePreview
                timeBlockTeams={timeBlockTeams}
                date={selectedDate}
                unmatchedTeamIds={unmatchedTeamIds}
              />
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Select a date and load teams to preview schedule</p>
              <p className="text-sm mt-2">
                Or use the "Manual Assignment" tab to add teams manually
              </p>
            </div>
          )}

          {(oddBlocks > 0 || insufficientBlocks.length > 0) && (
            <WarningDisplay
              oddBlocks={oddBlocks}
              unmatchedTeams={unmatchedTeamIds?.length || 0}
              insufficientBlocks={insufficientBlocks}
            />
          )}
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <ManualTeamAssignment selectedDate={selectedDate} onTeamsAssigned={handleTeamsAssigned} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TeamsTab;
