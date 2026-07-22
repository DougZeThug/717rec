import React, { useEffect, useMemo, useState } from 'react';

import PageLayout from '@/components/layout/PageLayout';
import DeleteMatchDialog from '@/components/schedule/DeleteMatchDialog';
import MatchFormDialog from '@/components/schedule/MatchFormDialog';
import ScheduleContent from '@/components/schedule/ScheduleContent';
import ScheduleContentSkeleton from '@/components/schedule/ScheduleContentSkeleton';
import ScheduleHeader from '@/components/schedule/ScheduleHeader';
import SeoHead from '@/components/seo/SeoHead';
import { ErrorDisplay } from '@/components/ui/error-display';
import { useTeamsQuery } from '@/hooks/teams';
import { useMatchDates } from '@/hooks/useMatchDates';
import { useMatchManagement } from '@/hooks/useMatchManagement';
import { useMatchTimeslots } from '@/hooks/useMatchTimeslots';
import { useScheduleData } from '@/hooks/useScheduleData';
import { useScheduleTabs } from '@/hooks/useScheduleTabs';
import { Match } from '@/types';
import { buildBreadcrumbJsonLd } from '@/utils/breadcrumbJsonLd';
import { normalizeDate } from '@/utils/dateNormalization';
import { scheduleLog } from '@/utils/logger';

// Get upcoming Thursday (or today if it's Thursday)
const getUpcomingThursday = () => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 4 = Thursday

  let targetDate: Date;
  if (dayOfWeek === 4) {
    // Today is Thursday
    targetDate = today;
  } else {
    // Calculate days until next Thursday
    const daysUntilThursday =
      dayOfWeek < 4
        ? 4 - dayOfWeek // This week's Thursday
        : 7 - dayOfWeek + 4; // Next week's Thursday

    targetDate = new Date(today);
    targetDate.setDate(today.getDate() + daysUntilThursday);
  }

  // Normalize to midnight local time to prevent time-of-day inconsistencies
  return new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
};

