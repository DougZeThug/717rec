import { Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

import { Badge } from '@/components/ui/badge';
import { TeamLogo } from '@/components/ui/team';
import { cn } from '@/lib/utils';
import { animations, getDivisionStyles } from '@/styles/design-system';
import { TeamTimeslot } from '@/types';
import { toTeamSlug } from '@/utils/teamSlug';

export const TimeslotGroupHeader = ({
  timeslot,
  teamCount,
  expanded,
  isByeWeek = false,
}: {
  timeslot: string;
  teamCount: number;
  expanded: boolean;
  isByeWeek?: boolean;
}) => (
  <div
    className={cn(
      isByeWeek ? 'bg-orange-600' : 'bg-cornhole-navy',
      'text-white px-4 py-3 font-medium',
      isByeWeek
        ? 'bg-gradient-to-r from-orange-600 to-orange-600/90'
        : 'bg-gradient-to-r from-cornhole-navy to-cornhole-navy/90',
      'flex justify-between items-center cursor-pointer min-h-[44px]'
    )}
  >
    <div className="flex items-center gap-2">
      {isByeWeek && <Calendar className="h-4 w-4" />}
      {isByeWeek ? 'BYE WEEK' : timeslot}
      <Badge variant="outline" className="bg-white/10 text-white ml-2">
        {teamCount} {teamCount === 1 ? 'team' : 'teams'}
      </Badge>
    </div>
    {expanded ? (
      <ChevronDown className="h-4 w-4 text-white/80" />
    ) : (
      <ChevronRight className="h-4 w-4 text-white/80" />
    )}
  </div>
);

const DoubleHeaderPill = ({
  teamId,
  isDoubleHeader,
  doubleHeaderInfo,
}: {
  teamId: string;
  isDoubleHeader: boolean;
  doubleHeaderInfo?: Map<string, { slot1: string; slot2: string }>;
}) => {
  if (!isDoubleHeader || !doubleHeaderInfo?.has(teamId)) return null;
  const slots = doubleHeaderInfo.get(teamId);
  return (
    <Badge variant="doubleHeader" className="text-[10px] leading-tight px-1.5 py-0.5 mt-0.5">
      DH {slots?.slot1}/{slots?.slot2}
    </Badge>
  );
};

export const TimeslotMatchRowMobile = ({
  teamTimeslot,
  isWinterTheme,
  isByeWeek,
  doubleHeaderInfo,
}: {
  teamTimeslot: TeamTimeslot;
  isWinterTheme: boolean;
  isByeWeek?: boolean;
  doubleHeaderInfo?: Map<string, { slot1: string; slot2: string }>;
}) => {
  const teamName = teamTimeslot.teams?.name;
  const cardClass = cn(
    'flex flex-col items-center gap-1.5 p-3 rounded-lg border',
    isByeWeek
      ? isWinterTheme
        ? 'border-orange-500/30 bg-orange-900/20 hover:bg-orange-900/30'
        : 'border-orange-200 dark:border-orange-700 bg-card hover:bg-orange-100/50 dark:hover:bg-orange-800/20'
      : isWinterTheme
        ? 'bg-white/5 hover:bg-white/10 border-gray-200 dark:border-gray-700'
        : 'bg-card hover:bg-accent/50 border-gray-200 dark:border-gray-700',
    'transition-colors duration-150 touch-manipulation'
  );
  const content = (
    <>
      <TeamLogo
        imageUrl={teamTimeslot.teams?.image_url || teamTimeslot.teams?.logo_url}
        teamName={teamName || 'Unknown Team'}
        size="sm"
      />
      <span className="font-bold text-xs uppercase text-center leading-tight line-clamp-2">
        {teamName || 'Unknown'}
      </span>
      {teamTimeslot.teams?.divisionName && (
        <Badge
          className={cn(
            'text-[10px] font-medium px-2 py-0',
            getDivisionStyles(teamTimeslot.teams.divisionName, 'bg'),
            getDivisionStyles(teamTimeslot.teams.divisionName, 'text')
          )}
        >
          {teamTimeslot.teams.divisionName}
        </Badge>
      )}
      <DoubleHeaderPill
        teamId={teamTimeslot.team_id}
        isDoubleHeader={teamTimeslot.is_double_header}
        doubleHeaderInfo={doubleHeaderInfo}
      />
    </>
  );

  if (!teamName) return <div className={cardClass}>{content}</div>;
  return (
    <Link to={`/teams/${toTeamSlug(teamName)}`} className={cardClass}>
      {content}
    </Link>
  );
};

const DivisionBadge = ({ divisionName }: { divisionName: string }) => (
  <Badge
    className={cn(
      'text-xs font-medium px-2.5 py-0.5',
      getDivisionStyles(divisionName, 'bg'),
      getDivisionStyles(divisionName, 'text')
    )}
  >
    {divisionName}
  </Badge>
);

export const TimeslotMatchRow = ({
  teamTimeslot,
  teamIndex,
  isWinterTheme,
  doubleHeaderInfo,
}: {
  teamTimeslot: TeamTimeslot;
  teamIndex: number;
  isWinterTheme: boolean;
  doubleHeaderInfo: Map<string, { slot1: string; slot2: string }>;
}) => (
  <div
    className={cn(
      'flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between',
      teamIndex % 2 === 1 && (isWinterTheme ? 'bg-white/5' : 'bg-gray-50 dark:bg-white/5'),
      isWinterTheme ? 'hover:bg-white/10' : 'hover:bg-gray-100 dark:hover:bg-gray-800',
      'transition-colors duration-150',
      animations.fadeInSlideUp,
      `animation-delay-${teamIndex * 100 + 100}`,
      'touch-manipulation'
    )}
  >
    <div className="flex w-full items-center min-w-0 gap-3 sm:flex-1 sm:gap-6">
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
              isWinterTheme ? 'text-[hsl(210,40%,96%)]' : 'text-cornhole-navy dark:text-white'
            )}
          >
            {teamTimeslot.teams.name}
          </Link>
        ) : (
          <span className="text-gray-500 dark:text-gray-400 truncate">Unknown Team</span>
        )}
      </div>
    </div>
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
      {teamTimeslot.is_double_header && doubleHeaderInfo.has(teamTimeslot.team_id) && (
        <Badge
          variant="doubleHeader"
          className={cn(
            'w-full max-w-full text-[11px] leading-tight',
            'flex-col items-start gap-0.5 whitespace-normal break-words',
            'sm:w-auto sm:flex-row sm:items-center sm:gap-1 sm:text-xs'
          )}
        >
          <span className="font-semibold">Double Header</span>
          <span className="opacity-90">
            ({doubleHeaderInfo.get(teamTimeslot.team_id)?.slot1} &{' '}
            {doubleHeaderInfo.get(teamTimeslot.team_id)?.slot2})
          </span>
        </Badge>
      )}
      {teamTimeslot.teams?.divisionName && (
        <DivisionBadge divisionName={teamTimeslot.teams.divisionName} />
      )}
    </div>
  </div>
);
