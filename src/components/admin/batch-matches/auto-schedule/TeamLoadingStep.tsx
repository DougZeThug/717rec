
import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { TimeBlockTeamsMap } from "@/types/autoSchedule";
import SchedulePreview from "./SchedulePreview";

interface TeamLoadingStepProps {
  isLoading: boolean;
  selectedDate: Date | null;
  timeBlockTeams: TimeBlockTeamsMap;
  totalTeams: number;
  onLoadTeams: () => Promise<void>;
  onGenerateSchedule: () => Promise<void>;
}

export const TeamLoadingStep: React.FC<TeamLoadingStepProps> = ({
  isLoading,
  selectedDate,
  timeBlockTeams,
  totalTeams,
  onLoadTeams,
  onGenerateSchedule
}) => {
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
      {Object.keys(timeBlockTeams).length > 0 && (
        <div className="pl-8 mb-4">
          <SchedulePreview 
            timeBlockTeams={timeBlockTeams}
            date={selectedDate}
          />
          
          <div className="mt-4 flex justify-end">
            <Button
              variant="default"
              size="sm"
              onClick={onGenerateSchedule}
              disabled={isLoading || totalTeams === 0}
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
