import { Calendar } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router';

import {
  TimeslotGroupHeader,
  TimeslotMatchRow,
  TimeslotMatchRowMobile,
} from '@/components/schedule/timeslot-grouping/TimeslotGroupBits';
import { useTimeslotGrouping } from '@/components/schedule/timeslot-grouping/useTimeslotGrouping';
import { AppCard } from '@/components/ui/app-card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LoadingState } from '@/components/ui/loading-state';
import { TeamLogo } from '@/components/ui/team';
import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { animations, getDivisionStyles } from '@/styles/design-system';
import { TeamTimeslot } from '@/types';
import { toTeamSlug } from '@/utils/teamSlug';

interface TimeslotGroupingProps {
  groupedTimeslots: Record<string, TeamTimeslot[]>;
  isLoading: boolean;
}

interface ByeWeekDesktopRowProps {
  teamTimeslot: TeamTimeslot;
  teamIndex: number;
  isWinterTheme: boolean;
}

const ByeWeekDesktopRow = ({ teamTimeslot, teamIndex, isWinterTheme }: ByeWeekDesktopRowProps) => (
  <div
    className={cn(
      'flex items-center justify-between p-3',
      teamIndex % 2 === 1 &&
        (isWinterTheme ? 'bg-orange-900/20' : 'bg-orange-100/50 dark:bg-orange-800/10'),
      isWinterTheme ? 'hover:bg-orange-900/30' : 'hover:bg-orange-100 dark:hover:bg-orange-800/20',
      'transition-colors duration-150',
      animations.fadeInSlideUp,
      `animation-delay-${teamIndex * 100 + 100}`,
      'touch-manipulation'
    )}
  >
    <div className="flex items-center min-w-0 flex-1 gap-6">
      <div className="shrink-0">
        <TeamLogo
          imageUrl={teamTimeslot.teams?.image_url || teamTimeslot.teams?.logo_url}
          teamName={teamTimeslot.teams?.name || 'Unknown Team'}
          teamId={teamTimeslot.team_id}
          size="sm"
          clickable
        />
      </div>
      <div className="flex flex-col min-w-0">
        {teamTimeslot.teams?.name ? (
          <Link
            to={`/teams/${toTeamSlug(teamTimeslot.teams.name)}`}
            className={cn(
              'font-medium text-base truncate hover:underline transition-all duration-200',
              isWinterTheme ? 'text-orange-300' : 'text-orange-800 dark:text-orange-200'
            )}
          >
            {teamTimeslot.teams.name}
          </Link>
        ) : (
          <span className="text-muted-foreground dark:text-muted-foreground truncate">
            Unknown Team
          </span>
        )}
        <span
          className={cn(
            'text-xs',
            isWinterTheme ? 'text-orange-400' : 'text-orange-600 dark:text-orange-300'
          )}
        >
          Not playing this week
        </span>
      </div>
    </div>

    {teamTimeslot.teams?.divisionName && (
      <Badge
        className={cn(
          'ml-2 text-xs font-medium px-2.5 py-0.5 shrink-0',
          getDivisionStyles(teamTimeslot.teams.divisionName, 'bg'),
          getDivisionStyles(teamTimeslot.teams.divisionName, 'text')
        )}
      >
        {teamTimeslot.teams.divisionName}
      </Badge>
    )}
  </div>
);

interface TimeslotSectionCardProps {
  timeslot: string;
  teams: TeamTimeslot[];
  open: boolean;
  onToggle: () => void;
  isByeWeek?: boolean;
  cardClass: string;
  children: React.ReactNode;
}

const TimeslotSectionCard = ({
  timeslot,
  teams,
  open,
  onToggle,
  isByeWeek,
  cardClass,
  children,
}: TimeslotSectionCardProps) => (
  <AppCard className={cardClass} elevation="default" isInteractive={false}>
    <Collapsible open={open} onOpenChange={onToggle} className="w-full">
      <CollapsibleTrigger className="w-full">
        <TimeslotGroupHeader
          timeslot={timeslot}
          teamCount={teams.length}
          expanded={Boolean(open)}
          isByeWeek={isByeWeek}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  </AppCard>
);

