import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Playoffs from '../Playoffs';

const mockUsePlayoffPageData = vi.fn();

vi.mock('@/components/playoffs/hooks/usePlayoffPageData', () => ({
  usePlayoffPageData: () => mockUsePlayoffPageData(),
}));

vi.mock('@/components/playoffs/layout/PlayoffPageLayout', () => ({
  default: ({ data }: { data: { isLoading?: boolean; error?: string | null; bracket?: unknown[] } }) => {
    if (data.isLoading) return <p>Loading playoffs...</p>;
    if (data.error) return <p>{data.error}</p>;
    if (!data.bracket?.length) return <p>No playoff bracket yet</p>;
    return <p>Playoff bracket loaded</p>;
  },
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

const renderPage = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Playoffs />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('Playoffs page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePlayoffPageData.mockReturnValue({ isLoading: false, error: null, bracket: [{ id: 'b-1' }] });
  });

  it('shows loading state', () => {
    mockUsePlayoffPageData.mockReturnValue({ isLoading: true, error: null, bracket: [] });

    renderPage();

    expect(screen.getByText('Loading playoffs...')).toBeInTheDocument();
  });

  it('shows happy path render', () => {
    renderPage();

    expect(screen.getByText('Playoff bracket loaded')).toBeInTheDocument();
  });

  it('shows error/empty branch when bracket data is missing', () => {
    mockUsePlayoffPageData.mockReturnValue({ isLoading: false, error: null, bracket: [] });

    renderPage();

    expect(screen.getByText('No playoff bracket yet')).toBeInTheDocument();
  });
});
