
import React from "react";
import { Team } from "@/types";
import { TimeBlockTeamsMap } from "@/types/autoSchedule";
import { WarningDisplay } from "@/components/admin/batch-matches/auto-schedule/WarningDisplay";
import SchedulePreview from "@/components/admin/batch-matches/auto-schedule/SchedulePreview";
import { validateTeamCounts } from "@/utils/autoSchedule/edgeCaseUtils";

interface TeamsTabProps {
  timeBlockTeams: TimeBlockTeamsMap;
  selectedDate: Date | null;
  unmatchedTeamIds: string[];
  oddBlocks: number;
  totalTeams: number;
}

const TeamsTab: React.FC<TeamsTabProps> = ({
  timeBlockTeams,
  selectedDate,
  unmatchedTeamIds,
  oddBlocks,
  totalTeams
}) => {
  // Check for blocks with insufficient teams
  const { insufficientBlocks } = validateTeamCounts(timeBlockTeams);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Teams by Time Block</h3>
      <p className="text-sm text-muted-foreground">
        Review teams assigned to each time block before generating the schedule.
      </p>
      
      {totalTeams > 0 ? (
        <SchedulePreview 
          timeBlockTeams={timeBlockTeams}
          date={selectedDate}
          unmatchedTeamIds={unmatchedTeamIds}
        />
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>Select a date and load teams to preview schedule</p>
        </div>
      )}
      
      {(oddBlocks > 0 || insufficientBlocks.length > 0) && (
        <WarningDisplay
          oddBlocks={oddBlocks}
          unmatchedTeams={unmatchedTeamIds?.length || 0}
          insufficientBlocks={insufficientBlocks}
        />
      )}
    </div>
  );
};

export default TeamsTab;