const TimeslotGrouping: React.FC<TimeslotGroupingProps> = ({ groupedTimeslots, isLoading }) => {
  const { isWinterTheme } = useSeasonalThemeBase();
  const {
    regularTimeslots,
    byeWeekTimeslots,
    doubleHeaderInfo,
    expandedTimeslots,
    toggleTimeslot,
  } = useTimeslotGrouping(groupedTimeslots);

  if (isLoading) return <LoadingState message="Loading timeslots..." />;
  if (regularTimeslots.length === 0 && byeWeekTimeslots.length === 0) {
    return (
      <div
        className={cn(
          'text-center py-8 rounded-xl',
          'bg-gradient-to-br from-blue-50/50 via-gray-50 to-orange-50/30',
          'dark:from-gray-800/50 dark:via-gray-800/30 dark:to-gray-900/50',
          'border border-gray-200 dark:border-gray-700'
        )}
      >
        <Calendar className="size-8 mx-auto mb-2 text-muted-foreground dark:text-gray-500" />
        <p className="text-muted-foreground dark:text-muted-foreground">
          No timeslots scheduled for this date.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {regularTimeslots.map(({ timeslot, teams }, index) => (
        <TimeslotSectionCard
          key={timeslot}
          timeslot={timeslot}
          teams={teams}
          open={expandedTimeslots[timeslot]}
          onToggle={() => toggleTimeslot(timeslot)}
          cardClass={cn(
            'overflow-hidden border-gray-200 dark:border-gray-700 transition-all duration-300 p-0',
            animations.entranceLeft,
            `animation-delay-${index * 100}`
          )}
        >
          <div className="p-2 md:hidden">
            <div className="grid grid-cols-2 gap-2">
              {teams.map((teamTimeslot) => (
                <TimeslotMatchRowMobile
                  key={teamTimeslot.id}
                  teamTimeslot={teamTimeslot}
                  isWinterTheme={isWinterTheme}
                  doubleHeaderInfo={doubleHeaderInfo}
                />
              ))}
            </div>
          </div>
          <div className="hidden md:block p-4">
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {teams.map((teamTimeslot, teamIndex) => (
                <TimeslotMatchRow
                  key={teamTimeslot.id}
                  teamTimeslot={teamTimeslot}
                  teamIndex={teamIndex}
                  isWinterTheme={isWinterTheme}
                  doubleHeaderInfo={doubleHeaderInfo}
                />
              ))}
            </div>
          </div>
        </TimeslotSectionCard>
      ))}

      {byeWeekTimeslots.map(({ timeslot, teams }, index) => (
        <TimeslotSectionCard
          key={timeslot}
          timeslot={timeslot}
          teams={teams}
          open={expandedTimeslots[timeslot]}
          onToggle={() => toggleTimeslot(timeslot)}
          isByeWeek
          cardClass={cn(
            'overflow-hidden border-orange-200 dark:border-orange-700 transition-all duration-300 p-0',
            animations.entranceLeft,
            `animation-delay-${(regularTimeslots.length + index) * 100}`
          )}
        >
          <div
            className={cn(
              'p-2 md:hidden',
              isWinterTheme ? 'bg-orange-900/20' : 'bg-orange-50 dark:bg-orange-900/10'
            )}
          >
            <div className="grid grid-cols-2 gap-2">
              {teams.map((teamTimeslot) => (
                <TimeslotMatchRowMobile
                  isByeWeek
                  key={teamTimeslot.id}
                  teamTimeslot={teamTimeslot}
                  isWinterTheme={isWinterTheme}
                  doubleHeaderInfo={doubleHeaderInfo}
                />
              ))}
            </div>
          </div>
          <div
            className={cn(
              'hidden md:block p-4',
              isWinterTheme ? 'bg-orange-900/20' : 'bg-orange-50 dark:bg-orange-900/10'
            )}
          >
            <div
              className={cn(
                'divide-y',
                isWinterTheme
                  ? 'divide-orange-500/20'
                  : 'divide-orange-200 dark:divide-orange-700/50'
              )}
            >
              {teams.map((teamTimeslot, teamIndex) => (
                <ByeWeekDesktopRow
                  key={teamTimeslot.id}
                  teamTimeslot={teamTimeslot}
                  teamIndex={teamIndex}
                  isWinterTheme={isWinterTheme}
                />
              ))}
            </div>
          </div>
        </TimeslotSectionCard>
      ))}
    </div>
  );
};

export default React.memo(TimeslotGrouping);
