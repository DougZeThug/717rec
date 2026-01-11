import { ChevronRight } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { TimeBlockTeamsMap } from '@/types/autoSchedule';
import {
  generateTeamDistributionSummary,
  handleOddTeams,
  validateTeamCounts,
} from '@/utils/autoSchedule/edgeCaseUtils';

import SchedulePreview from './SchedulePreview';
import { WarningDisplay } from './WarningDisplay';

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
  onGenerateSchedule,
}) => {
  // Check for blocks with insufficient teams
  const { insufficientBlocks, hasOddBlocks } = validateTeamCounts(timeBlockTeams);

  // Get details about unmatched teams if we have odd blocks
  const { unmatchedTeamDetails: rawUnmatchedTeamDetails } = hasOddBlocks
    ? handleOddTeams(timeBlockTeams)
    : { unmatchedTeamDetails: [] };

  // Transform unmatchedTeamDetails to match expected format
  const unmatchedTeamDetails = rawUnmatchedTeamDetails.map((detail) => ({
    timeBlock: detail.block,
    team: {
      id: detail.teamId,
      name: detail.teamName,
    },
  }));

  // Generate distribution summary
  const distribution = generateTeamDistributionSummary(timeBlockTeams);

  const hasTeamsLoaded = Object.keys(timeBlockTeams).length > 0;

  // Don't disable generate button just because we have odd blocks
  const canGenerate =
    !isLoading && totalTeams > 0 && insufficientBlocks.length < Object.keys(timeBlockTeams).length;

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center mb-2">
        <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">
          1
        </div>
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
          {isLoading ? 'Loading Teams...' : 'Preview Available Teams'}
        </Button>
      </div>

      {/* Only show preview if teams are loaded */}
      {hasTeamsLoaded && (
        <div className="pl-8 mb-4">
          {totalTeams > 0 && (
            <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-md border">
              <h5 className="font-medium mb-1 text-sm">Team Distribution</h5>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  Total Teams: <span className="font-semibold">{distribution.totalTeams}</span>
                </div>
                <div>
                  Potential Matches:{' '}
                  <span className="font-semibold">{distribution.totalMatches}</span>
                </div>
                {distribution.unpairedTeams > 0 && (
                  <div className="col-span-2 text-amber-600">
                    Unmatched Teams:{' '}
                    <span className="font-semibold">{distribution.unpairedTeams}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <SchedulePreview
            timeBlockTeams={timeBlockTeams}
            date={selectedDate}
            unmatchedTeamIds={unmatchedTeamIds}
          />

          {/* Display warnings for odd blocks or insufficient teams */}
          {(oddBlocks > 0 || insufficientBlocks.length > 0) && (
            <WarningDisplay
              oddBlocks={oddBlocks}
              unmatchedTeams={unmatchedTeamIds?.length || unmatchedTeamDetails.length}
              insufficientBlocks={insufficientBlocks}
              unmatchedTeamDetails={unmatchedTeamDetails}
            />
          )}

          <div className="mt-4 flex justify-end">
            <Button
              variant="default"
              size="sm"
              onClick={onGenerateSchedule}
              disabled={isLoading || totalTeams === 0 || !canGenerate}
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
