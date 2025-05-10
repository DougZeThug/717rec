
import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { TimeBlockTeamsMap } from "@/types/autoSchedule";
import SchedulePreview from "./SchedulePreview";
import { WarningDisplay } from "./WarningDisplay";
import { validateTeamCounts } from "@/utils/autoSchedule/edgeCaseUtils";

interface TeamLoadingStepProps {
  isLoading: boolean;
  selectedDate: Date | null;
  timeBlockTeams: TimeBlockTeamsMap;
  totalTeams: number;
  unmatchedTeamIds?: string[];
  oddBlocks: number;
  onLoadTeams: () => Promise<void>;
  onGenerateSchedule: () => Promise<void>;
}

export const TeamLoadingStep: React.FC<TeamLoadingStepProps> = ({
  isLoading,
  selectedDate,
  timeBlockTeams,
  totalTeams,
  unmatchedTeamIds = [],
  oddBlocks,
  onLoadTeams,
  onGenerateSchedule
}) => {
  // Check for blocks with insufficient teams
  const { insufficientBlocks } = validateTeamCounts(timeBlockTeams);
  const hasTeamsLoaded = Object.keys(timeBlockTeams).length > 0;

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center mb-2">
        <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">1</div>
        <h4 className="font-medium">Load Available Teams</h4>
      </div>
      <div className="pl-8">
        <p className="text-sm text-muted-foreground mb-2">
          Load teams that have been assigned to time blocks for this date
        </p>
        <Button
          variant="secondary"
          size="sm"
          onClick={onLoadTeams}
          disabled={isLoading || !selectedDate}
          className="w-full mb-4"
        >
          {isLoading ? "Loading Teams..." : "Preview Available Teams"}
        </Button>
      </div>
      
      {/* Only show preview if teams are loaded */}
      {hasTeamsLoaded && (
        <div className="pl-8 mb-4">
          <SchedulePreview 
            timeBlockTeams={timeBlockTeams}
            date={selectedDate}
            unmatchedTeamIds={unmatchedTeamIds}
          />
          
          {/* Display warnings for odd blocks or insufficient teams */}
          {(oddBlocks > 0 || insufficientBlocks.length > 0) && (
            <WarningDisplay
              oddBlocks={oddBlocks}
              unmatchedTeams={unmatchedTeamIds?.length || 0}
              insufficientBlocks={insufficientBlocks}
            />
          )}
          
          <div className="mt-4 flex justify-end">
            <Button
              variant="default"
              size="sm"
              onClick={onGenerateSchedule}
              disabled={isLoading || totalTeams === 0 || insufficientBlocks.length === Object.keys(timeBlockTeams).length}
              className="flex items-center"
            >
              Generate Match Pairings <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
