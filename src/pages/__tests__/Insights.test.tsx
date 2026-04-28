import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Insights from '../Insights';

const mockInsightsState = vi.fn();

vi.mock('@/hooks/useScrollRestoration', () => ({ default: vi.fn() }));
vi.mock('@/components/layout/PageLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('@/components/insights/LeagueInsightsContainer', () => ({
  default: () => {
    const state = mockInsightsState();
    if (state.isLoading) return <p>Loading insights...</p>;
    if (state.isEmpty) return <p>No insights available</p>;
    return <p>League insights ready</p>;
  },
}));

const createTestQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const renderPage = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Insights />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Insights page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsightsState.mockReturnValue({ isLoading: false, isEmpty: false });
  });

  it('shows loading state', () => {
    mockInsightsState.mockReturnValue({ isLoading: true, isEmpty: false });
    renderPage();
    expect(screen.getByText('Loading insights...')).toBeInTheDocument();
  });

  it('shows happy path render', () => {
    renderPage();
    expect(screen.getByText('League insights ready')).toBeInTheDocument();
  });

  it('shows empty-state branch', () => {
    mockInsightsState.mockReturnValue({ isLoading: false, isEmpty: true });
    renderPage();
    expect(screen.getByText('No insights available')).toBeInTheDocument();
  });
});
