import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

vi.mock('@/components/schedule/ScheduleContent', () => ({
  default: ({
    filteredMatches,
    activeTab,
    setActiveTab,
    groupedTimeslots = {},
    hasFilters = false,
    onClearFilters,
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
      <button onClick={() => setActiveTab('completed')}>Switch To Completed</button>
      <button onClick={() => onClearFilters?.()}>Clear filters</button>
    </section>
  ),
}));

vi.mock('@/components/schedule/MatchFormDialog', () => ({
  default: () => null,
}));
vi.mock('@/components/schedule/DeleteMatchDialog', () => ({
  default: () => null,
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
