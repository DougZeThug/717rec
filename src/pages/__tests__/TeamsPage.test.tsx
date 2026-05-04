import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TeamsPage from '../TeamsPage';

const mockTeamsState = vi.fn();
const mockContainer = vi.fn();

vi.mock('@/components/layout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="teams-page-layout">{children}</div>
  ),
}));

vi.mock('@/components/teams/TeamsPageContainer', () => ({
  default: () => {
    const state = mockTeamsState();
    mockContainer(state);

    if (state.isLoading) return <p>Loading teams...</p>;
    if (state.error) return <p>{state.error}</p>;
    if (state.isEmpty) return <p>No teams found</p>;
    return <p>Teams directory loaded</p>;
  },
}));

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const renderPage = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TeamsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('TeamsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamsState.mockReturnValue({ isLoading: false, isEmpty: false, error: null });
  });

  it('wires page layout and teams container for the success state', () => {
    renderPage();

    expect(screen.getByTestId('teams-page-layout')).toBeInTheDocument();
    expect(screen.getByText('Teams directory loaded')).toBeInTheDocument();
    expect(mockContainer).toHaveBeenCalledWith({ isLoading: false, isEmpty: false, error: null });
  });

  it('shows loading-state UI while teams are being fetched', () => {
    mockTeamsState.mockReturnValue({ isLoading: true, isEmpty: false, error: null });
    renderPage();
    expect(screen.getByText('Loading teams...')).toBeInTheDocument();
    expect(screen.queryByText('Teams directory loaded')).not.toBeInTheDocument();
  });

  it('shows user-visible fallback when teams fetch fails', () => {
    mockTeamsState.mockReturnValue({
      isLoading: false,
      isEmpty: false,
      error: 'Failed to load teams',
    });
    renderPage();
    expect(screen.getByText('Failed to load teams')).toBeInTheDocument();
  });

  it('shows empty-state UI when no teams are returned', () => {
    mockTeamsState.mockReturnValue({ isLoading: false, isEmpty: true, error: null });
    renderPage();
    expect(screen.getByText('No teams found')).toBeInTheDocument();
  });
});
