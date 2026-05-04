import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Timeslots from '../Timeslots';

const mockUseTeamsQuery = vi.fn();
const mockUseAdminAccess = vi.fn();
const mockUseTimeslots = vi.fn();

vi.mock('@/hooks/teams', () => ({ useTeamsQuery: () => mockUseTeamsQuery() }));
vi.mock('@/hooks/useAdminAccess', () => ({ useAdminAccess: () => mockUseAdminAccess() }));
vi.mock('@/hooks/useTimeslots', () => ({
  useTimeslots: (...args: unknown[]) => mockUseTimeslots(...args),
}));
vi.mock('@/hooks/useToast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

vi.mock('@/components/timeslots/TimeslotAssignment', () => ({
  default: () => <p>Timeslot Assignment</p>,
}));
vi.mock('@/components/timeslots/TimeslotList', () => ({ default: () => <p>Timeslot List</p> }));
vi.mock('@/components/ui/calendar', () => ({ Calendar: () => <div>Calendar</div> }));
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));
vi.mock('@/components/ui/loading-state', () => ({
  LoadingState: ({ message }: { message: string }) => <p>{message}</p>,
}));

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const renderPage = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Timeslots />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Timeslots page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTeamsQuery.mockReturnValue({ data: [], isLoading: false });
    mockUseTimeslots.mockReturnValue({
      timeslots: [],
      isLoading: false,
      addTimeslot: vi.fn(),
      deleteTimeslot: vi.fn(),
      batchAssignTimeslots: vi.fn(),
      refreshTimeslots: vi.fn(),
    });
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: true, isLoading: false });
  });

  it('shows loading state while checking admin access', () => {
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: false, isLoading: true });
    renderPage();
    expect(screen.getByText('Checking access...')).toBeInTheDocument();
  });

  it('shows happy path render for admin users', () => {
    renderPage();
    expect(screen.getByText('Weekly Timeslot Assignments')).toBeInTheDocument();
    expect(screen.getAllByText('Timeslot Assignment').length).toBeGreaterThan(0);
  });

  it('shows error/redirect branch for non-admin users', () => {
    mockUseAdminAccess.mockReturnValue({ isAdminAccessGranted: false, isLoading: false });
    renderPage();
    expect(screen.queryByText('Weekly Timeslot Assignments')).not.toBeInTheDocument();
  });
});
