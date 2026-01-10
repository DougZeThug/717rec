import { Clock } from 'lucide-react';
import React from 'react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Team } from '@/types';
import { validateTeamCounts } from '@/utils/autoSchedule/edgeCaseUtils';

import { TimeBlockTeamsList } from './TimeBlockTeamsList';

interface SchedulePreviewProps {
  timeBlockTeams: Record<string, Team[]>;
  date: Date | null;
  unmatchedTeamIds?: string[];
}

const SchedulePreview: React.FC<SchedulePreviewProps> = ({
  timeBlockTeams,
  date,
  unmatchedTeamIds = [],
}) => {
  // Check if we have teams loaded
  const hasTeams = Object.values(timeBlockTeams).some((teams) => teams?.length > 0);

  // Validate team counts
  const { insufficientBlocks } = validateTeamCounts(timeBlockTeams);

  if (!date || !hasTeams) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Select a date and load teams to preview schedule</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Teams Available by Time Block</h3>

      {Object.entries(timeBlockTeams).map(([block, teams]) => (
        <Card key={block} className="overflow-hidden">
          <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{block} Block</span>
            </div>
            <Badge variant={teams.length % 2 === 0 ? 'outline' : 'destructive'} className="text-xs">
              {teams.length} Teams {teams.length % 2 !== 0 && '(Odd Number)'}
            </Badge>
          </div>
          <CardContent className="p-3">
            <TimeBlockTeamsList
              teams={teams}
              unmatchedTeamIds={unmatchedTeamIds.filter((id) =>
                teams.some((team) => team.id === id)
              )}
            />
          </CardContent>
        </Card>
      ))}

      {insufficientBlocks.length > 0 && (
        <div className="text-sm text-amber-500 mt-2">
          <p>Note: Some time blocks have insufficient teams to create matches.</p>
        </div>
      )}
    </div>
  );
};

export default SchedulePreview;
