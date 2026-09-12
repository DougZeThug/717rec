import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { format } from 'date-fns';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Schedule from '../Schedule';

class TestErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return <p>Schedule error</p>;
    return this.props.children;
  }
}

const mockUseScheduleData = vi.fn();
const mockUseMatchDates = vi.fn();
const mockUseMatchTimeslots = vi.fn();
const mockUseScheduleTabs = vi.fn();
const mockUseTeamsQuery = vi.fn();
const mockUseMatchManagement = vi.fn();
const mockUseDivisions = vi.fn();
const mockUseTeamMembership = vi.fn();
const mockUseTimeslotDates = vi.fn();

vi.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/useScheduleData', () => ({
  useScheduleData: () => mockUseScheduleData(),
}));
vi.mock('@/hooks/useMatchDates', () => ({
  useMatchDates: (...args: unknown[]) => mockUseMatchDates(...args),
}));
vi.mock('@/hooks/useMatchTimeslots', () => ({
  useMatchTimeslots: (...args: unknown[]) => mockUseMatchTimeslots(...args),
}));
vi.mock('@/hooks/useTimeslotDates', () => ({
  useTimeslotDates: () => mockUseTimeslotDates(),
}));
vi.mock('@/hooks/useScheduleTabs', () => ({
  useScheduleTabs: (...args: unknown[]) => mockUseScheduleTabs(...args),
}));
vi.mock('@/hooks/teams', () => ({
  useTeamsQuery: (...args: unknown[]) => mockUseTeamsQuery(...args),
}));
vi.mock('@/hooks/useMatchManagement', () => ({
  useMatchManagement: (...args: unknown[]) => mockUseMatchManagement(...args),
}));
vi.mock('@/hooks/useDivisions', () => ({
  useDivisions: () => mockUseDivisions(),
}));
vi.mock('@/hooks/useTeamMembership', () => ({
  useTeamMembership: () => mockUseTeamMembership(),
}));

