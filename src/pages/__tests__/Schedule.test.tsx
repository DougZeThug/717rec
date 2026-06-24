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
vi.mock('@/hooks/useScheduleTabs', () => ({
  useScheduleTabs: (...args: unknown[]) => mockUseScheduleTabs(...args),
}));
vi.mock('@/hooks/teams', () => ({
  useTeamsQuery: (...args: unknown[]) => mockUseTeamsQuery(...args),
}));
vi.mock('@/hooks/useMatchManagement', () => ({
  useMatchManagement: (...args: unknown[]) => mockUseMatchManagement(...args),
}));

vi.mock('@/components/layout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/schedule/ScheduleHeader', () => ({
  default: ({ setSearchTerm }: { setSearchTerm: (term: string) => void }) => (
    <div>
      <button onClick={() => setSearchTerm('alpha')}>Filter Alpha</button>
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
  }: {
    filteredMatches: Array<{
      id: string;
      team1Details?: { name: string };
      team2Details?: { name: string };
    }>;
    activeTab: string;
    setActiveTab: (value: string) => void;
  }) => (
    <section>
      <p>Active tab: {activeTab}</p>
      {filteredMatches.length === 0 ? (
        <p>No matches found</p>
      ) : (
        <p>Showing {filteredMatches.length} matches</p>
      )}
      <button onClick={() => setActiveTab('completed')}>Switch To Completed</button>
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

const renderPage = () => {
  const queryClient = createTestQueryClient();
  testQueryClients.push(queryClient);
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Schedule />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const baseScheduleData = {
  matchesData: [],
  matchesLoading: false,
  upcomingMatches: [],
  completedMatches: [],
};

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
    mockUseScheduleTabs.mockReturnValue({ activeTab: 'upcoming', handleTabChange: vi.fn() });
    mockUseTeamsQuery.mockReturnValue({ data: [], isLoading: false });
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
});