const Schedule = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedDate, setSelectedDate] = useState<Date>(() => getUpcomingThursday());

  // Log date for debugging
  useEffect(() => {
    scheduleLog('Current selected date:', {
      selectedDate,
      selectedDateString: selectedDate.toString(),
      selectedDateIso: selectedDate.toISOString(),
      normalizedDate: normalizeDate(selectedDate, 'Schedule'),
    });
  }, [selectedDate]);

  // Match data includes team details via JOIN - no separate teams query needed for display
  const {
    matchesData,
    matchesLoading,
    matchesError,
    matchesErrorMessage,
    refetchMatches,
    upcomingMatches,
    completedMatches,
  } = useScheduleData();

  // Get dates that have matches for the date strip
  const matchDates = useMatchDates(matchesData);

  const { groupedTimeslots, isLoading: timeslotsLoading } = useMatchTimeslots(selectedDate);

  const { activeTab, handleTabChange } = useScheduleTabs({
    selectedDate,
    matchesLoading,
    timeslotsLoading,
    upcomingMatches,
  });

  // Lazy load teams only when form dialog is open (for team selection dropdown)
  const [shouldLoadTeams, setShouldLoadTeams] = useState(false);
  const { data: teams, isLoading: teamsLoading } = useTeamsQuery({
    enabled: shouldLoadTeams,
  });

  const {
    matches: _matches,
    editingMatch,
    isFormOpen,
    deleteMatchId,
    isDeleting,
    isUpdating,
    isCreating,
    setEditingMatch,
    setIsFormOpen,
    setDeleteMatchId,
    handleCreateMatch,
    handleUpdateMatch,
    handleDeleteMatch,
  } = useMatchManagement(matchesData || []);

  // Trigger teams loading when form is about to open
  const handleOpenForm = (match?: typeof editingMatch) => {
    setShouldLoadTeams(true);
    if (match) {
      setEditingMatch(match);
    }
    setIsFormOpen(true);
  };

  // Handle date selection with proper normalization
  const handleDateSelect = (date: Date) => {
    // Keep as local date - don't convert to UTC
    // This ensures format(date, 'yyyy-MM-dd') produces the correct date string
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    // Create a clean local date at midnight (strips any time component)
    const normalizedDate = new Date(year, month, day);
    scheduleLog('Date selection changed:', {
      originalDate: date,
      normalizedDate,
      dateString: normalizedDate.toString(),
      localDateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    });

    setSelectedDate(normalizedDate);
  };

  const filteredMatches = React.useMemo(() => {
    const sourceMatches = activeTab === 'upcoming' ? upcomingMatches : completedMatches;
    if (!searchTerm) return sourceMatches;
    return sourceMatches.filter((match) => {
      const team1Name = match.team1Details?.name || '';
      const team2Name = match.team2Details?.name || '';
      const searchLower = searchTerm.toLowerCase();
      return (
        team1Name.toLowerCase().includes(searchLower) ||
        team2Name.toLowerCase().includes(searchLower) ||
        match.location?.toLowerCase().includes(searchLower)
      );
    });
  }, [activeTab, upcomingMatches, completedMatches, searchTerm]);

  const handleCreateMatchAdapter = (matchData: Omit<Match, 'id'>) =>
    handleCreateMatch(matchData, teams || []);
  const handleUpdateMatchAdapter = (matchData: Omit<Match, 'id'>) =>
    handleUpdateMatch(matchData, teams || []);
  const handleDeleteMatchAdapter = () => handleDeleteMatch(teams || []);

  // Only wait for matches - teams are lazy loaded for form
  const isLoading = matchesLoading;

  const scheduleJsonLd = useMemo(() => {
    const items = (upcomingMatches ?? []).slice(0, 20).map((match, idx) => {
      const name1 = match.team1Details?.name ?? 'TBD';
      const name2 = match.team2Details?.name ?? 'TBD';
      const status =
        match.status === 'postponed'
          ? 'https://schema.org/EventPostponed'
          : match.status === 'canceled'
            ? 'https://schema.org/EventCancelled'
            : 'https://schema.org/EventScheduled';
      return {
        '@type': 'ListItem',
        position: idx + 1,
        item: {
          '@type': 'SportsEvent',
          name: `${name1} vs ${name2}`,
          sport: 'Cornhole',
          eventStatus: status,
          ...(match.date ? { startDate: match.date } : {}),
          ...(match.location ? { location: { '@type': 'Place', name: match.location } } : {}),
          homeTeam: { '@type': 'SportsTeam', name: name1 },
          awayTeam: { '@type': 'SportsTeam', name: name2 },
          organizer: { '@type': 'SportsOrganization', name: '717REC' },
        },
      };
    });
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: '717REC upcoming matches',
      itemListElement: items,
    };
  }, [upcomingMatches]);

  const breadcrumbJsonLd = useMemo(
    () =>
      buildBreadcrumbJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Schedule', path: '/schedule' },
      ]),
    []
  );

  return (
    <PageLayout withBackground={true} gradientVariant="blueOrange">
      <SeoHead
        title="Schedule | 717REC Cornhole League"
        description="Upcoming and recent 717REC cornhole matches, weekly timeslots, and matchups by date."
        path="/schedule"
        jsonLd={[scheduleJsonLd, breadcrumbJsonLd]}
      />
      <div className="max-w-7xl mx-auto font-inter">
        <ScheduleHeader
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          matchDates={matchDates}
        />

        {/* Matches section with Timeslots tab */}
        {isLoading ? (
          <ScheduleContentSkeleton activeTab={activeTab} />
        ) : matchesError ? (
          <ErrorDisplay
            variant="card"
            context="Loading schedule"
            error={matchesErrorMessage ?? 'Failed to load schedule.'}
            onRetry={() => refetchMatches()}
          />
        ) : (
          <ScheduleContent
            activeTab={activeTab}
            setActiveTab={handleTabChange}
            filteredMatches={filteredMatches}
            teams={teams || []}
            selectedDate={selectedDate}
            groupedTimeslots={groupedTimeslots}
            timeslotsLoading={timeslotsLoading}
            onEditMatch={(match) => handleOpenForm(match)}
            onDeleteMatch={(matchId) => setDeleteMatchId(matchId)}
          />
        )}
      </div>

      <MatchFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        match={editingMatch}
        teams={teams || []}
        onSubmit={editingMatch ? handleUpdateMatchAdapter : handleCreateMatchAdapter}
        isLoadingTeams={teamsLoading}
        isUpdating={isUpdating}
        isCreating={isCreating}
      />

      <DeleteMatchDialog
        isOpen={deleteMatchId !== null}
        onClose={() => setDeleteMatchId(null)}
        onConfirm={handleDeleteMatchAdapter}
        isDeleting={isDeleting}
      />
    </PageLayout>
  );
};

export default Schedule;
