import { format, isSameDay, isToday, parseISO } from 'date-fns';
import { Calendar, CalendarDays, CheckCircle, Clock, Trophy } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { EmptyState } from '@/components/ui/empty-state';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WinterSection from '@/components/winter/WinterSection';
import { useIsMobile } from '@/hooks/use-mobile';
import { Match, Team, TeamTimeslot } from '@/types';

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
  onEditMatch?: (match: Match) => void;
  onDeleteMatch?: (matchId: string) => void;
}

const ScheduleContent: React.FC<ScheduleContentProps> = ({
  activeTab,
  setActiveTab,
  filteredMatches,
  teams,
  selectedDate,
  groupedTimeslots,
  timeslotsLoading,
  onEditMatch,
  onDeleteMatch,
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [upcomingIndex, setUpcomingIndex] = useState(0);
  const [completedIndex, setCompletedIndex] = useState(0);

  // Group matches by date
  const groupedMatches = useMemo(() => {
    const isCompletedTab = activeTab === 'completed';

    // Filter matches by completion status
    const matchesForTab = filteredMatches.filter((match) => match.iscompleted === isCompletedTab);

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

  // For empty state
  const isEmptyState = groupedMatches.length === 0;

  const renderMatchGroups = (showSwipeable: boolean) => {
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
          description="Matches will appear here once they've been played. Check the upcoming schedule to see what's next."
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

    if (showSwipeable && isMobile) {
      return (
        <SwipeableDateGroups
          groupedMatches={groupedMatches}
          selectedDate={selectedDate}
          onEditMatch={onEditMatch}
          onDeleteMatch={onDeleteMatch}
          activeIndex={activeTab === 'upcoming' ? upcomingIndex : completedIndex}
          onIndexChange={activeTab === 'upcoming' ? setUpcomingIndex : setCompletedIndex}
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
          />
        ))}
      </div>
    );
  };

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
                <Clock className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="text-sm md:text-base md:whitespace-nowrap">Timeslots</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="upcoming"
              className="flex-1 md:flex-grow-0 data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-400 px-2 md:px-6 min-h-[44px] transition-all"
            >
              <div className="flex items-center justify-center">
                <Calendar className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="text-sm md:text-base md:whitespace-nowrap">Upcoming</span>
              </div>
            </TabsTrigger>
            <TabsTrigger
              value="completed"
              className="flex-1 md:flex-grow-0 data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 dark:data-[state=active]:border-emerald-400 px-2 md:px-6 min-h-[44px] transition-all"
            >
              <div className="flex items-center justify-center">
                <CheckCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="text-sm md:text-base md:whitespace-nowrap">Completed</span>
              </div>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="timeslots" className="mt-6">
          <TimeslotGrouping groupedTimeslots={groupedTimeslots} isLoading={timeslotsLoading} />
        </TabsContent>

        <TabsContent value="upcoming" className="mt-6">
          {renderMatchGroups(true)}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {renderMatchGroups(true)}
        </TabsContent>
      </Tabs>
    </WinterSection>
  );
};

export default ScheduleContent;
