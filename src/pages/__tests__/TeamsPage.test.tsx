import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TeamsPage from '../TeamsPage';

const mockTeamsState = vi.fn();

vi.mock('@/components/layout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/teams/TeamsPageContainer', () => ({
  default: () => {
    const state = mockTeamsState();
    if (state.isLoading) return <p>Loading teams...</p>;
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
    mockTeamsState.mockReturnValue({ isLoading: false, isEmpty: false });
  });

  it('shows loading state', () => {
    mockTeamsState.mockReturnValue({ isLoading: true, isEmpty: false });
    renderPage();
    expect(screen.getByText('Loading teams...')).toBeInTheDocument();
  });

  it('shows happy path render', () => {
    renderPage();
    expect(screen.getByText('Teams directory loaded')).toBeInTheDocument();
  });

  it('shows empty-state branch', () => {
    mockTeamsState.mockReturnValue({ isLoading: false, isEmpty: true });
    renderPage();
    expect(screen.getByText('No teams found')).toBeInTheDocument();
  });
});
