import { Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';

import { AppCard } from '@/components/ui/app-card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import LoadingState from '@/components/ui/loading-state';
import { TeamLogo } from '@/components/ui/team';
import { useSeasonalThemeBase } from '@/hooks/useSeasonalTheme';
import { cn } from '@/lib/utils';
import { animations, getDivisionStyles } from '@/styles/design-system';
import { TeamTimeslot } from '@/types';

interface TimeslotGroupingProps {
  groupedTimeslots: Record<string, TeamTimeslot[]>;
  isLoading: boolean;
}

const TimeslotGrouping: React.FC<TimeslotGroupingProps> = ({ groupedTimeslots, isLoading }) => {
  const { isWinterTheme } = useSeasonalThemeBase();
  // Track which timeslots are expanded
  const [expandedTimeslots, setExpandedTimeslots] = useState<Record<string, boolean>>(() => {
    // Initialize only the first timeslot as expanded
    const initialState: Record<string, boolean> = {};
    const timeslotKeys = Object.keys(groupedTimeslots);

    timeslotKeys.forEach((timeslot, index) => {
      initialState[timeslot] = index === 0; // Only the first one starts expanded
    });

    return initialState;
  });

  // Process double headers: find teams with double header and their second timeslot
  const { processedTimeslots, doubleHeaderInfo } = useMemo(() => {
    const allTimeslots = Object.values(groupedTimeslots).flat();
    const doubleHeaderTeams = new Map<string, { slot1: string; slot2: string }>();
    const seenDoubleHeaderTeams = new Set<string>();

    // First pass: identify all double header teams and their slots
    allTimeslots.forEach((ts) => {
      if (ts.is_double_header && !doubleHeaderTeams.has(ts.team_id)) {
        // Find both slots for this team
        const teamSlots = allTimeslots
          .filter((t) => t.team_id === ts.team_id && t.is_double_header)
          .sort((a, b) => (a.match_sequence || 0) - (b.match_sequence || 0));

        if (teamSlots.length === 2) {
          doubleHeaderTeams.set(ts.team_id, {
            slot1: teamSlots[0].timeslot,
            slot2: teamSlots[1].timeslot,
          });
        }
      }
    });

    // Second pass: filter out duplicate double header entries (keep only first occurrence)
    const processed: Record<string, TeamTimeslot[]> = {};

    Object.entries(groupedTimeslots).forEach(([timeslot, teams]) => {
      const filteredTeams = teams.filter((ts) => {
        if (ts.is_double_header) {
          if (seenDoubleHeaderTeams.has(ts.team_id)) {
            return false; // Skip, already shown in first slot
          }
          seenDoubleHeaderTeams.add(ts.team_id);
        }
        return true;
      });
      processed[timeslot] = filteredTeams;
    });

    return {
      processedTimeslots: processed,
      doubleHeaderInfo: doubleHeaderTeams,
    };
  }, [groupedTimeslots]);

  const toggleTimeslot = (timeslot: string) => {
    setExpandedTimeslots((prev) => ({
      ...prev,
      [timeslot]: !prev[timeslot],
    }));
  };

  if (isLoading) {
    return <LoadingState message="Loading timeslots..." />;
  }

  if (Object.keys(processedTimeslots).length === 0) {
    return (
      <div
        className={cn(
          'text-center py-8 rounded-xl',
          'bg-gradient-to-br from-blue-50/50 via-gray-50 to-orange-50/30',
          'dark:from-gray-800/50 dark:via-gray-800/30 dark:to-gray-900/50',
          'border border-gray-200 dark:border-gray-700'
        )}
      >
        <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400 dark:text-gray-500" />
        <p className="text-gray-500 dark:text-gray-400">No timeslots scheduled for this date.</p>
      </div>
    );
  }

  // Separate bye weeks from regular timeslots (using processed timeslots)
  const regularTimeslots = Object.entries(processedTimeslots).filter(
    ([timeslot]) => timeslot !== 'BYE'
  );
  const byeWeekTimeslots = Object.entries(processedTimeslots).filter(
    ([timeslot]) => timeslot === 'BYE'
  );

  return (
    <div className="space-y-4">
      {/* Regular timeslots */}
      {regularTimeslots.map(([timeslot, teams], index) => (
        <AppCard
          key={timeslot}
          className={cn(
            'overflow-hidden border-gray-200 dark:border-gray-700 transition-all duration-300 p-0',
            animations.entranceLeft,
            `animation-delay-${index * 100}`
          )}
          elevation="default"
          isInteractive={false}
        >
          <Collapsible
            open={expandedTimeslots[timeslot]}
            onOpenChange={() => toggleTimeslot(timeslot)}
            className="w-full"
          >
            <CollapsibleTrigger className="w-full">
              <div
                className={cn(
                  'bg-cornhole-navy text-white px-4 py-3 font-medium',
                  'bg-gradient-to-r from-cornhole-navy to-cornhole-navy/90',
                  'flex justify-between items-center cursor-pointer min-h-[44px]'
                )}
              >
                <div className="flex items-center gap-2">
                  {timeslot}
                  <Badge variant="outline" className="bg-white/10 text-white ml-2">
                    {teams.length} {teams.length === 1 ? 'team' : 'teams'}
                  </Badge>
                </div>
                {expandedTimeslots[timeslot] ? (
                  <ChevronDown className="h-4 w-4 text-white/80" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-white/80" />
                )}
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="p-4">
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {teams.map((teamTimeslot, teamIndex) => (
                    <div
                      key={teamTimeslot.id}
                      className={cn(
                        'flex items-center justify-between p-3',
                        // Alternating row shading
                        teamIndex % 2 === 1 &&
                          (isWinterTheme ? 'bg-white/5' : 'bg-gray-50 dark:bg-white/5'),
                        // Hover state
                        isWinterTheme
                          ? 'hover:bg-white/10'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800',
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
                            clickable={true}
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          {teamTimeslot.teams?.name ? (
                            <Link
                              to={`/teams/${teamTimeslot.team_id}`}
                              className={cn(
                                'font-medium text-base truncate hover:underline transition-all duration-200',
                                isWinterTheme
                                  ? 'text-[hsl(210,40%,96%)]'
                                  : 'text-cornhole-navy dark:text-white'
                              )}
                            >
                              {teamTimeslot.teams.name}
                            </Link>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400 truncate">
                              Unknown Team
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {teamTimeslot.is_double_header &&
                          doubleHeaderInfo.has(teamTimeslot.team_id) && (
                            <Badge variant="doubleHeader" className="text-xs">
                              Double Header ({doubleHeaderInfo.get(teamTimeslot.team_id)?.slot1} &{' '}
                              {doubleHeaderInfo.get(teamTimeslot.team_id)?.slot2})
                            </Badge>
                          )}
                        {teamTimeslot.teams?.divisionName && (
                          <Badge
                            className={cn(
                              'text-xs font-medium px-2.5 py-0.5',
                              getDivisionStyles(teamTimeslot.teams.divisionName, 'bg'),
                              getDivisionStyles(teamTimeslot.teams.divisionName, 'text')
                            )}
                          >
                            {teamTimeslot.teams.divisionName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </AppCard>
      ))}

      {/* Bye week section */}
      {byeWeekTimeslots.map(([timeslot, teams], index) => (
        <AppCard
          key={timeslot}
          className={cn(
            'overflow-hidden border-orange-200 dark:border-orange-700 transition-all duration-300 p-0',
            animations.entranceLeft,
            `animation-delay-${(regularTimeslots.length + index) * 100}`
          )}
          elevation="default"
          isInteractive={false}
        >
          <Collapsible
            open={expandedTimeslots[timeslot]}
            onOpenChange={() => toggleTimeslot(timeslot)}
            className="w-full"
          >
            <CollapsibleTrigger className="w-full">
              <div
                className={cn(
                  'bg-orange-600 text-white px-4 py-3 font-medium',
                  'bg-gradient-to-r from-orange-600 to-orange-600/90',
                  'flex justify-between items-center cursor-pointer min-h-[44px]'
                )}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  BYE WEEK
                  <Badge variant="outline" className="bg-white/10 text-white ml-2">
                    {teams.length} {teams.length === 1 ? 'team' : 'teams'}
                  </Badge>
                </div>
                {expandedTimeslots[timeslot] ? (
                  <ChevronDown className="h-4 w-4 text-white/80" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-white/80" />
                )}
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div
                className={cn(
                  'p-4',
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
                    <div
                      key={teamTimeslot.id}
                      className={cn(
                        'flex items-center justify-between p-3',
                        // Alternating row shading
                        teamIndex % 2 === 1 &&
                          (isWinterTheme
                            ? 'bg-orange-900/20'
                            : 'bg-orange-100/50 dark:bg-orange-800/10'),
                        // Hover state
                        isWinterTheme
                          ? 'hover:bg-orange-900/30'
                          : 'hover:bg-orange-100 dark:hover:bg-orange-800/20',
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
                            clickable={true}
                          />
                        </div>
                        <div className="flex flex-col min-w-0">
                          {teamTimeslot.teams?.name ? (
                            <Link
                              to={`/teams/${teamTimeslot.team_id}`}
                              className={cn(
                                'font-medium text-base truncate hover:underline transition-all duration-200',
                                isWinterTheme
                                  ? 'text-orange-300'
                                  : 'text-orange-800 dark:text-orange-200'
                              )}
                            >
                              {teamTimeslot.teams.name}
                            </Link>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400 truncate">
                              Unknown Team
                            </span>
                          )}
                          <span
                            className={cn(
                              'text-xs',
                              isWinterTheme
                                ? 'text-orange-400'
                                : 'text-orange-600 dark:text-orange-300'
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
                  ))}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </AppCard>
      ))}
    </div>
  );
};

export default React.memo(TimeslotGrouping);
