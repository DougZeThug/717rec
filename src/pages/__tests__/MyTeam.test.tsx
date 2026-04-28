import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMembershipState = vi.fn();

vi.mock('@/components/teams/TeamMembershipPage', () => ({
  default: () => {
    const state = mockMembershipState();
    if (state.isLoading) return <p>Loading my team...</p>;
    if (state.isEmpty) return <p>You are not on a team yet</p>;
    return <p>My team dashboard</p>;
  },
}));

import MyTeam from '../MyTeam';

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const renderPage = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MyTeam />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('MyTeam page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMembershipState.mockReturnValue({ isLoading: false, isEmpty: false });
  });

  it('shows loading state', () => {
    mockMembershipState.mockReturnValue({ isLoading: true, isEmpty: false });
    renderPage();
    expect(screen.getByText('Loading my team...')).toBeInTheDocument();
  });

  it('shows happy path render', () => {
    renderPage();
    expect(screen.getByText('My team dashboard')).toBeInTheDocument();
  });

  it('shows empty/error branch when user has no team', () => {
    mockMembershipState.mockReturnValue({ isLoading: false, isEmpty: true });
    renderPage();
    expect(screen.getByText('You are not on a team yet')).toBeInTheDocument();
  });
});