vi.mock('@/components/layout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// The real chip row renders inside this slot, so the filter tests click real
// chips rather than a stand-in.
vi.mock('@/components/schedule/ScheduleHeader', () => ({
  default: ({
    setSearchTerm,
    filters,
  }: {
    setSearchTerm: (term: string) => void;
    filters?: React.ReactNode;
  }) => (
    <div>
      <button onClick={() => setSearchTerm('alpha')}>Filter Alpha</button>
      {filters}
    </div>
  ),
}));

vi.mock('@/components/schedule/ScheduleContentSkeleton', () => ({
  default: () => <p>Loading schedule...</p>,
}));

const dayKey = (date?: Date | null) => (date ? format(date, 'yyyy-MM-dd') : 'none');

vi.mock('@/components/schedule/ScheduleContent', () => ({
  default: ({
    filteredMatches,
    activeTab,
    setActiveTab,
    groupedTimeslots = {},
    hasFilters = false,
    onClearFilters,
    lastPlayedDate,
    nextScheduledDate,
    onEditMatch,
    onDeleteMatch,
    onDateSelect,
  }: {
    filteredMatches: Array<{
      id: string;
      team1Details?: { name: string };
      team2Details?: { name: string };
    }>;
    activeTab: string;
    setActiveTab: (value: string) => void;
    groupedTimeslots?: Record<string, unknown[]>;
    hasFilters?: boolean;
    onClearFilters?: () => void;
    lastPlayedDate?: Date | null;
    nextScheduledDate?: Date | null;
    onEditMatch?: (match: { id: string }) => void;
    onDeleteMatch?: (matchId: string) => void;
    onDateSelect?: (date: Date) => void;
  }) => (
    <section>
      <p>Active tab: {activeTab}</p>
      {filteredMatches.length === 0 ? (
        <p>No matches found</p>
      ) : (
        <p>Showing {filteredMatches.length} matches</p>
      )}
      <p>Timeslot rows: {Object.values(groupedTimeslots).flat().length}</p>
      <p>Filters on: {hasFilters ? 'yes' : 'no'}</p>
      <p>Next night: {dayKey(nextScheduledDate)}</p>
      <p>Last played: {dayKey(lastPlayedDate)}</p>
      <button onClick={() => setActiveTab('completed')}>Switch To Completed</button>
      <button onClick={() => onClearFilters?.()}>Clear filters</button>
      <button onClick={() => onEditMatch?.({ id: 'm-edit' })}>Edit match</button>
      <button onClick={() => onDeleteMatch?.('m-del')}>Delete match</button>
      <button onClick={() => onDateSelect?.(new Date(2026, 11, 24))}>Pick Dec 24</button>
    </section>
  ),
}));

// The dialogs are stubbed down to the controls the page wires into them, so the
// page's own submit/close/confirm handlers can be driven without the real forms.
vi.mock('@/components/schedule/MatchFormDialog', () => ({
  default: ({
    isOpen,
    onClose,
    onSubmit,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Record<string, unknown>) => void;
  }) =>
    isOpen ? (
      <div>
        <p>Match form open</p>
        <button onClick={() => onSubmit({ date: '2026-12-17' })}>Submit match</button>
        <button onClick={onClose}>Close form</button>
      </div>
    ) : null,
}));
vi.mock('@/components/schedule/DeleteMatchDialog', () => ({
  default: ({
    isOpen,
    onClose,
    onConfirm,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
  }) =>
    isOpen ? (
      <div>
        <p>Delete dialog open</p>
        <button onClick={onConfirm}>Confirm delete</button>
        <button onClick={onClose}>Close delete</button>
      </div>
    ) : null,
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const testQueryClients: QueryClient[] = [];

const scheduleTree = (initialPath = '/schedule') => {
  const queryClient = createTestQueryClient();
  testQueryClients.push(queryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Schedule />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const renderPage = (initialPath?: string) => render(scheduleTree(initialPath));

const baseScheduleData = {
  matchesData: [],
  matchesLoading: false,
  upcomingMatches: [],
  completedMatches: [],
};

/** Two real divisions under one chip, plus one of its own — the league's shape. */
const testDivisions = [
  {
    id: 'div-comp-hi',
    name: 'Competitive High',
    display_division: 'Competitive',
    division_weight: 3,
  },
  {
    id: 'div-comp-lo',
    name: 'Competitive Low',
    display_division: 'Competitive',
    division_weight: 3,
  },
  { id: 'div-int', name: 'Intermediate', display_division: 'Intermediate', division_weight: 2 },
];

const matchIn = (
  id: string,
  team1: { teamId: string; divisionId: string; name: string },
  team2: { teamId: string; divisionId: string; name: string }
) => ({
  id,
  team1Id: team1.teamId,
  team2Id: team2.teamId,
  team1Details: { team_id: team1.teamId, name: team1.name, division_id: team1.divisionId },
  team2Details: { team_id: team2.teamId, name: team2.name, division_id: team2.divisionId },
});

describe('Schedule page', () => {
  afterEach(() => {
    cleanup();
    for (const queryClient of testQueryClients) {
      queryClient.clear();
    }
    testQueryClients.length = 0;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseScheduleData.mockReturnValue(baseScheduleData);
    mockUseMatchDates.mockReturnValue(new Set());
    mockUseMatchTimeslots.mockReturnValue({ groupedTimeslots: {}, isLoading: false });
    mockUseTimeslotDates.mockReturnValue({ timeslotDates: [], isLoading: false, error: null });
    mockUseScheduleTabs.mockReturnValue({ activeTab: 'upcoming', handleTabChange: vi.fn() });
    mockUseTeamsQuery.mockReturnValue({ data: [], isLoading: false });
    mockUseDivisions.mockReturnValue({ divisions: testDivisions, isLoading: false, error: null });
    mockUseTeamMembership.mockReturnValue({ activeMembership: null });
    mockUseMatchManagement.mockReturnValue({
      matches: [],
      editingMatch: null,
      isFormOpen: false,
      deleteMatchId: null,
      isDeleting: false,
      isUpdating: false,
      isCreating: false,
      setEditingMatch: vi.fn(),
      setIsFormOpen: vi.fn(),
      setDeleteMatchId: vi.fn(),
      handleCreateMatch: vi.fn(),
      handleUpdateMatch: vi.fn(),
      handleDeleteMatch: vi.fn(),
    });
  });

  it('shows loading state while schedule data is loading', () => {
    mockUseScheduleData.mockReturnValue({
      ...baseScheduleData,
      matchesLoading: true,
    });

    renderPage();

    expect(screen.getByText('Loading schedule...')).toBeInTheDocument();
  });

  it('shows empty state when no matches are available', () => {
    renderPage();

    expect(screen.getByText('No matches found')).toBeInTheDocument();
  });

  it('shows success state when matches are present', () => {
    mockUseScheduleData.mockReturnValue({
      ...baseScheduleData,
      upcomingMatches: [
        {
          id: 'm1',
          team1Details: { name: 'Alpha Team' },
          team2Details: { name: 'Beta Team' },
          location: 'Gym A',
        },
      ],
    });

    renderPage();

    expect(screen.getByText('Showing 1 matches')).toBeInTheDocument();
  });

  it('shows an error state when schedule loading throws', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const preventExpectedJsdomError = (event: ErrorEvent) => {
      if (event.error?.message === 'TEST_INTENTIONAL: Schedule hook failure') {
        event.preventDefault();
      }
    };

    try {
      mockUseScheduleData.mockImplementation(() => {
        // Intentionally unique test-only message for easier debug output attribution.
        throw new Error('TEST_INTENTIONAL: Schedule hook failure');
      });

      const queryClient = createTestQueryClient();
      testQueryClients.push(queryClient);
      window.addEventListener('error', preventExpectedJsdomError);
      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <TestErrorBoundary>
              <Schedule />
            </TestErrorBoundary>
          </MemoryRouter>
        </QueryClientProvider>
      );

      expect(screen.getByText('Schedule error')).toBeInTheDocument();
      expect(mockUseScheduleData).toHaveBeenCalled();
    } finally {
      window.removeEventListener('error', preventExpectedJsdomError);
      errorSpy.mockRestore();
    }
  });

  it('filters matches by search interaction', () => {
    mockUseScheduleData.mockReturnValue({
      ...baseScheduleData,
      upcomingMatches: [
        {
          id: 'm1',
          team1Details: { name: 'Alpha Team' },
          team2Details: { name: 'Beta Team' },
          location: 'Gym A',
        },
        {
          id: 'm2',
          team1Details: { name: 'Gamma Team' },
          team2Details: { name: 'Delta Team' },
          location: 'Gym B',
        },
      ],
    });

    renderPage();

    expect(screen.getByText('Showing 2 matches')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Filter Alpha' }));

    expect(screen.getByText('Showing 1 matches')).toBeInTheDocument();
  });

  it('changes tabs from interaction', () => {
    const handleTabChange = vi.fn();
    mockUseScheduleTabs.mockReturnValue({ activeTab: 'upcoming', handleTabChange });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Switch To Completed' }));

    expect(handleTabChange).toHaveBeenCalledWith('completed');
  });

  // The page publishes its upcoming matches as schema.org SportsEvent data for
  // search engines. Nothing on screen shows it, so only a test that reads the
  // script tag covers the builder — and with an empty match list its per-match
  // body never runs at all.
  describe('the schema.org data for search engines', () => {
    const scheduleJsonLd = () => {
      const scripts = Array.from(
        document.querySelectorAll('script[type="application/ld+json"]')
      ).map((el) => JSON.parse(el.textContent ?? '{}'));
      return scripts.find((data) => data['@type'] === 'ItemList');
    };

    const withUpcoming = (matches: Array<Record<string, unknown>>) => {
      mockUseScheduleData.mockReturnValue({ ...baseScheduleData, upcomingMatches: matches });
      renderPage();
    };

    it('lists each upcoming match as an event, in order', () => {
      withUpcoming([
        {
          id: 'u1',
          date: '2026-12-17',
          location: 'Lanes 1-4',
          team1Details: { name: 'Bag Bandits' },
          team2Details: { name: 'Corn Stars' },
        },
        { id: 'u2', date: '2026-12-24', team1Details: { name: 'Sack Attack' } },
      ]);

      const data = scheduleJsonLd();
      expect(data.itemListElement).toHaveLength(2);
      expect(data.itemListElement[0].position).toBe(1);
      expect(data.itemListElement[0].item).toMatchObject({
        name: 'Bag Bandits vs Corn Stars',
        sport: 'Cornhole',
        startDate: '2026-12-17',
        location: { '@type': 'Place', name: 'Lanes 1-4' },
        homeTeam: { '@type': 'SportsTeam', name: 'Bag Bandits' },
        awayTeam: { '@type': 'SportsTeam', name: 'Corn Stars' },
      });
      // A team that is not set yet reads TBD rather than breaking the feed, and
      // a match with no location simply omits it.
      expect(data.itemListElement[1].item.name).toBe('Sack Attack vs TBD');
      expect(data.itemListElement[1].item.location).toBeUndefined();
    });

    it.each([
      ['postponed', 'https://schema.org/EventPostponed'],
      ['canceled', 'https://schema.org/EventCancelled'],
      [undefined, 'https://schema.org/EventScheduled'],
    ])('reports a %s match as %s', (status, expected) => {
      withUpcoming([
        {
          id: 'u1',
          date: '2026-12-17',
          status,
          team1Details: { name: 'A' },
          team2Details: { name: 'B' },
        },
      ]);

      expect(scheduleJsonLd().itemListElement[0].item.eventStatus).toBe(expected);
    });

    it('publishes an empty list when nothing is scheduled', () => {
      renderPage();

      expect(scheduleJsonLd().itemListElement).toEqual([]);
    });

    it('caps the feed at twenty matches', () => {
      withUpcoming(
        Array.from({ length: 25 }, (_, i) => ({
          id: `u${i}`,
          date: '2026-12-17',
          team1Details: { name: `Team ${i}` },
          team2Details: { name: 'Rivals' },
        }))
      );

      expect(scheduleJsonLd().itemListElement).toHaveLength(20);
    });
  });

  // The page owns the handlers it hands to the header, the content and the two
  // dialogs. Each is a real user path, and none of them was driven by a test.
  describe('the handlers the page hands out', () => {
    const matchManagement = (overrides: Record<string, unknown> = {}) => {
      const base = {
        matches: [],
        editingMatch: null,
        isFormOpen: false,
        deleteMatchId: null,
        isDeleting: false,
        isUpdating: false,
        isCreating: false,
        setEditingMatch: vi.fn(),
        setIsFormOpen: vi.fn(),
        setDeleteMatchId: vi.fn(),
        handleCreateMatch: vi.fn(),
        handleUpdateMatch: vi.fn(),
        handleDeleteMatch: vi.fn(),
      };
      const value = { ...base, ...overrides };
      mockUseMatchManagement.mockReturnValue(value);
      return value;
    };

    /** The date the page asked useMatchTimeslots about, i.e. the selected one. */
    const selectedKey = () => {
      const date = mockUseMatchTimeslots.mock.calls.at(-1)?.[0] as Date;
      return format(date, 'yyyy-MM-dd');
    };

    it('moves to a night the user picks, and stops correcting the date after', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 11, 17, 9, 0, 0));
      matchManagement();
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Pick Dec 24' }));

      expect(selectedKey()).toBe('2026-12-24');
    });

    it('asks to delete the match the list names', () => {
      const { setDeleteMatchId } = matchManagement();
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Delete match' }));

      expect(setDeleteMatchId).toHaveBeenCalledWith('m-del');
    });

    it('creates a match when the form has no match to edit', () => {
      const { handleCreateMatch, handleUpdateMatch } = matchManagement({
        isFormOpen: true,
        editingMatch: null,
      });
      mockUseTeamsQuery.mockReturnValue({ data: [{ id: 't1' }], isLoading: false });
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Submit match' }));

      expect(handleCreateMatch).toHaveBeenCalledWith({ date: '2026-12-17' }, [{ id: 't1' }]);
      expect(handleUpdateMatch).not.toHaveBeenCalled();
    });

    it('updates instead when the form was opened on a match', () => {
      const { handleCreateMatch, handleUpdateMatch } = matchManagement({
        isFormOpen: true,
        editingMatch: { id: 'm-edit' },
      });
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Submit match' }));

      expect(handleUpdateMatch).toHaveBeenCalledWith({ date: '2026-12-17' }, []);
      expect(handleCreateMatch).not.toHaveBeenCalled();
    });

    it('closes the match form', () => {
      const { setIsFormOpen } = matchManagement({ isFormOpen: true });
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Close form' }));

      expect(setIsFormOpen).toHaveBeenCalledWith(false);
    });

    it('confirms and cancels a deletion', () => {
      const { handleDeleteMatch, setDeleteMatchId } = matchManagement({ deleteMatchId: 'm-del' });
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
      expect(handleDeleteMatch).toHaveBeenCalledWith([]);

      fireEvent.click(screen.getByRole('button', { name: 'Close delete' }));
      expect(setDeleteMatchId).toHaveBeenCalledWith(null);
    });

    it('retries the read from the error card', () => {
      const refetchMatches = vi.fn();
      matchManagement();
      mockUseScheduleData.mockReturnValue({
        ...baseScheduleData,
        matchesError: new Error('boom'),
        matchesErrorMessage: 'Failed to load schedule.',
        refetchMatches,
      });
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: /try again|retry/i }));

      expect(refetchMatches).toHaveBeenCalled();
    });
  });

  // Editing a match opens the form, which is also what makes the page fetch the
  // team list — it is loaded lazily, only once a form needs it.
  it('opens the match form and loads the teams it needs', () => {
    const setEditingMatch = vi.fn();
    mockUseMatchManagement.mockReturnValue({
      ...mockUseMatchManagement(),
      setEditingMatch,
    });
    renderPage();

    // The teams query stays disabled until a form asks for it.
    expect(mockUseTeamsQuery).toHaveBeenLastCalledWith({ enabled: false });

    fireEvent.click(screen.getByRole('button', { name: 'Edit match' }));

    expect(setEditingMatch).toHaveBeenCalledWith({ id: 'm-edit' });
    expect(mockUseTeamsQuery).toHaveBeenLastCalledWith({ enabled: true });
  });

  // The two ways out of the "Nothing scheduled for {date}" card: a link back to
  // the last night played, and one forward to the next league night. The
  // forward one used to be worked out with a strict "later than today", so an
  // unplayed match tonight was not "the next league night" — the card skipped
  // it for next week, and with tonight the only unplayed match left it said "No
  // more league nights are on the schedule yet" on a league night.
  describe("the empty card's two ways out", () => {
    const nextNight = () => screen.getByText(/^Next night:/).textContent;
    const lastPlayed = () => screen.getByText(/^Last played:/).textContent;

    /** An upcoming night: a plain date, or one tagged with a called-off status. */
    type UpcomingNight = string | { date: string; status: 'postponed' | 'canceled' };

    const onThursdayNight = (
      upcoming: UpcomingNight[],
      completed: string[] = [],
      matchDates: string[] = []
    ) => {
      vi.useFakeTimers();
      // Thursday Dec 17, league night, morning.
      vi.setSystemTime(new Date(2026, 11, 17, 9, 0, 0));
      mockUseMatchDates.mockReturnValue(new Set(matchDates));
      mockUseScheduleData.mockReturnValue({
        ...baseScheduleData,
        upcomingMatches: upcoming.map((night, i) => ({
          id: `u${i}`,
          iscompleted: false,
          ...(typeof night === 'string' ? { date: night } : night),
        })),
        completedMatches: completed.map((date, i) => ({ id: `c${i}`, date, iscompleted: true })),
      });
      renderPage();
    };

    it('counts tonight as the next league night, not next week', () => {
      onThursdayNight(['2026-12-17', '2026-12-24']);

      expect(nextNight()).toBe('Next night: 2026-12-17');
    });

    it('still offers tonight when tonight is the only night left', () => {
      onThursdayNight(['2026-12-17']);

      expect(nextNight()).toBe('Next night: 2026-12-17');
    });

    it('moves on to the next night once tonight has been played', () => {
      // Tonight is no longer upcoming — it is in the completed list.
      onThursdayNight(['2026-12-24'], ['2026-12-17']);

      expect(nextNight()).toBe('Next night: 2026-12-24');
      expect(lastPlayed()).toBe('Last played: 2026-12-17');
    });

    it('has no next night when nothing is left to play', () => {
      onThursdayNight([], ['2026-12-10']);

      expect(nextNight()).toBe('Next night: none');
      expect(lastPlayed()).toBe('Last played: 2026-12-10');
    });

    it('skips a night already in the past', () => {
      // A match left unplayed on a past night is not a night still to come.
      onThursdayNight(['2026-12-10', '2026-12-24']);

      expect(nextNight()).toBe('Next night: 2026-12-24');
    });

    // A called-off match has no result either, so it sits in the upcoming list
    // for good. It is not a night still to come.
    it('skips a night whose only match is canceled', () => {
      onThursdayNight([{ date: '2026-12-17', status: 'canceled' }, '2026-12-24']);

      expect(nextNight()).toBe('Next night: 2026-12-24');
    });

    it('skips a night whose only match is postponed', () => {
      onThursdayNight([{ date: '2026-12-17', status: 'postponed' }, '2026-12-24']);

      expect(nextNight()).toBe('Next night: 2026-12-24');
    });

    it('still counts a night that has one called-off match and one to play', () => {
      onThursdayNight([{ date: '2026-12-17', status: 'canceled' }, '2026-12-17', '2026-12-24']);

      expect(nextNight()).toBe('Next night: 2026-12-17');
    });
  });

  // UX audit SC-01: the page guessed "the upcoming Thursday" before any data
  // existed and stayed there, so on a Friday morning every player checking last
  // night's results saw an empty card.
  describe('opening date', () => {
    /** The date the page asked useMatchTimeslots about, i.e. the selected one. */
    const selectedDate = () => mockUseMatchTimeslots.mock.calls.at(-1)?.[0] as Date | undefined;

    const asKey = (date?: Date) =>
      date &&
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
      ).padStart(2, '0')}`;

    it('falls back to the last night played when the upcoming Thursday is empty', () => {
      // Friday Sep 4. The guess is Thu Sep 10; the last night played is Thu Sep 3.
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 4, 9, 0, 0));
      mockUseMatchDates.mockReturnValue(new Set(['2026-08-27', '2026-09-03']));

      renderPage();

      expect(asKey(selectedDate())).toBe('2026-09-03');
    });

    // On league night itself the upcoming schedule matters more than last
    // week's results: when tonight is not entered yet, open on the next
    // scheduled night instead of the last played one.
    it('prefers the next scheduled night over last week on a Thursday', () => {
      // Thursday Sep 10. Tonight is empty; last played is Sep 3, next
      // scheduled is Sep 17.
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 10, 9, 0, 0));
      mockUseMatchDates.mockReturnValue(new Set(['2026-09-03', '2026-09-17']));

      renderPage();

      expect(asKey(selectedDate())).toBe('2026-09-17');
    });

    it('stays on tonight when tonight has matches', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 10, 9, 0, 0));
      mockUseMatchDates.mockReturnValue(new Set(['2026-09-03', '2026-09-10']));

      renderPage();

      expect(asKey(selectedDate())).toBe('2026-09-10');
    });

    // Tonight's timeslots are posted before any match row exists. The page must
    // stay on tonight rather than falling back to last week's results.
    it('stays on tonight when only tonight timeslots are posted', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 10, 9, 0, 0));
      mockUseMatchDates.mockReturnValue(new Set(['2026-09-03']));
      mockUseTimeslotDates.mockReturnValue({
        timeslotDates: ['2026-09-10', '2026-09-03'],
        isLoading: false,
        error: null,
      });

      renderPage();

      expect(asKey(selectedDate())).toBe('2026-09-10');
    });

    // No matches anywhere ahead; the newest posted timeslot night wins.
    it('opens on the newest posted timeslot night when no match night fits', () => {
      // Saturday Sep 12. Slots posted for Sep 10, no matches at all.
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 12, 9, 0, 0));
      mockUseMatchDates.mockReturnValue(new Set());
      mockUseTimeslotDates.mockReturnValue({
        timeslotDates: ['2026-09-10', '2026-09-03'],
        isLoading: false,
        error: null,
      });

      renderPage();

      expect(asKey(selectedDate())).toBe('2026-09-10');
    });

    it('keeps the upcoming Thursday when it does have matches', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 4, 9, 0, 0));
      mockUseMatchDates.mockReturnValue(new Set(['2026-09-03', '2026-09-10']));

      renderPage();

      expect(asKey(selectedDate())).toBe('2026-09-10');
    });

    // UX audit SC-04: the night is in the address now, and a named night must
    // survive the SC-01 "open on a night with something on it" correction.
    it('opens on the night the address names', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 4, 9, 0, 0));
      mockUseMatchDates.mockReturnValue(new Set(['2026-08-27', '2026-09-03']));

      renderPage('/schedule?date=2026-08-27');

      expect(asKey(selectedDate())).toBe('2026-08-27');
    });

    it('keeps an empty night the address names rather than correcting it', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 4, 9, 0, 0));
      mockUseMatchDates.mockReturnValue(new Set(['2026-08-27', '2026-09-03']));

      // Nothing is on that night, but it was asked for by name.
      renderPage('/schedule?date=2026-09-17');

      expect(asKey(selectedDate())).toBe('2026-09-17');
    });

    it('still corrects the guess when the address names no night', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 4, 9, 0, 0));
      mockUseMatchDates.mockReturnValue(new Set(['2026-08-27', '2026-09-03']));

      renderPage('/schedule?q=amigos');

      expect(asKey(selectedDate())).toBe('2026-09-03');
    });

    it('uses the next scheduled night before a season has been played', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 4, 1, 9, 0, 0));
      mockUseMatchDates.mockReturnValue(new Set(['2026-06-18', '2026-06-25']));

      renderPage();

      expect(asKey(selectedDate())).toBe('2026-06-18');
    });

    it('leaves the date alone while the matches are still loading', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 4, 9, 0, 0));
      mockUseScheduleData.mockReturnValue({ ...baseScheduleData, matchesLoading: true });
      mockUseMatchDates.mockReturnValue(new Set(['2026-09-03']));

      renderPage();

      // Still the pre-data guess, Thu Sep 10.
      expect(asKey(selectedDate())).toBe('2026-09-10');
    });

    it('leaves the guess alone when the read failed, and picks after a retry', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 4, 9, 0, 0));
      mockUseScheduleData.mockReturnValue({
        ...baseScheduleData,
        matchesError: true,
        matchesErrorMessage: 'boom',
      });
      mockUseMatchDates.mockReturnValue(new Set(['2026-09-03']));

      const { rerender } = renderPage();

      // A failed read is not an empty season, so the guess stands...
      expect(asKey(selectedDate())).toBe('2026-09-10');

      // ...and a successful retry still gets to choose.
      mockUseScheduleData.mockReturnValue(baseScheduleData);
      rerender(scheduleTree());

      expect(asKey(selectedDate())).toBe('2026-09-03');
    });

    // SC-05: useScheduleData rebuilds its arrays on every render. An effect that
    // depended on them while setting state would loop forever.
    it('settles instead of re-rendering forever', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 8, 4, 9, 0, 0));
      mockUseScheduleData.mockImplementation(() => ({
        matchesData: [],
        matchesLoading: false,
        // Fresh array identities every call, as the real hook produces.
        upcomingMatches: [],
        completedMatches: [],
      }));
      mockUseMatchDates.mockReturnValue(new Set(['2026-09-03']));

      renderPage();

      expect(mockUseMatchTimeslots.mock.calls.length).toBeLessThan(10);
    });
  });

  // UX audit SC-04: Home's "my match" row links to /schedule?date=...#match-<id>.
  describe('a link naming one match', () => {
    it('scrolls to the card once the matches have arrived', () => {
      const scrollIntoView = vi.fn();
      vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(scrollIntoView);
      const card = document.createElement('div');
      card.id = 'match-m1';
      document.body.appendChild(card);

      renderPage('/schedule?date=2026-09-03#match-m1');

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      card.remove();
    });

    // The match may be on the other tab, or on a night the link did not name.
    // Forcing a tab change would fight the page's own choice of tab.
    it('does nothing when the card is not on the page', () => {
      const scrollIntoView = vi.fn();
      vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(scrollIntoView);

      renderPage('/schedule?date=2026-09-03#match-not-here');

      expect(scrollIntoView).not.toHaveBeenCalled();
    });
  });
  // UX audit SC-02: the page carried a date and a free-text search and nothing
  // else, so a player had to know the night or type their team's name.
  describe('filters', () => {
    const compVsComp = matchIn(
      'm1',
      { teamId: 't1', divisionId: 'div-comp-hi', name: 'Alpha' },
      { teamId: 't2', divisionId: 'div-comp-lo', name: 'Bravo' }
    );
    const intVsInt = matchIn(
      'm2',
      { teamId: 't3', divisionId: 'div-int', name: 'Charlie' },
      { teamId: 't4', divisionId: 'div-int', name: 'Delta' }
    );
    const crossDivision = matchIn(
      'm3',
      { teamId: 't5', divisionId: 'div-comp-hi', name: 'Echo' },
      { teamId: 't6', divisionId: 'div-int', name: 'Foxtrot' }
    );

    const withMatches = () =>
      mockUseScheduleData.mockReturnValue({
        ...baseScheduleData,
        upcomingMatches: [compVsComp, intVsInt, crossDivision],
      });

    it('offers one chip per display division, not one per real division', () => {
      withMatches();
      renderPage();

      // Competitive High and Competitive Low are one chip.
      expect(screen.getByRole('button', { name: 'Competitive' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Intermediate' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Competitive High' })).not.toBeInTheDocument();
    });

    it('narrows the week to one division in one tap', () => {
      withMatches();
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Intermediate' }));

      // The all-Intermediate match and the cross-division one.
      expect(screen.getByText('Showing 2 matches')).toBeInTheDocument();
    });

    it('keeps a cross-division match under either chip', () => {
      mockUseScheduleData.mockReturnValue({
        ...baseScheduleData,
        upcomingMatches: [crossDivision],
      });
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Competitive' }));
      expect(screen.getByText('Showing 1 matches')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Intermediate' }));
      expect(screen.getByText('Showing 1 matches')).toBeInTheDocument();
    });

    it('marks the chosen chip as pressed', () => {
      withMatches();
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Intermediate' }));

      expect(screen.getByRole('button', { name: 'Intermediate' })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('opens on the division the address names', () => {
      withMatches();
      renderPage('/schedule?division=intermediate');

      expect(screen.getByText('Showing 2 matches')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Intermediate' })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });

    it('shows everything when the address names a division the league does not have', () => {
      withMatches();
      renderPage('/schedule?division=hyperbolic');

      expect(screen.getByText('Showing 3 matches')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('hides My team from a visitor with no approved team', () => {
      withMatches();
      renderPage();

      expect(screen.queryByRole('button', { name: /my team/i })).not.toBeInTheDocument();
    });

    it('hides My team while a membership is still waiting for approval', () => {
      withMatches();
      mockUseTeamMembership.mockReturnValue({
        activeMembership: { team_id: 't3', is_approved: false },
      });
      renderPage();

      expect(screen.queryByRole('button', { name: /my team/i })).not.toBeInTheDocument();
    });

    it('narrows the week to a member own matches in one tap', () => {
      withMatches();
      mockUseTeamMembership.mockReturnValue({
        activeMembership: { team_id: 't3', is_approved: true },
      });
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: /my team/i }));

      expect(screen.getByText('Showing 1 matches')).toBeInTheDocument();
    });

    it('combines a division chip with the search box', () => {
      withMatches();
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Competitive' }));
      // The mocked header types "alpha", which only the first match carries.
      fireEvent.click(screen.getByText('Filter Alpha'));

      expect(screen.getByText('Showing 1 matches')).toBeInTheDocument();
    });

    it('narrows the timeslots tab by the same chip', () => {
      mockUseMatchTimeslots.mockReturnValue({
        groupedTimeslots: {
          '6:30 PM': [
            { id: 'ts1', team_id: 't1', teams: { divisionName: 'Competitive High' } },
            { id: 'ts2', team_id: 't3', teams: { divisionName: 'Intermediate' } },
          ],
        },
        isLoading: false,
      });
      renderPage();

      expect(screen.getByText('Timeslot rows: 2')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Intermediate' }));

      expect(screen.getByText('Timeslot rows: 1')).toBeInTheDocument();
    });

    it('tells the page a filter is on, and clears back to everything', () => {
      withMatches();
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Intermediate' }));
      expect(screen.getByText('Filters on: yes')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Clear filters'));

      expect(screen.getByText('Filters on: no')).toBeInTheDocument();
      expect(screen.getByText('Showing 3 matches')).toBeInTheDocument();
    });
  });
});
