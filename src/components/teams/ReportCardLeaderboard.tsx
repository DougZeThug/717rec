import { ListOrdered } from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LeaderboardEntry, useAllTeamReportCards } from '@/hooks/useAllTeamReportCards';
import { ReportCardMode } from '@/hooks/useTeamReportCard';
import { cn } from '@/lib/utils';
import { getGradeColor } from '@/utils/reportCardUtils';

import { TeamLogo } from '../ui/team/TeamLogo';

interface ReportCardLeaderboardProps {
  teamId: string;
  initialMode: ReportCardMode;
}

const LeaderboardRow: React.FC<{
  entry: LeaderboardEntry;
  rank: number;
  isCurrentTeam: boolean;
}> = ({ entry, rank, isCurrentTeam }) => {
  const getGpaColor = (gpa: number) => {
    if (gpa >= 3.5) return 'text-emerald-600 dark:text-emerald-400';
    if (gpa >= 3.0) return 'text-blue-600 dark:text-blue-400';
    if (gpa >= 2.0) return 'text-amber-600 dark:text-amber-400';
    if (gpa >= 1.0) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg',
        isCurrentTeam && 'bg-primary/10 border border-primary/20'
      )}
    >
      <span className="text-sm font-mono text-muted-foreground w-6 text-right shrink-0">
        {rank}
      </span>
      <TeamLogo imageUrl={entry.logoUrl} teamName={entry.teamName} size="sm" />
      <span className={cn('text-sm font-medium truncate flex-1', isCurrentTeam && 'font-semibold')}>
        {entry.teamName}
      </span>
      <span className={cn('text-sm font-bold font-mono shrink-0', getGpaColor(entry.gpa))}>
        {entry.gpa.toFixed(2)}
      </span>
      <span
        className={cn(
          'text-sm font-bold font-mono w-7 text-right shrink-0',
          getGradeColor(entry.overallGrade)
        )}
      >
        {entry.overallGrade}
      </span>
    </div>
  );
};

const ReportCardLeaderboard: React.FC<ReportCardLeaderboardProps> = ({ teamId, initialMode }) => {
  const [mode, setMode] = useState<ReportCardMode>(initialMode);
  const { leaderboard, isLoading } = useAllTeamReportCards(mode);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
          <ListOrdered className="h-3.5 w-3.5" />
          View All GPAs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">GPA Leaderboard</DialogTitle>
        </DialogHeader>

        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => {
            if (v) setMode(v as ReportCardMode);
          }}
          className="justify-start"
          size="sm"
        >
          <ToggleGroupItem value="season" className="text-xs px-3">
            Season
          </ToggleGroupItem>
          <ToggleGroupItem value="career" className="text-xs px-3">
            Career
          </ToggleGroupItem>
        </ToggleGroup>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="space-y-2 p-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data available yet.</p>
          ) : (
            <div className="space-y-1 p-1">
              {leaderboard.map((entry, idx) => (
                <LeaderboardRow
                  key={entry.teamId}
                  entry={entry}
                  rank={idx + 1}
                  isCurrentTeam={entry.teamId === teamId}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ReportCardLeaderboard;
