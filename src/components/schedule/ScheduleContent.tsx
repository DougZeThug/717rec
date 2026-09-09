import { format, isSameDay, isToday, parseISO } from 'date-fns';
import { Calendar, CalendarDays, CheckCircle, Clock, Trophy } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WinterSection from '@/components/winter/WinterSection';
import { useLiveScoredMatchIds } from '@/hooks/live-scoring/useLiveScoredMatchIds';
import { useIsMobile } from '@/hooks/useMobile';
import { Match, Team, TeamTimeslot } from '@/types';
import { isMatchCompleted } from '@/utils/matchStatus';

import DateMatchGroup from './DateMatchGroup';
import SwipeableDateGroups from './SwipeableDateGroups';
import TimeslotGrouping from './TimeslotGrouping';

interface ScheduleContentProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  filteredMatches: Match[];
  teams: Team[];
  selectedDate: Date;
  groupedTimeslots: Record<string, TeamTimeslot[]>;
  timeslotsLoading: boolean;
  /** Whether the selected day has any match at all, played or not. */
  hasMatchesOnSelectedDate?: boolean;
  /** Most recent night that was played, for the "see last night's results" link. */
  lastPlayedDate?: Date | null;
  /** Next night with matches scheduled, if any. */
  nextScheduledDate?: Date | null;
  onDateSelect?: (date: Date) => void;
  onEditMatch?: (match: Match) => void;
  onDeleteMatch?: (matchId: string) => void;
}

