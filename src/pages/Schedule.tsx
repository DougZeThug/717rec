import { format, parseISO } from 'date-fns';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import PageLayout from '@/components/layout/PageLayout';
import DeleteMatchDialog from '@/components/schedule/DeleteMatchDialog';
import MatchFormDialog from '@/components/schedule/MatchFormDialog';
import ScheduleContent from '@/components/schedule/ScheduleContent';
import ScheduleContentSkeleton from '@/components/schedule/ScheduleContentSkeleton';
import { ScheduleFilters } from '@/components/schedule/ScheduleFilters';
import ScheduleHeader from '@/components/schedule/ScheduleHeader';
import SeoHead from '@/components/seo/SeoHead';
import { ErrorDisplay } from '@/components/ui/error-display';
import { useScheduleUrlState } from '@/hooks/scheduling/useScheduleUrlState';
import { useScrollToLinkedMatch } from '@/hooks/scheduling/useScrollToLinkedMatch';
import { useTeamsQuery } from '@/hooks/teams';
import { useDivisions } from '@/hooks/useDivisions';
import { useMatchDates } from '@/hooks/useMatchDates';
import { useMatchManagement } from '@/hooks/useMatchManagement';
import { useMatchTimeslots } from '@/hooks/useMatchTimeslots';
import { useScheduleData } from '@/hooks/useScheduleData';
import { useScheduleTabs } from '@/hooks/useScheduleTabs';
import { useTeamMembership } from '@/hooks/useTeamMembership';
import { Match } from '@/types';
import { buildBreadcrumbJsonLd } from '@/utils/breadcrumbJsonLd';
import { normalizeDate } from '@/utils/dateNormalization';
import { scheduleLog } from '@/utils/logger';
import {
  buildDivisionOptions,
  filterGroupedTimeslots,
  matchInvolvesTeam,
  matchIsInDivision,
} from '@/utils/schedule/matchFilters';

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

/** 'yyyy-MM-dd' to a local-midnight Date. */
const dayKeyToDate = (key: string): Date => {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const Schedule = () => {
  // The night and the search text live in the address, so a week can be linked
  // to and neither resets on the way back. See UX audit SC-04.
  const {
    selectedDate,
    setSelectedDate,
    searchTerm,
    setSearchTerm,
    hadDateInUrl,
    division,
    setDivision,
    team: teamFilter,
    setTeam: setTeamFilter,
    hasFilters,
    clearFilters,
  } = useScheduleUrlState(getUpcomingThursday);

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

  useScrollToLinkedMatch(matchesLoading);

  // Every night that has a match, oldest first. Derived from matchDates, which
  // memoizes over the stable query data — upcomingMatches/completedMatches are
  // rebuilt on every render and must never feed an effect that sets state.
  const matchNights = useMemo(() => Array.from(matchDates).sort().map(dayKeyToDate), [matchDates]);

  // The nights either side of today, for the empty state's two ways out. These
  // come from the played/scheduled splits rather than the all-status matchDates
  // set: a night whose matches have not been played yet is not a night with
  // results to look at. Keyed on day strings so the Dates handed downstream
  // stay referentially stable between renders.
  const lastPlayedKey = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    // completedMatches is sorted most-recent-first by useScheduleData.
    return (
      completedMatches
        .flatMap((match) => (match.date ? [format(parseISO(match.date), 'yyyy-MM-dd')] : []))
        .find((key) => key <= todayKey) ?? null
    );
  }, [completedMatches]);

  const nextScheduledKey = useMemo(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    // upcomingMatches is sorted soonest-first by useScheduleData.
    return (
      upcomingMatches
        .flatMap((match) => (match.date ? [format(parseISO(match.date), 'yyyy-MM-dd')] : []))
        .find((key) => key > todayKey) ?? null
    );
  }, [upcomingMatches]);

  const lastPlayedDate = useMemo(
    () => (lastPlayedKey ? dayKeyToDate(lastPlayedKey) : null),
    [lastPlayedKey]
  );
  const nextScheduledDate = useMemo(
    () => (nextScheduledKey ? dayKeyToDate(nextScheduledKey) : null),
    [nextScheduledKey]
  );

  // Whether the selected day has any match at all, played or not. Read from the
  // all-status matchDates set rather than the tab's filtered list, which holds
  // only completed matches while the Timeslots tab is open.
  const hasMatchesOnSelectedDate = matchDates.has(format(selectedDate, 'yyyy-MM-dd'));

  // The date is guessed as "the upcoming Thursday" before any data exists. Once
  // the matches arrive, move off that guess if it turns out to be an empty
  // night: prefer the last night actually played, so a player opening the app
  // the morning after league night lands on results rather than a blank page.
  // Runs at most once, so it can never fight a date the user picked, and can
  // never loop. A date in the address counts as picked, so a shared link is
  // never moved off the night it named. See UX audit SC-01.
  const hasAutoPickedDate = useRef(hadDateInUrl);

  useEffect(() => {
    if (hasAutoPickedDate.current || matchesLoading) return;
    // A failed read is not an empty season: leave the guess alone and let a
    // successful retry make the choice.
    if (matchesError) return;
    hasAutoPickedDate.current = true;

    if (matchDates.has(format(selectedDate, 'yyyy-MM-dd'))) return;

    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const lastPlayed = [...matchNights]
      .reverse()
      .find((night) => format(night, 'yyyy-MM-dd') <= todayKey);
    const nextNight = matchNights.find((night) => format(night, 'yyyy-MM-dd') > todayKey);
    const fallback = lastPlayed ?? nextNight;

    if (fallback) {
      scheduleLog('No matches on the default date; opening on', fallback);
      setSelectedDate(fallback);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot, guarded by hasAutoPickedDate
  }, [matchesLoading, matchesError, matchNights]);

  const { groupedTimeslots, isLoading: timeslotsLoading } = useMatchTimeslots(selectedDate);

  // Division chips and "my team" (UX audit SC-02). Division is already on every
  // match row through the team join, so neither chip costs an extra fetch.
  const { divisions } = useDivisions();
  const divisionOptions = useMemo(() => buildDivisionOptions(divisions), [divisions]);
  const selectedDivision = useMemo(
    () => divisionOptions.find((option) => option.value === division) ?? null,
    [divisionOptions, division]
  );

  const { activeMembership } = useTeamMembership();
  // The same rule Standings uses to decide whose row to highlight: an
  // unapproved membership is not yet a team.
  const myTeamId = activeMembership?.is_approved ? activeMembership.team_id : null;
  const myTeamFilterId = teamFilter === 'mine' ? myTeamId : null;

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
  // Stripping the time of day is the hook's job now: it owns the date, and the
  // address it writes carries the local day. All that is left here is recording
  // that the night was chosen, so the auto-pick above leaves it alone.
  const handleDateSelect = (date: Date) => {
    scheduleLog('Date selection changed:', date);
    hasAutoPickedDate.current = true;
    setSelectedDate(date);
  };

  const filteredMatches = React.useMemo(() => {
    const sourceMatches = activeTab === 'upcoming' ? upcomingMatches : completedMatches;
    const searchLower = searchTerm.toLowerCase();

    if (!searchTerm && !selectedDivision && !myTeamFilterId) return sourceMatches;

    // One pass, not a chain of filters: these lists are rebuilt on every render
    // and this page is the one scorers keep open.
    return sourceMatches.filter((match) => {
      if (selectedDivision && !matchIsInDivision(match, selectedDivision)) return false;
      if (myTeamFilterId && !matchInvolvesTeam(match, myTeamFilterId)) return false;
      if (!searchTerm) return true;

      const team1Name = match.team1Details?.name || '';
      const team2Name = match.team2Details?.name || '';
      return (
        team1Name.toLowerCase().includes(searchLower) ||
        team2Name.toLowerCase().includes(searchLower) ||
        match.location?.toLowerCase().includes(searchLower)
      );
    });
  }, [activeTab, upcomingMatches, completedMatches, searchTerm, selectedDivision, myTeamFilterId]);

  // The Timeslots tab is fed by a different query, so it answers the chips here
  // rather than through filteredMatches. Showing the chips on two tabs and
  // ignoring them on the third would be worse than not having them.
  const visibleTimeslots = React.useMemo(
    () =>
      filterGroupedTimeslots(groupedTimeslots, {
        division: selectedDivision,
        teamId: myTeamFilterId,
      }),
    [groupedTimeslots, selectedDivision, myTeamFilterId]
  );

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
    <PageLayout withBackground gradientVariant="blueOrange">
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
          filters={
            <ScheduleFilters
              options={divisionOptions}
              division={division}
              onDivisionChange={setDivision}
              team={teamFilter}
              onTeamChange={setTeamFilter}
              showMyTeam={myTeamId !== null}
            />
          }
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
            groupedTimeslots={visibleTimeslots}
            hasAnyTimeslots={Object.keys(groupedTimeslots).length > 0}
            hasFilters={hasFilters}
            onClearFilters={clearFilters}
            timeslotsLoading={timeslotsLoading}
            hasMatchesOnSelectedDate={hasMatchesOnSelectedDate}
            lastPlayedDate={lastPlayedDate}
            nextScheduledDate={nextScheduledDate}
            onDateSelect={handleDateSelect}
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