const ScheduleContent: React.FC<ScheduleContentProps> = ({
  activeTab,
  setActiveTab,
  filteredMatches,
  teams: _teams,
  selectedDate,
  groupedTimeslots,
  timeslotsLoading,
  hasMatchesOnSelectedDate = false,
  lastPlayedDate,
  nextScheduledDate,
  onDateSelect,
  onEditMatch,
  onDeleteMatch,
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [upcomingIndex, setUpcomingIndex] = useState(0);
  const [completedIndex, setCompletedIndex] = useState(0);
  const upcomingInteractedRef = useRef(false);

  // Ids of completed matches that were actually live-scored (have games rows).
  // Used to hide the "View match recap" CTA for traditionally-scored matches.
  const completedMatchIds = useMemo(
    () => filteredMatches.filter(isMatchCompleted).map((m) => m.id),
    [filteredMatches]
  );
  const { liveScoredIds } = useLiveScoredMatchIds(completedMatchIds);

  // Group matches by date
  const groupedMatches = useMemo(() => {
    const isCompletedTab = activeTab === 'completed';

    // Filter matches by completion status. Compare the derived state, not the
    // raw column: `iscompleted` is nullable, and a strict compare against a
    // boolean used to drop null rows out of both tabs (UX audit X-13 / L1).
    const matchesForTab = filteredMatches.filter(
      (match) => isMatchCompleted(match) === isCompletedTab
    );

    // Group by date
    const groups = matchesForTab.reduce(
      (acc, match) => {
        if (!match.date) return acc;

        const matchDate = parseISO(match.date);
        const dateStr = format(matchDate, 'yyyy-MM-dd');

        if (!acc[dateStr]) {
          acc[dateStr] = {
            date: matchDate,
            matches: [],
          };
        }

        acc[dateStr].matches.push(match);
        return acc;
      },
      {} as Record<string, { date: Date; matches: Match[] }>
    );

    // Sort dates (ascending for upcoming, descending for completed)
    return Object.values(groups).sort((a, b) => {
      if (isCompletedTab) {
        return b.date.getTime() - a.date.getTime(); // Newest first for completed
      }
      return a.date.getTime() - b.date.getTime(); // Oldest first for upcoming
    });
  }, [filteredMatches, activeTab]);

  // Smart default for the mobile upcoming carousel: land on today's group
  // (or the next future one), not stale past unscored matches.
  const upcomingDefaultIndex = useMemo(() => {
    if (activeTab !== 'upcoming' || groupedMatches.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const idx = groupedMatches.findIndex((g) => {
      const d = new Date(g.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() >= today.getTime();
    });
    return idx === -1 ? groupedMatches.length - 1 : idx;
  }, [activeTab, groupedMatches]);

  useEffect(() => {
    upcomingInteractedRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync state from incoming props/derived values
    setUpcomingIndex(upcomingDefaultIndex);
  }, [upcomingDefaultIndex]);

  const handleUpcomingIndexChange = (i: number) => {
    upcomingInteractedRef.current = true;
    setUpcomingIndex(i);
  };

  // For empty state
  const isEmptyState = groupedMatches.length === 0;

  // A date with neither timeslots nor matches used to render a bare "No
  // timeslots scheduled for this date." card, which is every visit between
  // league nights. Offer a way out instead. See UX audit SC-01.
  // hasMatchesOnSelectedDate comes from the page's all-status set of match
  // dates. It must not be derived from filteredMatches, which holds only
  // completed matches while the Timeslots tab is open, so an upcoming match on
  // the selected day would look like nothing at all.
  const hasTimeslots = Object.keys(groupedTimeslots).length > 0;
  const showNothingScheduled = !timeslotsLoading && !hasTimeslots && !hasMatchesOnSelectedDate;

  const nothingScheduledActions = [
    lastPlayedDate && {
      label: `See results from ${format(lastPlayedDate, 'EEE MMM d')}`,
      onClick: () => {
        onDateSelect?.(lastPlayedDate);
        setActiveTab('completed');
      },
      variant: 'default' as const,
      icon: CheckCircle,
    },
    nextScheduledDate && {
      label: `Go to ${format(nextScheduledDate, 'EEE MMM d')}`,
      onClick: () => {
        onDateSelect?.(nextScheduledDate);
        setActiveTab('timeslots');
      },
      variant: 'outline' as const,
      icon: CalendarDays,
    },
  ].filter(Boolean) as {
    label: string;
    onClick: () => void;
    variant: 'default' | 'outline';
    icon: typeof CheckCircle;
  }[];

  const matchGroupsContent = (() => {
    if (isEmptyState) {
      if (activeTab === 'upcoming') {
        return (
          <EmptyState
            icon={CalendarDays}
            title="No Upcoming Matches"
            description="Check back soon for new match schedules, or view completed matches to see recent results."
            actions={[
              {
                label: 'View Completed',
                onClick: () => setActiveTab('completed'),
                variant: 'default',
                icon: CheckCircle,
              },
              {
                label: 'View Standings',
                onClick: () => navigate('/stats'),
                variant: 'outline',
                icon: Trophy,
              },
            ]}
          />
        );
      }
      return (
        <EmptyState
          icon={Trophy}
          title="No Completed Matches"
          description="Matches will appear here after they have been played. Check the upcoming schedule to see what is next."
          actions={[
            {
              label: 'View Upcoming',
              onClick: () => setActiveTab('upcoming'),
              variant: 'default',
              icon: CalendarDays,
            },
          ]}
        />
      );
    }

    if (isMobile) {
      return (
        <SwipeableDateGroups
          groupedMatches={groupedMatches}
          selectedDate={selectedDate}
          onEditMatch={onEditMatch}
          onDeleteMatch={onDeleteMatch}
          activeIndex={activeTab === 'upcoming' ? upcomingIndex : completedIndex}
          onIndexChange={activeTab === 'upcoming' ? handleUpcomingIndexChange : setCompletedIndex}
          liveScoredMatchIds={liveScoredIds}
        />
      );
    }

    return (
      <div className="space-y-4">
        {groupedMatches.map((group, index) => (
          <DateMatchGroup
            key={format(group.date, 'yyyy-MM-dd')}
            date={group.date}
            matches={group.matches}
            isCurrentDay={isToday(group.date) || isSameDay(group.date, selectedDate)}
            isFirstGroup={index === 0}
            onEditMatch={onEditMatch}
            onDeleteMatch={onDeleteMatch}
            liveScoredMatchIds={liveScoredIds}
          />
        ))}
      </div>
    );
  })();

  return (
    <WinterSection showIcicles lightIcicles>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-2 -mx-1 px-1">
          <TabsList className="w-full md:min-w-[340px] font-inter bg-secondary">
            <TabsTrigger
              value="timeslots"
              className="flex-1 md:flex-grow-0 data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-amber-600 dark:data-[state=active]:border-amber-400 px-2 md:px-6 min-h-[44px] transition-all"
            >
              <div className="flex items-center justify-center">
                <Clock className="size-4 mr-1 flex-shrink-0" />
                <span className="text-sm md:text-base md:whitespace-nowrap">Timeslots</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="upcoming"
              className="flex-1 md:flex-grow-0 data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 px-2 md:px-6 min-h-[44px] transition-all"
            >
              <div className="flex items-center justify-center">
                <Calendar className="size-4 mr-1 flex-shrink-0" />
                <span className="text-sm md:text-base md:whitespace-nowrap">Upcoming</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="flex-1 md:flex-grow-0 data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 dark:data-[state=active]:border-emerald-400 px-2 md:px-6 min-h-[44px] transition-all"
            >
              <div className="flex items-center justify-center">
                <CheckCircle className="size-4 mr-1 flex-shrink-0" />
                <span className="text-sm md:text-base md:whitespace-nowrap">Completed</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="timeslots" className="mt-3">
          {showNothingScheduled ? (
            <EmptyState
              icon={CalendarDays}
              title={`Nothing scheduled for ${format(selectedDate, 'EEE MMM d')}`}
              description={
                nextScheduledDate
                  ? `The next league night is ${format(nextScheduledDate, 'EEE MMM d')}.`
                  : 'No more league nights are on the schedule yet.'
              }
              actions={nothingScheduledActions}
            />
          ) : (
            <TimeslotGrouping groupedTimeslots={groupedTimeslots} isLoading={timeslotsLoading} />
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-3">
          {matchGroupsContent}
        </TabsContent>

        <TabsContent value="completed" className="mt-3">
          {matchGroupsContent}
        </TabsContent>
      </Tabs>
    </WinterSection>
  );
};

export default ScheduleContent;
